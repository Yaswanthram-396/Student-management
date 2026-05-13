import { router } from "expo-router";
import { API_BASE } from "../constants/api";
import { storage } from "./storage";

const REFRESH_ENDPOINT = "/auth/refresh/";
let refreshInFlight: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    public code: string,
    public details: string,
  ) {
    super(details);
    this.name = "ApiError";
  }
}

async function tryRefreshAccessToken() {
  if (refreshInFlight) return await refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) return null;

    const refreshUrl = `${API_BASE}${REFRESH_ENDPOINT}`;
    try {
      const res = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!res.ok) {
        await storage.clearTokens();
        return null;
      }

      const data = (await res.json()) as { access?: string };
      if (!data.access) {
        await storage.clearTokens();
        return null;
      }

      await storage.setAccessToken(data.access);
      return data.access;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return await refreshInFlight;
}

async function parseJsonResponse(
  res: Response,
  method: string,
  fullUrl: string,
) {
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await res.text();
    console.error(
      `[API] Non-JSON response on ${method} ${fullUrl}. Content-Type: ${contentType}, Body: ${text.substring(0, 200)}`,
    );
    throw new ApiError(
      "INVALID_RESPONSE",
      `Server returned non-JSON response (${res.status}). Check if the backend is running at ${API_BASE}`,
    );
  }

  try {
    return await res.json();
  } catch (error) {
    console.error(`[API] JSON parse error on ${method} ${fullUrl}:`, error);
    throw new ApiError(
      "PARSE_ERROR",
      "Server returned invalid JSON. Check if the backend is running correctly.",
    );
  }
}

export async function apiRequest<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: object | FormData,
  isMultipart = false,
): Promise<T> {
  const token = await storage.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isMultipart) headers["Content-Type"] = "application/json";

  const fullUrl = `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
  } catch (error) {
    console.error(`[API] Network error on ${method} ${fullUrl}:`, error);
    throw new ApiError(
      "NETWORK_ERROR",
      "Cannot reach the API server. Check the backend URL and make sure the server is running.",
    );
  }

  if (res.status === 401 && path !== REFRESH_ENDPOINT) {
    const newAccessToken = await tryRefreshAccessToken();

    if (newAccessToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      try {
        res = await fetch(fullUrl, {
          method,
          headers: retryHeaders,
          body:
            body instanceof FormData
              ? body
              : body
                ? JSON.stringify(body)
                : undefined,
        });
      } catch (error) {
        console.error(`[API] Retry failed on ${method} ${fullUrl}:`, error);
        throw new ApiError(
          "NETWORK_ERROR",
          "Cannot reach the API server. Check the backend URL and make sure the server is running.",
        );
      }
    }
  }

  if (res.status === 401) {
    await storage.clearTokens();
    router.replace("/");
    throw new ApiError("UNAUTHORIZED", "Session expired. Please log in again.");
  }

  const data = await parseJsonResponse(res, method, fullUrl);

  if (!res.ok) {
    throw new ApiError(
      data.code ?? "ERROR",
      data.details ?? data.message ?? "Something went wrong.",
    );
  }
  return data as T;
}

export async function apiRequestText(
  method: "GET" | "POST",
  path: string,
  body?: object | FormData,
  isMultipart = false,
): Promise<string> {
  const token = await storage.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isMultipart) headers["Content-Type"] = "application/json";

  const fullUrl = `${API_BASE}${path}`;
  const requestBody =
    body instanceof FormData
      ? body
      : body
        ? JSON.stringify(body)
        : undefined;

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method,
      headers,
      body: requestBody,
    });
  } catch (error) {
    console.error(`[API] Network error on ${method} ${fullUrl}:`, error);
    throw new ApiError(
      "NETWORK_ERROR",
      "Cannot reach the API server. Check the backend URL and make sure the server is running.",
    );
  }

  if (res.status === 401 && path !== REFRESH_ENDPOINT) {
    const newAccessToken = await tryRefreshAccessToken();

    if (newAccessToken) {
      try {
        res = await fetch(fullUrl, {
          method,
          headers: {
            ...headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
          body: requestBody,
        });
      } catch (error) {
        console.error(`[API] Retry failed on ${method} ${fullUrl}:`, error);
        throw new ApiError(
          "NETWORK_ERROR",
          "Cannot reach the API server. Check if the backend is running.",
        );
      }
    }
  }

  if (res.status === 401) {
    await storage.clearTokens();
    router.replace("/");
    throw new ApiError("UNAUTHORIZED", "Session expired. Please log in again.");
  }

  const text = await res.text();

  if (!res.ok) {
    try {
      const data = JSON.parse(text);
      throw new ApiError(
        data.code ?? "ERROR",
        data.details ?? data.message ?? "Something went wrong.",
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("ERROR", text || "Something went wrong.");
    }
  }

  return text;
}
