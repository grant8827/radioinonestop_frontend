import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

function loadFromStorage() {
  const t = localStorage.getItem('rio_token')
  if (!t) return { token: null, user: null }
  const payload = parseToken(t)
  if (!payload || payload.exp * 1000 < Date.now()) {
    localStorage.removeItem('rio_token')
    return { token: null, user: null }
  }
  return { token: t, user: { id: payload.user_id, email: payload.email } }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setAuth] = useState(loadFromStorage)

  const login = useCallback((newToken) => {
    localStorage.setItem('rio_token', newToken)
    const payload = parseToken(newToken)
    setAuth({
      token: newToken,
      user: payload ? { id: payload.user_id, email: payload.email } : null,
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('rio_token')
    setAuth({ token: null, user: null })
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
