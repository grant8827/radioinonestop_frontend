import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import appLogo from '../assets/radioinonestop_logo .png'

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B / Soul', 'Electronic / Dance',
  'Jazz', 'Classical', 'Country', 'Latin', 'Reggae',
  'Gospel / Christian', 'News / Talk', 'Sports', 'Podcast', 'Other',
]

const PLAN_NAMES = {
  starter: { monthly: 'Starter ($29/mo)', yearly: 'Starter ($290/yr)' },
  professional: { monthly: 'Professional ($39/mo)', yearly: 'Professional ($390/yr)' },
  enterprise: { monthly: 'Enterprise ($59/mo)', yearly: 'Enterprise ($590/yr)' },
  ultimate: { monthly: 'Ultimate ($99/mo)', yearly: 'Ultimate ($990/yr)' },
}

function getPlanName(planId, billing) {
  if (!planId || !PLAN_NAMES[planId]) return planId
  return PLAN_NAMES[planId][billing] || PLAN_NAMES[planId].monthly
}

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
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
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

const STEP_LABELS = {
  1: 'Personal info',
  2: 'Verify email',
  3: 'Radio info',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan')
  const billingCycle = searchParams.get('billing') || 'monthly'
  const [step, setStep] = useState(1)

  // Step 1 — personal info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Step 2 — OTP
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef([])
  const [resendCooldown, setResendCooldown] = useState(0)

  // Step 3 — radio info
  const [stationName, setStationName] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState('')

  // Holds the JWT returned from verify-otp so we can call the profile API before login
  const [pendingToken, setPendingToken] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const firstInputRef = useRef(null)
  const logoInputRef = useRef(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(selectedPlan ? `/payment?plan=${selectedPlan}&billing=${billingCycle}` : '/payment')
    }
  }, [isAuthenticated, selectedPlan, billingCycle, navigate])

  // Auto-focus first field when step changes
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } else {
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [step])

  useEffect(() => { setError('') }, [step])

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Logo must be an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be smaller than 2 MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // OTP digit input handling
  function handleOtpChange(idx, val) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...otp]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  // Step 1 — send OTP
  async function handleStep1(e) {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim()) { setError('Last name is required'); return }
    if (!email.trim()) { setError('Email is required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
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
        }),
      })
      const text = await resp.text()
      if (!resp.ok) {
        if (resp.status === 409) {
          setError('An account with this email already exists. Please sign in instead.')
        } else {
          setError(text.trim() || 'Registration failed')
        }
        return
      }
      setResendCooldown(60)
      setStep(2)
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — verify OTP
  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    const code = otp.join('')
    if (code.length < 6) { setError('Enter all 6 digits'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
      })
      const text = await resp.text()
      if (!resp.ok) { setError(text.trim() || 'Invalid or expired code'); return }
      const data = JSON.parse(text)
      setPendingToken(data.token)
      setStep(3)
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  async function handleResend() {
    if (resendCooldown > 0) return
    setError('')
    try {
      const resp = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const text = await resp.text()
      if (!resp.ok) {
        setError(text.trim() || 'Could not resend verification code')
        return
      }
      setResendCooldown(60)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch {
      setError('Network error — could not resend verification code')
    }
  }

  // Step 3 — save radio info and complete
  async function handleComplete(e) {
    e.preventDefault()
    setError('')
    if (!stationName.trim()) { setError('Station name is required'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingToken}`,
        },
        body: JSON.stringify({
          station_name: stationName.trim(),
          genre,
          description: description.trim(),
          logo_url: logoPreview,
        }),
      })
      if (!resp.ok) {
        const text = await resp.text()
        if (resp.status === 409) {
          setError('That station name is already taken. Please choose a different name.')
        } else {
          setError(text.trim() || 'Failed to save station info')
        }
        return
      }
      login(pendingToken)
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/5 backdrop-blur-lg bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src={appLogo} alt="Radio In One Stop logo" className="w-7 h-7 rounded-sm object-contain" />
            <span className="font-bold text-sm tracking-tight">Radio In One Stop</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
          >
            ← Back to Home
          </button>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">
          <div className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="border-b border-white/10 p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl rio-logo-gradient flex items-center justify-center shadow-lg shadow-red-900/40">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white">
                    {step === 1 && 'Create your account'}
                    {step === 2 && 'Verify your email'}
                    {step === 3 && 'Set up your radio station'}
                  </h1>
                  <p className="text-sm text-gray-400 mt-1">
                    Step {step} of 3 — {STEP_LABELS[step]}
                  </p>
                </div>
                {selectedPlan && (
                  <div className="shrink-0">
                    <span className="inline-block text-xs font-bold uppercase tracking-wider bg-red-600/20 text-amber-400 border border-red-600/40 rounded-full px-3 py-1.5">
                      {getPlanName(selectedPlan, billingCycle)}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rio-logo-gradient rounded-full transition-all duration-500"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Form content */}
            <div className="p-6 sm:p-8">
              {error && <ErrorBox message={error} />}

              {/* ══ STEP 1 — Personal Info ══ */}
              {step === 1 && (
                <form onSubmit={handleStep1} className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Name" required>
                      <TextInput
                        inputRef={firstInputRef}
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                    </Field>
                    <Field label="Last Name" required>
                      <TextInput
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </Field>
                  </div>

                  <Field label="Email" required>
                    <TextInput
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="Password" required hint="Min. 8 characters">
                    <div className="relative">
                      <TextInput
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm Password" required>
                    <TextInput
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => navigate('/pricing')}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-3 font-semibold text-sm transition-all"
                    >
                      Back to Pricing
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rio-logo-gradient text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-lg shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Sending code...
                        </>
                      ) : 'Next Step →'}
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-500 mt-4">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}

              {/* ══ STEP 2 — OTP Verification ══ */}
              {step === 2 && (
                <form onSubmit={handleVerify} className="space-y-6 mt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-400">
                      We sent a 6-digit code to{' '}
                      <span className="text-white font-semibold">{email}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Check your inbox and spam folder.</p>
                  </div>

                  {/* 6-digit OTP boxes */}
                  <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpRefs.current[idx] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-2xl font-bold bg-gray-900/60 border border-gray-700/80 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.join('').length < 6}
                    className="w-full rio-logo-gradient text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-lg shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Verifying...
                      </>
                    ) : 'Verify Email'}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="text-amber-400 hover:text-amber-300 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </form>
              )}

              {/* ══ STEP 3 — Radio Station Info ══ */}
              {step === 3 && (
                <form onSubmit={handleComplete} className="space-y-4 mt-6">
                  <Field label="Station Name" required hint="Your radio station's name">
                    <TextInput
                      inputRef={firstInputRef}
                      type="text"
                      placeholder="My Awesome Radio"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                    />
                  </Field>

                  <Field label="Genre">
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="">Select a genre...</option>
                      {GENRES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Description" hint="Optional">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Tell listeners about your station..."
                      className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                    />
                  </Field>

                  <Field label="Logo" hint="PNG or JPG, max 2 MB">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:border-amber-500 transition-colors text-left flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      {logoPreview ? 'Change logo' : 'Upload logo'}
                    </button>
                    {logoPreview && (
                      <div className="mt-3 flex items-center gap-3">
                        <img src={logoPreview} alt="Logo preview" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                        <button type="button" onClick={() => setLogoPreview('')} className="text-xs text-red-400 hover:text-red-300">
                          Remove
                        </button>
                      </div>
                    )}
                  </Field>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={loading}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-3 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rio-logo-gradient text-white rounded-xl py-3 font-semibold text-sm transition-all shadow-lg shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Creating account...
                        </>
                      ) : 'Complete Registration'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
