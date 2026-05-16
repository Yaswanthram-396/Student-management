import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout } from '../api/auth'
import { getAccessToken } from '../api/client'

interface User {
  id?: number
  name: string
  phone_number?: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (phone_number: string, password: string) => Promise<void>
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
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({
          id: payload.user_id,
          name: payload.name || payload.username || 'Principal',
          phone_number: payload.phone_number,
        })
      } catch {
        setUser({ name: 'Principal' })
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (phone_number: string, password: string) => {
    const data = await apiLogin(phone_number, password)
    try {
      const payload = JSON.parse(atob(data.access.split('.')[1]))
      setUser({
        id: payload.user_id,
        name: payload.name || payload.username || 'Principal',
        phone_number,
      })
    } catch {
      setUser({ name: 'Principal', phone_number })
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
