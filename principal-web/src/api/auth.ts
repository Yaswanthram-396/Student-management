import { setTokens, clearTokens, getAccessToken, getRefreshToken } from './client'

const BASE_URL = 'https://schoolsbackend-production.up.railway.app/api/v1'

export interface LoginResponse {
  access: string
  refresh: string
}

export async function login(phone_number: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number, password }),
  })

  if (!res.ok) {
    let errMsg = 'Invalid phone number or password'
    try {
      const errData = await res.json()
      if (errData.code === 'AUTHENTICATION_FAILED') {
        errMsg = 'Invalid phone number or password. Please try again.'
      } else if (errData.code === 'PERMISSION_DENIED') {
        errMsg = 'Your account is inactive. Please contact the administrator.'
      } else {
        errMsg = errData.details || errData.detail || errData.non_field_errors?.[0] || errMsg
      }
    } catch {
      // ignore parse errors
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
