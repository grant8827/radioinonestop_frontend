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

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
        {label} {required && <span className="text-amber-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ inputRef, ...props }) {
  return (
    <input
      ref={inputRef}
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
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

export default function AuthModal({ initialMode = 'login', onSuccess, onClose }) {
  const { login } = useAuth()
  // 'login' | 'register'
  const [mode, setMode] = useState(initialMode)
  // register step: 1 = personal info, 2 = radio info
  const [step, setStep] = useState(1)

  // ── shared ──
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── personal info (register step 1) ──
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // ── radio info (register step 2) ──
  const [stationName, setStationName] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState('')

  const firstInputRef = useRef(null)
  const logoInputRef = useRef(null)

  // Reset on mode change
  useEffect(() => {
    setError('')
    setStep(1)
    setPassword('')
    setConfirm('')
    setFirstName('')
    setLastName('')
    setStationName('')
    setGenre('')
    setDescription('')
    setLogoPreview('')
    setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [mode])

  // Reset error on step change
  useEffect(() => { setError('') }, [step])

  // Close on Escape
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

  // Step 1 validation → advance to step 2
  function handleStep1(e) {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim()) { setError('Last name is required'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setStep(2)
  }

  // Step 2 → submit
  async function handleRegister(e) {
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
      login(data.token)
      onSuccess()
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <div>
            {mode === 'login' ? (
              <>
                <h2 className="text-lg font-bold text-white">Sign in to your studio</h2>
                <p className="text-xs text-gray-500 mt-0.5">Welcome back</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white">
                  {step === 1 ? 'Create your account' : 'Set up your radio station'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step === 1 ? 'Step 1 of 2 — Personal info' : 'Step 2 of 2 — Radio info'}
                </p>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-1" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Mode tabs (only when not mid-register) ── */}
        {(mode === 'login' || step === 1) && (
          <div className="flex mx-6 mb-5 bg-gray-800/60 rounded-xl p-1">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === m ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        )}

        {/* ── Register step progress bar ── */}
        {mode === 'register' && (
          <div className="mx-6 mb-5 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rio-logo-gradient rounded-full transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        )}

        {/* ══ LOGIN FORM ══ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="px-6 pb-6 space-y-4">
            <Field label="Email" required>
              <Input inputRef={firstInputRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Your password" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </Field>

            <ErrorBox message={error} />

            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl rio-logo-gradient disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="text-center text-xs text-gray-600">
              No account yet?{' '}
              <button type="button" onClick={() => setMode('register')} className="text-amber-400 hover:text-amber-300 font-semibold">Create one free</button>
            </p>
          </form>
        )}

        {/* ══ REGISTER STEP 1 — Personal Info ══ */}
        {mode === 'register' && step === 1 && (
          <form onSubmit={handleStep1} className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <Input inputRef={firstInputRef} type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Jane" maxLength={50} />
              </Field>
              <Field label="Last Name" required>
                <Input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Smith" maxLength={50} />
              </Field>
            </div>

            <Field label="Email" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </Field>

            <Field label="Confirm Password" required>
              <Input type={showPass ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="Repeat password" />
            </Field>

            <ErrorBox message={error} />

            <button type="submit" className="w-full py-3 rounded-xl rio-logo-gradient text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30">
              Next: Set up your station →
            </button>

            <p className="text-center text-xs text-gray-600">
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-amber-400 hover:text-amber-300 font-semibold">Sign in</button>
            </p>
          </form>
        )}

        {/* ══ REGISTER STEP 2 — Radio Info ══ */}
        {mode === 'register' && step === 2 && (
          <form onSubmit={handleRegister} className="px-6 pb-6 space-y-4">
            {/* Logo + Station name row */}
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-xl bg-gray-800 border-2 border-dashed border-gray-700 hover:border-amber-500 transition-colors overflow-hidden group flex items-center justify-center"
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
                <p className="text-center text-xs text-gray-600 mt-1">optional</p>
              </div>
              <div className="flex-1">
                <Field label="Station Name" required>
                  <Input inputRef={firstInputRef} type="text" value={stationName} onChange={(e) => setStationName(e.target.value)} required maxLength={80} placeholder="e.g. Sunset FM" />
                </Field>
              </div>
            </div>

            <Field label="Genre / Format">
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="">Select a genre (optional)</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>

            <Field label="Station Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Tell listeners what your station is about… (optional)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </Field>

            <ErrorBox message={error} />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-semibold text-sm transition-all"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-3 rounded-xl rio-logo-gradient disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30"
              >
                {loading ? 'Creating station…' : 'Launch My Station 🎙️'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
