import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import api, { setAccessToken } from '../lib/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  updateUser: (u: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef<User | null>(null)
  userRef.current = user

  useEffect(() => {
    // Restore session via httpOnly refresh cookie on first load
    api
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return api.get('/auth/me')
      })
      .then(({ data }) => setUser(data.user))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Silently refresh the access token when the tab becomes visible again
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === 'visible' && userRef.current) {
        api
          .post('/auth/refresh')
          .then(({ data }) => setAccessToken(data.accessToken))
          .catch(() => {
            setAccessToken(null)
            setUser(null)
          })
      }
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [])

  async function login(email: string, password: string): Promise<User> {
    const { data } = await api.post('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data.user
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    setAccessToken(null)
    setUser(null)
  }

  function updateUser(u: User) {
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
