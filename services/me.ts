import type { MeResponse, SchoolSummary, UserRole } from "../types/auth";
import { apiRequest } from "./api";

type UnknownRecord = Record<string, unknown>;

function isRole(value: unknown): value is UserRole {
  return (
    value === "PRINCIPAL" ||
    value === "TEACHER" ||
    value === "STUDENT" ||
    value === "PARENT"
  );
}

function toSchoolSummary(
  input: unknown,
  fallbackSchoolId?: string,
): SchoolSummary {
  const school = (input ?? {}) as UnknownRecord;
  return {
    id: (typeof school.id === "string" && school.id) || fallbackSchoolId || "",
    name: typeof school.name === "string" ? school.name : "",
    subdomain: typeof school.subdomain === "string" ? school.subdomain : "",
  };
}

function normalizeMeResponse(raw: unknown): MeResponse {
  const payload = (raw ?? {}) as UnknownRecord;
  const user =
    payload.user && typeof payload.user === "object"
      ? (payload.user as UnknownRecord)
      : payload;

  const rawRole =
    typeof user.role === "string" ? user.role.toUpperCase() : undefined;
  if (!isRole(rawRole)) {
    throw new Error("Invalid role received from /me response.");
  }

  const profile =
    payload.profile && typeof payload.profile === "object"
      ? (payload.profile as UnknownRecord)
      : user.profile && typeof user.profile === "object"
        ? (user.profile as UnknownRecord)
        : {};

  return {
    id: typeof user.id === "string" ? user.id : "",
    username: typeof user.username === "string" ? user.username : "",
    role: rawRole,
    profile_pic_url:
      typeof user.profile_pic_url === "string" || user.profile_pic_url === null
        ? (user.profile_pic_url as string | null)
        : null,
    profile: profile as unknown as MeResponse["profile"],
    school: toSchoolSummary(
      payload.school,
      typeof user.school_id === "string" ? user.school_id : undefined,
    ),
  } as MeResponse;
}

export const meApi = {
  getCurrentUser: async () => {
    const data = await apiRequest<unknown>("GET", "/me/");
    return normalizeMeResponse(data);
  },
};
