import { router } from 'expo-router';
import { API_BASE } from '../constants/api';
import { storage } from './storage';

export class ApiError extends Error {
  constructor(public code: string, public details: string) {
    super(details);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: object | FormData,
  isMultipart = false,
): Promise<T> {
  const token = await storage.getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isMultipart) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData
      ? body
      : body
        ? JSON.stringify(body)
        : undefined,
  });

  if (res.status === 401) {
    await storage.clearToken();
    router.replace('/');
    throw new ApiError('UNAUTHORIZED', 'Session expired. Please log in again.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.code ?? 'ERROR', data.details ?? 'Something went wrong.');
  }
  return data as T;
}
