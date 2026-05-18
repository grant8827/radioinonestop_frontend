import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default function LoginModal({ onSuccess, onClose, onSwitchToRegister }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef(null)

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const text = await resp.text()
      if (!resp.ok) { setError(text.trim() || 'Invalid email or password'); return }
      const data = JSON.parse(text)
      login(data.token)
      onSuccess()
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-[#0f0f17] border border-white/8 rounded-2xl shadow-2xl shadow-black/60">

        {/* Top accent line */}
        <div className="h-0.5 w-full rounded-t-2xl bg-linear-to-r from-purple-600 to-blue-500" />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="text-xs text-gray-500 mt-1">Sign in to your studio</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-white transition-colors mt-0.5"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/30 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Switch to register */}
          <div className="mt-5 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
                Create one free →
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
