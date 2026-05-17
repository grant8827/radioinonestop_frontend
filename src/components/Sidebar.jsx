import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { id: 'radio', label: 'Radio', icon: RadioIcon },
  { id: 'video', label: 'Podcast', icon: VideoIcon },
  { id: 'mixer', label: 'Mixer', icon: MixerIcon },
  { id: 'stream', label: 'Stream', icon: StreamIcon },
]

function RadioIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H5.02L16.89 2.37 16.26.91 3.24 6.15zM12 18c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8H6V8h12v2z" />
    </svg>
  )
}

function VideoIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  )
}

function MixerIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
    </svg>
  )
}

function StreamIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.25h.008v.008H12v-.008z" />
    </svg>
  )
}

function StreamDot({ live }) {
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${
        live ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
      }`}
    />
  )
}

export default function Sidebar({ stationName, mode, onModeChange, onSettingsClick }) {
  const [streams, setStreams] = useState([])
  const [open, setOpen] = useState(false) // mobile drawer

  useEffect(() => {
    const load = () =>
      fetch('/api/streams')
        .then((r) => r.json())
        .then((data) => setStreams(Array.isArray(data) ? data : []))
        .catch(() => {})

    load()
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [])

  const content = (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className="px-5 pt-6 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="font-bold text-sm leading-tight truncate">{stationName}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 pt-4 pb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
          Channels
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { onModeChange(id); setOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${
              mode === id
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
            {mode === id && (
              <span className="ml-auto text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5 leading-none">
                ON
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Live Streams */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
          Live Streams
        </p>
        {streams.length === 0 ? (
          <p className="text-xs text-gray-600 px-2 py-1.5">No active streams</p>
        ) : (
          streams.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-default"
            >
              <StreamDot live={s.live} />
              <div className="min-w-0">
                <p className="text-sm text-gray-200 truncate font-medium">{s.key}</p>
                {s.startedAt && (
                  <p className="text-xs text-gray-500 truncate">
                    {new Date(s.startedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              {s.live && (
                <span className="ml-auto text-[10px] font-bold text-red-400 flex-shrink-0">
                  LIVE
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <div className="px-3 pb-5 border-t border-gray-800 pt-3">
        <button
          onClick={() => { onSettingsClick(); setOpen(false) }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-gray-900 border-r border-gray-800 flex-shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile: hamburger button */}
      <button
        className="lg:hidden fixed top-3 left-3 z-40 bg-gray-800 rounded-lg p-2 text-gray-400 hover:text-white"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative w-56 bg-gray-900 border-r border-gray-800 h-full flex flex-col z-10">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
