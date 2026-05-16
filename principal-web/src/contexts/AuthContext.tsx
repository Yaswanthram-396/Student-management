import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout } from '../api/auth'
import { getAccessToken } from '../api/client'

interface User {
  id?: number
  username: string
  email?: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from stored token
    const token = getAccessToken()
    if (token) {
      // We have a token; try to decode user info from JWT payload
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({
          id: payload.user_id,
          username: payload.username || payload.name || 'Principal',
          email: payload.email,
        })
      } catch {
        // Token exists but can't decode — still treat as authenticated
        setUser({ username: 'Principal' })
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiLogin(username, password)
    // Try to decode token for user info
    try {
      const payload = JSON.parse(atob(data.access.split('.')[1]))
      setUser({
        id: payload.user_id,
        username: payload.username || username,
        email: payload.email,
      })
    } catch {
      setUser({ username })
    }
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
