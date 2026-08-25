import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, getSession, setSession } from '../../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setCurrentSession] = useState(getSession())

  useEffect(() => {
    const sync = (event) => setCurrentSession(event.detail ?? getSession())
    window.addEventListener('docflow-session', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('docflow-session', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user || null,
      isAuthenticated: Boolean(session?.access_token),
      async login(credentials) {
        const next = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        })
        setSession(next)
        setCurrentSession(next)
      },
      async logout() {
        const current = getSession()
        try {
          if (current?.refresh_token) {
            await api('/auth/logout', {
              method: 'POST',
              body: JSON.stringify({ refresh_token: current.refresh_token }),
            })
          }
        } finally {
          setSession(null)
          setCurrentSession(null)
        }
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
