import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import appLogo from '../assets/radioinonestop_logo .png'

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B / Soul', 'Electronic / Dance',
  'Jazz', 'Classical', 'Country', 'Latin', 'Reggae',
  'Gospel / Christian', 'News / Talk', 'Sports', 'Podcast', 'Other',
]

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

export default function CompleteStationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, profileLoaded, token, user, refreshProfile } = useAuth()
  const [stationName, setStationName] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const firstInputRef = useRef(null)
  const logoInputRef = useRef(null)
  const nextTarget = searchParams.get('next') || '/app'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/', { replace: true })
      return
    }
    if (!profileLoaded) return
    if (user?.stationName) {
      navigate(nextTarget, { replace: true })
      return
    }
    setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [isAuthenticated, profileLoaded, user?.stationName, navigate, nextTarget])

  useEffect(() => {
    if (!token) return
    fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((profile) => {
        setStationName(profile.station_name || '')
        setGenre(profile.genre || '')
        setDescription(profile.description || '')
        setLogoPreview(profile.logo_url || '')
      })
      .catch(() => {})
  }, [token])

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Logo must be an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be smaller than 2 MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!stationName.trim()) { setError('Station name is required'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      await refreshProfile()
      navigate(nextTarget, { replace: true })
    } catch {
      setError('Network error — could not finish setup')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 text-lg">Checking account…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <nav className="border-b border-white/5 backdrop-blur-lg bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="Radio In One Stop logo" className="w-7 h-7 rounded-sm object-contain" />
            <span className="font-bold text-sm tracking-tight">Radio In One Stop</span>
          </div>
          <span className="text-sm font-medium text-amber-400">Complete station setup</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">
          <div className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="border-b border-white/10 p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl rio-logo-gradient flex items-center justify-center shadow-lg shadow-red-900/40">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white">Finish your station setup</h1>
                  <p className="text-sm text-gray-400 mt-1">One last step before we take you into your dashboard.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl bg-gray-900 border-2 border-dashed border-gray-700 hover:border-amber-500 transition-colors overflow-hidden group flex items-center justify-center"
                    title="Upload station logo (optional)"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-600 group-hover:text-amber-400 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
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
                    <input
                      ref={firstInputRef}
                      type="text"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      required
                      maxLength={80}
                      placeholder="e.g. Sunset FM"
                      className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />
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
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>

              <Field label="Station Description" hint="optional">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Tell listeners what your station is about…"
                  className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </Field>

              <ErrorBox message={error} />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl rio-logo-gradient disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30"
              >
                {loading ? 'Saving station…' : 'Complete setup'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
