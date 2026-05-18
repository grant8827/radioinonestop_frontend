import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
    title: 'Multistream Everywhere',
    desc: 'Push your live stream simultaneously to YouTube, Facebook, TikTok, and Instagram — from a single RTMP source.',
    accent: 'text-purple-400',
    border: 'border-purple-900/40',
    bg: 'bg-purple-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Low-Latency HLS',
    desc: 'LL-HLS delivery with 1-second segments. Handle 500+ concurrent listeners without breaking a sweat.',
    accent: 'text-blue-400',
    border: 'border-blue-900/40',
    bg: 'bg-blue-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Browser Broadcasting',
    desc: 'Go live directly from Chrome or Firefox via WebRTC — no software download required.',
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
    accent: 'text-pink-400',
    border: 'border-pink-900/40',
    bg: 'bg-pink-900/10',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    title: 'OBS Ready',
    desc: 'Works with OBS Studio, vMix, Liquidsoap, and any RTMP-compatible broadcaster out of the box.',
    accent: 'text-cyan-400',
    border: 'border-cyan-900/40',
    bg: 'bg-cyan-900/10',
  },
]

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const navigate = useNavigate()

  function openLogin() { setShowRegister(false); setShowLogin(true) }
  function openRegister() { setShowLogin(false); setShowRegister(true) }

  function handleAuthSuccess() {
    setShowLogin(false)
    setShowRegister(false)
    navigate('/app')
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-[#09090f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            {/* Radio waves logo */}
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5l2.25-2.25m0 0l.75-.75m-.75.75A8.953 8.953 0 0112 15a8.953 8.953 0 015.999 2.25m-12-2.25A8.953 8.953 0 0112 6a8.953 8.953 0 016 3m-12 0L3.75 7.5M3.75 4.5l2.25 2.25m12-2.25l-2.25 2.25m0 0l-.75.75m.75-.75A8.953 8.953 0 0112 9a8.953 8.953 0 016 3m-6-3V3m0 18v-1.5" />
            </svg>
            <span className="font-bold text-sm tracking-tight">Radio In One Stop</span>
          </div>
          <button
            onClick={openLogin}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-700/20 blur-3xl" />
          <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-blue-700/15 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 bg-purple-900/20 border border-purple-800/40 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Your personal radio studio
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Your Radio Station.{' '}
            <span className="bg-linear-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Live to the World.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed mb-10">
            Multistream to YouTube, Facebook, TikTok, and Instagram simultaneously.
            Built-in HLS playback, live chat, and a browser broadcaster — all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={openRegister}
              className="px-7 py-3 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60"
            >
              Start Broadcasting Free
            </button>
            <button
              onClick={openLogin}
              className="px-7 py-3 rounded-xl border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold text-sm transition-all hover:bg-white/5"
            >
              Sign In →
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
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
          <p className="text-gray-500 text-sm mb-8">Create your account in seconds. No credit card required.</p>
          <button
            onClick={openRegister}
            className="px-8 py-3 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40"
          >
            Create Free Account
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
