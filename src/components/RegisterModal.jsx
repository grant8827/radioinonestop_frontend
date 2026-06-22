import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B / Soul', 'Electronic / Dance',
  'Jazz', 'Classical', 'Country', 'Latin', 'Reggae',
  'Gospel / Christian', 'News / Talk', 'Sports', 'Podcast', 'Other',
]

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

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label} {required && <span className="text-amber-400">*</span>}
        </label>
        {hint && <span className="text-xs text-gray-600">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function TextInput({ inputRef, ...props }) {
  return (
    <input
      ref={inputRef}
      {...props}
      className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
    />
  )
}

function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p className="text-sm text-red-400">{message}</p>
    </div>
  )
}

export default function RegisterModal({ selectedPlan, onSuccess, onClose, onSwitchToLogin }) {
  const { login } = useAuth()
  const [step, setStep] = useState(1)

  // Personal info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Radio info
  const [stationName, setStationName] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState('')

  // OTP verification
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const firstInputRef = useRef(null)
  const logoInputRef = useRef(null)

  // Plan display mapping
  const PLAN_NAMES = {
    starter: 'Starter ($29/mo)',
    professional: 'Professional ($39/mo)',
    enterprise: 'Enterprise ($59/mo)',
    ultimate: 'Ultimate ($99/mo)',
  }

  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [step])

  useEffect(() => { setError('') }, [step])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Logo must be an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be smaller than 2 MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleStep1(e) {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim()) { setError('Last name is required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!stationName.trim()) { setError('Station name is required'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          station_name: stationName.trim(),
          genre,
          description: description.trim(),
          logo_url: logoPreview,
        }),
      })
      const text = await resp.text()
      if (!resp.ok) { setError(text.trim() || 'Registration failed'); return }
      const data = JSON.parse(text)
      if (data.status === 'verify_email') {
        setPendingEmail(data.email || email.trim().toLowerCase())
        setStep(3)
        return
      }
      login(data.token)
      onSuccess()
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault()
    setError('')
    if (otp.trim().length !== 6) { setError('Enter the 6-digit code'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp: otp.trim() }),
      })
      const text = await resp.text()
      if (!resp.ok) { setError(text.trim() || 'Invalid or expired code'); return }
      const data = JSON.parse(text)
      login(data.token)
      onSuccess()
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOTP() {
    if (resendCooldown > 0) return
    try {
      await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      })
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown(v => {
          if (v <= 1) { clearInterval(interval); return 0 }
          return v - 1
        })
      }, 1000)
    } catch { /* silent */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-[#0d0d16] border border-white/8 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Gradient header banner */}
        <div className="relative bg-linear-to-br from-purple-900/60 via-blue-900/40 to-transparent px-7 pt-7 pb-6">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon + title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl rio-logo-gradient flex items-center justify-center shadow-lg shadow-red-900/40">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">
                {step === 1 ? 'Create your account' : step === 2 ? 'Set up your radio station' : 'Verify your email'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 1 ? 'Step 1 of 3 — Personal info' : step === 2 ? 'Step 2 of 3 — Radio info' : 'Step 3 of 3 — Email verification'}
              </p>
            </div>
            {selectedPlan && (
              <div className="shrink-0">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-red-600/20 text-amber-400 border border-red-600/40 rounded-full px-3 py-1">
                  {PLAN_NAMES[selectedPlan] || selectedPlan}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rio-logo-gradient rounded-full transition-all duration-500"
              style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
            />
          </div>
        </div>

        {/* ══ STEP 1 — Personal Info ══ */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="px-7 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <TextInput inputRef={firstInputRef} type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Jane" maxLength={50} />
              </Field>
              <Field label="Last Name" required>
                <TextInput type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Smith" maxLength={50} />
              </Field>
            </div>

            <Field label="Email" required>
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            </Field>

            <Field label="Password" required hint="Min. 8 characters">
              <div className="relative">
                <TextInput type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Create a password" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </Field>

            <Field label="Confirm Password" required>
              <TextInput type={showPass ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="Repeat your password" />
            </Field>

            <ErrorBox message={error} />

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl rio-logo-gradient text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30"
            >
              Next: Set up your station →
            </button>

            <p className="text-center text-xs text-gray-600 pt-1">
              Already have an account?{' '}
              <button type="button" onClick={onSwitchToLogin} className="text-amber-400 hover:text-amber-300 font-semibold">Sign in</button>
            </p>
          </form>
        )}

        {/* ══ STEP 2 — Radio Info ══ */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
            {/* Logo + station name */}
            <div className="flex items-start gap-4">
              <div className="shrink-0 flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-xl bg-gray-900 border-2 border-dashed border-gray-700 hover:border-amber-500 transition-colors overflow-hidden group flex items-center justify-center"
                  title="Upload station logo (optional)"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-600 group-hover:text-amber-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 4.5h16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V5.25a.75.75 0 01.75-.75z" />
                      </svg>
                      <span className="text-xs leading-none">Logo</span>
                    </div>
                  )}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <span className="text-xs text-gray-600">optional</span>
              </div>

              <div className="flex-1">
                <Field label="Station Name" required>
                  <TextInput inputRef={firstInputRef} type="text" value={stationName} onChange={(e) => setStationName(e.target.value)} required maxLength={80} placeholder="e.g. Sunset FM" />
                </Field>
              </div>
            </div>

            <Field label="Genre / Format" hint="optional">
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="">Choose a genre…</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>

            <Field label="Station Description" hint="optional">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Tell listeners what your station is about…"
                className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </Field>

            <ErrorBox message={error} />

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-semibold text-sm transition-all"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-2.5 rounded-xl rio-logo-gradient disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30"
              >
                {loading ? 'Creating station…' : '🎙️ Launch My Station'}
              </button>
            </div>
          </form>
        )}

        {/* ══ STEP 3 — Email Verification ══ */}
        {step === 3 && (
          <form onSubmit={handleVerifyOTP} className="px-7 py-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-900/30 border border-purple-700/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                We sent a 6-digit code to<br />
                <span className="text-white font-semibold">{pendingEmail}</span>
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Verification Code</label>
              <input
                ref={firstInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-2xl font-mono text-white text-center tracking-[0.5em] placeholder-gray-700 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <ErrorBox message={error} />

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 rounded-xl rio-logo-gradient disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30"
            >
              {loading ? 'Verifying…' : 'Verify & Create Account'}
            </button>

            <p className="text-center text-xs text-gray-600">
              Didn't receive it?{' '}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="text-amber-400 hover:text-amber-300 font-semibold disabled:text-gray-600 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
