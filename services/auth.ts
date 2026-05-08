import type { LoginResponse } from "../types/principal";
import { apiRequest } from "./api";
import { storage } from "./storage";

export const authApi = {
  login: async (
    phone_number: string,
    password: string,
  ): Promise<LoginResponse> => {
    console.log("Attempting login with phone: 1");
    const data = await apiRequest<LoginResponse>("POST", "/auth/login/", {
      phone_number,
      password,
    });
    console.log("Attempting login with phone: 3");
    await storage.setToken(data.access);
    return data;
  },
  logout: async () => {
    await storage.clearToken();
  },
};
