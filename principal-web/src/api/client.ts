const BASE_URL = 'https://schoolsbackend-production.up.railway.app/api/v1'

const ACCESS_KEY = 'principal_access_token'
const REFRESH_KEY = 'principal_refresh_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.access) {
      localStorage.setItem(ACCESS_KEY, data.access)
      return data.access
    }
    return null
  } catch {
    return null
  }
}

async function request(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Only set Content-Type to application/json if not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return request(path, options, true)
    } else {
      clearTokens()
      window.location.href = '/login'
      throw new Error('Session expired. Please log in again.')
    }
  }

  return res
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await request(path, { method: 'GET' })
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`
    try { const d = await res.json(); errMsg = d?.details || d?.detail || errMsg } catch { /* ignore */ }
    throw new Error(errMsg)
  }
  return res.json()
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let errMsg = `POST ${path} failed with status ${res.status}`
    try {
      const errData = await res.json()
      errMsg = JSON.stringify(errData)
    } catch {
      errMsg = await res.text() || errMsg
    }
    throw new Error(errMsg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let errMsg = `PUT ${path} failed with status ${res.status}`
    try {
      const errData = await res.json()
      errMsg = JSON.stringify(errData)
    } catch {
      errMsg = await res.text() || errMsg
    }
    throw new Error(errMsg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await request(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let errMsg = `PATCH ${path} failed with status ${res.status}`
    try {
      const errData = await res.json()
      errMsg = JSON.stringify(errData)
    } catch {
      errMsg = await res.text() || errMsg
    }
    throw new Error(errMsg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await request(path, { method: 'DELETE' })
  if (!res.ok) {
    let errMsg = `DELETE ${path} failed with status ${res.status}`
    try {
      const errData = await res.json()
      errMsg = errData?.details || JSON.stringify(errData)
    } catch {
      errMsg = await res.text() || errMsg
    }
    throw new Error(errMsg)
  }
  if (res.status === 204) return undefined as T
  try { return res.json() } catch { return undefined as T }
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await request(path, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    let errMsg = `POST ${path} failed with status ${res.status}`
    try {
      const errData = await res.json()
      errMsg = JSON.stringify(errData)
    } catch {
      errMsg = await res.text() || errMsg
    }
    throw new Error(errMsg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
