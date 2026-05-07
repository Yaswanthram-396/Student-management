import { apiRequest } from './api';
import { storage } from './storage';
import type { LoginResponse } from '../types/principal';

export const authApi = {
  login: async (phone_number: string, password: string): Promise<LoginResponse> => {
    const data = await apiRequest<LoginResponse>('POST', '/auth/login/', { phone_number, password });
    await storage.setToken(data.access);
    return data;
  },
  logout: async () => {
    await storage.clearToken();
  },
};
