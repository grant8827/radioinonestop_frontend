import { createContext, useContext, useState, useCallback, useEffect } from 'react'

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
  if (!t) return { token: null, user: null, profileLoaded: true }
  const payload = parseToken(t)
  if (!payload || payload.exp * 1000 < Date.now()) {
    localStorage.removeItem('rio_token')
    return { token: null, user: null, profileLoaded: true }
  }
  return { 
    token: t, 
    profileLoaded: false,
    user: {
      id: payload.user_id, 
      email: payload.email, 
      stationName: payload.station_name || '',
      logoUrl: '',
      role: payload.role || 'user',
      plan: 'starter', // default until profile loads
      billingCycle: 'monthly',
      isSuspended: false,
      paymentRequired: false,
      trialActive: false,
      trialEndsAt: null,
    } 
  }
}

export function AuthProvider({ children }) {
  const [{ token, user, profileLoaded }, setAuth] = useState(loadFromStorage)

  // Fetch full user profile
  const refreshProfile = useCallback(() => {
    if (!token) return Promise.resolve()
    
    return fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(profile => {
        setAuth(prev => ({
          ...prev,
          user: prev.user ? {
            ...prev.user,
            plan: profile.plan || 'starter',
            billingCycle: profile.billing_cycle || 'monthly',
            stationName: profile.station_name || prev.user.stationName,
            logoUrl: profile.logo_url || '',
            isSuspended: !!profile.is_suspended,
            paymentRequired: !!profile.payment_required,
            trialActive: !!profile.trial_active,
            trialEndsAt: profile.trial_ends_at || null,
          } : prev.user,
          profileLoaded: true,
        }))
      })
      .catch(() => {
        setAuth(prev => ({ ...prev, profileLoaded: true }))
      })
  }, [token])

  // Fetch full user profile when authenticated
  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  // Keep an already-open studio session in sync with trial expiration. The
  // timeout is capped because browsers cannot schedule a single 30-day timer;
  // the effect schedules the remaining portion after each capped check.
  useEffect(() => {
    if (!token || !user?.trialActive || !user?.trialEndsAt) return undefined

    const trialEnd = new Date(user.trialEndsAt).getTime()
    if (!Number.isFinite(trialEnd)) return undefined

    const checkTrial = () => {
      if (Date.now() >= trialEnd) refreshProfile()
    }
    const maxBrowserTimeout = 2147483647
    let timeoutId
    const scheduleExpiryCheck = () => {
      const remaining = Math.max(0, trialEnd - Date.now())
      timeoutId = setTimeout(
        remaining + 1000 <= maxBrowserTimeout ? () => refreshProfile() : scheduleExpiryCheck,
        Math.min(remaining + 1000, maxBrowserTimeout)
      )
    }
    scheduleExpiryCheck()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkTrial()
    }

    window.addEventListener('focus', checkTrial)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('focus', checkTrial)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [token, user?.trialActive, user?.trialEndsAt, refreshProfile])

  const login = useCallback((newToken) => {
    localStorage.setItem('rio_token', newToken)
    const payload = parseToken(newToken)
    setAuth({
      token: newToken,
      profileLoaded: false,
      user: payload ? { 
        id: payload.user_id, 
        email: payload.email, 
        stationName: payload.station_name || '',
        logoUrl: '',
        role: payload.role || 'user',
        plan: 'starter',
        billingCycle: 'monthly',
        isSuspended: false,
        paymentRequired: false,
        trialActive: false,
        trialEndsAt: null,
      } : null,
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('rio_token')
    setAuth({ token: null, user: null, profileLoaded: true })
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, profileLoaded, login, logout, refreshProfile, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
