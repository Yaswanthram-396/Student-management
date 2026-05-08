import { signOut } from "../store/auth-store";
import { router } from "expo-router";
import type { LoginResponse } from "../types/principal";
import { apiRequest } from "./api";

export interface RefreshTokenResponse {
  access: string;
}

export const authApi = {
  login: async (
    phone_number: string,
    password: string,
  ): Promise<LoginResponse> => {
    return await apiRequest<LoginResponse>("POST", "/auth/login/", {
      phone_number,
      password,
    });
  },
  refresh: async (refresh: string): Promise<RefreshTokenResponse> => {
    return await apiRequest<RefreshTokenResponse>("POST", "/auth/refresh/", {
      refresh,
    });
  },
  logout: async () => {
    await signOut();
    try {
      router.replace("/");
    } catch {
      // ignore navigation errors in non-UI contexts
    }
  },
};
