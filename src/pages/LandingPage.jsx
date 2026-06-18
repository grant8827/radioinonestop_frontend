import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'
import StationModal from '../components/StationModal'
import appLogo from '../assets/radioinonestop_logo .png'

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
    title: 'Radio Automation',
    desc: 'Run live shows, playlists, and your station mixer from one focused radio workspace.',
    accent: 'text-red-400',
    border: 'border-red-900/40',
    bg: 'bg-red-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Low-Latency HLS',
    desc: 'LL-HLS delivery with 1-second segments. Handle 500+ concurrent listeners without breaking a sweat.',
    accent: 'text-amber-400',
    border: 'border-amber-900/40',
    bg: 'bg-amber-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Browser Radio Broadcasting',
    desc: 'Send your live radio mix directly from Chrome or Firefox — no extra encoder required.',
    accent: 'text-emerald-400',
    border: 'border-emerald-900/40',
    bg: 'bg-emerald-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    title: 'Live Chat & Analytics',
    desc: 'Real-time chat and viewer count built in. Engage your audience without third-party plugins.',
    accent: 'text-orange-400',
    border: 'border-orange-900/40',
    bg: 'bg-orange-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'Your Own Stream Key',
    desc: 'Every account gets a unique, cryptographically secure RTMP ingest URL — no shared keys.',
    accent: 'text-red-300',
    border: 'border-red-900/40',
    bg: 'bg-red-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    title: 'OBS Ready',
    desc: 'Works with OBS Studio, vMix, Liquidsoap, and any RTMP-compatible broadcaster out of the box.',
    accent: 'text-yellow-300',
    border: 'border-yellow-900/40',
    bg: 'bg-yellow-900/10',
  },
]

const DEMO_STATIONS = [
  {
    slug: 'demo-sunset-fm',
    name: 'Sunset FM',
    logo_url: '',
    is_live: true,
    listeners: 42,
    genre: 'Chillout',
    description: 'Smooth evening vibes, deep house and ambient sounds to wind down your day.',
  },
  {
    slug: 'demo-bass-nation',
    name: 'Bass Nation',
    logo_url: '',
    is_live: false,
    listeners: 0,
    genre: 'Drum & Bass',
    description: 'The hardest drum and bass, jungle, and neurofunk — 24/7 rolling.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [stations, setStations] = useState(DEMO_STATIONS)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch stations on mount, refresh every 30s
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/stations')
        if (r.ok) {
          const data = await r.json()
          if (data && data.length > 0) {
            setStations(data)
            // Auto-open station from shared link (?station=slug)
            const slug = searchParams.get('station')
            if (slug) {
              const match = data.find((s) => s.slug === slug)
              if (match) setSelectedStation(match)
            }
          }
        }
      } catch { /* ignore */ }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [searchParams])

  function openLogin() { setMobileMenuOpen(false); setShowRegister(false); setShowLogin(true) }
  function openRegister() { setMobileMenuOpen(false); setShowLogin(false); setShowRegister(true) }

  function goTo(path) {
    setMobileMenuOpen(false)
    navigate(path)
  }

  function scrollToFeatures() {
    setMobileMenuOpen(false)
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleLogout() {
    setMobileMenuOpen(false)
    logout()
    navigate('/')
  }

  function handleAuthSuccess() {
    setShowLogin(false)
    setShowRegister(false)
    if (localStorage.getItem('rio_pending_payment') === '1') {
      localStorage.removeItem('rio_pending_payment')
      navigate('/payment')
      return
    }
    navigate('/app')
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#09090f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="Radio In One Stop logo" className="w-7 h-7 rounded-sm object-contain" />
            <span className="font-bold text-sm tracking-tight">Radio In One Stop</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => goTo('/stations')}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
            >
              Stations
            </button>
            <button
              onClick={scrollToFeatures}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
            >
              Features
            </button>
            <button
              onClick={() => goTo('/pricing')}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
            >
              Pricing
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => goTo('/app')}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-white font-semibold text-sm transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => goTo('/pricing')}
                  className="px-5 py-2 rounded-lg rio-logo-gradient text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50"
                >
                  Start Broadcasting
                </button>
                <button
                  onClick={openLogin}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
                >
                  Sign In
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="landing-mobile-menu" className="md:hidden border-t border-white/5 bg-[#09090f]/95 px-4 py-4 shadow-2xl shadow-black/30">
            <div className="mx-auto flex max-w-6xl flex-col gap-2">
              <button
                onClick={() => goTo('/stations')}
                className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Stations
              </button>
              <button
                onClick={scrollToFeatures}
                className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Features
              </button>
              <button
                onClick={() => goTo('/pricing')}
                className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Pricing
              </button>

              <div className="mt-2 border-t border-white/5 pt-3">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => goTo('/app')}
                      className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-lg border border-white/20 px-3 py-3 text-left text-sm font-semibold text-white transition-colors hover:bg-white/5"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => goTo('/pricing')}
                      className="w-full rounded-lg rio-logo-gradient px-3 py-3 text-left text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50"
                    >
                      Start Broadcasting
                    </button>
                    <button
                      onClick={openLogin}
                      className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-700/20 blur-3xl" />
          <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-blue-700/15 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 bg-red-900/20 border border-red-800/40 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Your personal radio studio
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Your Radio Station.{' '}
            <span className="rio-logo-gradient-text">
              Live to the World.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed mb-10">
            Broadcast your radio station, manage your mixer, and connect with listeners.
            Built-in HLS audio playback, live chat, and browser broadcasting — all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={openLogin}
              className="px-7 py-3 rounded-xl border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold text-sm transition-all hover:bg-white/5"
            >
              Sign In →
            </button>
            <button
              onClick={scrollToFeatures}
              className="px-7 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-sm transition-all border border-white/10 hover:border-white/20"
            >
              Explore Features
            </button>
          </div>
        </div>
      </section>

      {/* ── Stations Grid ── */}
      {stations.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Stations on the Air</h2>
              <p className="text-gray-500 text-sm">{stations.length} station{stations.length !== 1 ? 's' : ''} registered — click any to tune in.</p>
            </div>
            {stations.length > 8 && (
              <button
                onClick={() => navigate('/stations')}
                className="shrink-0 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                {`Browse All ${stations.length} →`}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stations.slice(0, 8).map(station => (
              <div
                key={station.slug}
                className="group relative rounded-xl border border-white/5 bg-white/3 hover:border-red-800/60 hover:bg-white/5 transition-all duration-200 overflow-hidden cursor-pointer"
                onClick={() => setSelectedStation(station)}
              >
                {/* Card body */}
                <div className="p-5 flex items-start gap-4">
                  {/* Logo / avatar */}
                  <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-[#1a1a2e] border border-white/10 flex items-center justify-center">
                    {station.logo_url ? (
                      <img src={station.logo_url} alt={station.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-amber-400">
                        {station.name?.[0]?.toUpperCase() ?? '♫'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm text-white truncate">{station.name}</h3>
                      {station.is_live && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-900/20 border border-red-900/40 rounded-full px-2 py-0.5">
                          <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    {station.genre && (
                      <p className="text-[10px] text-amber-400 font-semibold mb-1">{station.genre}</p>
                    )}
                    {station.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{station.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-600">
                        {station.listeners} listener{station.listeners !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl">
                  <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl rio-logo-gradient text-white text-sm font-bold shadow-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Listen Now
                  </span>
                </div>
              </div>
            ))}
          </div>
          {stations.length > 8 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/stations')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 hover:border-red-800/60 text-gray-300 hover:text-white text-sm font-semibold transition-all hover:bg-white/5"
              >
                Browse All {stations.length} Stations
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Everything you need to go live</h2>
          <p className="text-gray-500 text-sm">No monthly fees. No per-stream limits. Just stream.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`rounded-xl border ${f.border} ${f.bg} p-5 flex flex-col gap-3`}
            >
              <span className={`${f.accent} ${f.bg} w-10 h-10 rounded-lg flex items-center justify-center border ${f.border}`}>
                {f.icon}
              </span>
              <h3 className="font-semibold text-white text-sm">{f.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Ready to go live?</h2>
          <p className="text-gray-500 text-sm mb-8">Choose your plan and start broadcasting in minutes.</p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-8 py-3 rounded-xl rio-logo-gradient text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/40"
          >
            View Pricing Plans
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-gray-600">© 2026 Radio In One Stop</span>
          <span className="text-xs text-gray-700">Built with Go + React</span>
        </div>
      </footer>

      {selectedStation && (
        <StationModal
          station={selectedStation}
          autoPlay
          onClose={() => setSelectedStation(null)}
        />
      )}

      {/* ── Auth Modals ── */}
      {showLogin && (
        <LoginModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={openRegister}
        />
      )}
      {showRegister && (
        <RegisterModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={openLogin}
        />
      )}
    </div>
  )
}
