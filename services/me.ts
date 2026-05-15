import type { MeResponse, UserRole } from "../types/auth";
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

  // Inject fields from user into profile since the API keeps them on the user object
  const normalizedProfile = {
    ...profile,
    name: (profile as UnknownRecord).name || (typeof user.name === "string" ? user.name : ""),
    phone_number: typeof user.phone_number === "string" ? user.phone_number : "",
  };

  return {
    id: typeof user.id === "string" ? user.id : "",
    username: typeof user.username === "string" ? user.username : "",
    role: rawRole,
    profile_pic_url:
      typeof user.profile_pic_url === "string" || user.profile_pic_url === null
        ? (user.profile_pic_url as string | null)
        : null,
    profile: normalizedProfile as unknown as MeResponse["profile"],
    // API returns school_name flat on user/profile, not a nested school object
    school: {
      id: typeof user.school_id === "string" ? user.school_id : "",
      name: typeof user.school_name === "string" ? user.school_name : "",
      subdomain: "",
      school_logo_url:
        typeof user.school_logo_url === "string" || user.school_logo_url === null
          ? (user.school_logo_url as string | null)
          : null,
    },
  } as MeResponse;
}

export const meApi = {
  getCurrentUser: async () => {
    const data = await apiRequest<unknown>("GET", "/me/");
    return normalizeMeResponse(data);
  },
};
