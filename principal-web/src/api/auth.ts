import { setTokens, clearTokens, getAccessToken, getRefreshToken } from './client'

const BASE_URL = 'https://schoolsbackend-production.up.railway.app/api/v1'

export interface LoginResponse {
  access: string
  refresh: string
  user?: {
    id: number
    username: string
    email: string
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    let errMsg = 'Invalid username or password'
    try {
      const errData = await res.json()
      errMsg = errData.detail || errData.non_field_errors?.[0] || errMsg
    } catch {
      // ignore
    }
    throw new Error(errMsg)
  }

  const data: LoginResponse = await res.json()
  setTokens(data.access, data.refresh)
  return data
}

export function logout(): void {
  clearTokens()
}

export { getAccessToken, getRefreshToken }
