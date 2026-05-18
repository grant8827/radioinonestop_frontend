import { useRef, useState } from 'react'
import { useAudioEngine } from '../context/AudioEngine'

// Parse "Artist - Title.ext" or fall back gracefully
function parseFilename(filename) {
  const nameNoExt = filename.replace(/\.[^/.]+$/, '')
  const idx = nameNoExt.indexOf(' - ')
  if (idx > 0) {
    return {
      artist: nameNoExt.slice(0, idx).trim(),
      title:  nameNoExt.slice(idx + 3).trim(),
    }
  }
  return { artist: 'Unknown', title: nameNoExt }
}

// Read audio duration via a temporary Audio element
function readDuration(url) {
  return new Promise((resolve) => {
    const a = new Audio()
    a.preload = 'metadata'
    a.src = url
    a.addEventListener('loadedmetadata', () => {
      const d = a.duration
      a.src = ''
      if (!isFinite(d)) { resolve('∞'); return }
      const m = Math.floor(d / 60)
      const s = String(Math.floor(d % 60)).padStart(2, '0')
      resolve(`${m}:${s}`)
    })
    a.addEventListener('error', () => { a.src = ''; resolve('--') })
  })
}

export default function NowPlaying({ config, mode, onTrackLoadA, onTrackLoadB }) {
  const audioEngine = useAudioEngine()
  const micOn = audioEngine?.micOnAirMap?.[1] ?? false
  const [showLibrary, setShowLibrary] = useState(false)
  const [library, setLibrary] = useState([])
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const { artist, title } = parseFilename(file.name)
    const duration = await readDuration(url)
    const track = { url, name: file.name, title, artist, duration }
    setLibrary((prev) =>
      prev.find((t) => t.name === file.name) ? prev : [...prev, track]
    )
    e.target.value = ''
  }

  const handleLoadToDeck = (track, deck) => {
    if (deck === 'A') onTrackLoadA?.(track)
    else              onTrackLoadB?.(track)
    setShowLibrary(false)
  }

  const handleRemove = (e, name) => {
    e.stopPropagation()
    setLibrary((prev) => prev.filter((t) => t.name !== name))
  }

  return (
    <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3 relative">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ON AIR MIC button */}
      <button
        onClick={() => audioEngine?.setMicOnAir(1, !micOn)}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-150 flex-shrink-0 ${
          micOn
            ? 'bg-red-600 text-white shadow-[0_0_18px_#ef444455] animate-pulse'
            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        {micOn ? '● ON AIR MIC' : 'ON AIR MIC'}
      </button>

      {/* LOAD TRACK button */}
      <button
        onClick={() => setShowLibrary(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest bg-gray-800 text-gray-400 border border-gray-700 hover:border-sky-500 hover:text-sky-400 transition-all duration-150 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H8v-2h6v2zm2-4H8v-2h8v2z" />
        </svg>
        Load Track
        {library.length > 0 && (
          <span className="ml-1 bg-sky-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {library.length}
          </span>
        )}
      </button>

      {/* Track Library Modal */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="relative flex flex-col rounded-2xl border border-gray-700 shadow-2xl"
            style={{ background: '#0d1117', width: 680, maxHeight: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-sm uppercase tracking-widest">
                  Track Library
                </span>
                {library.length > 0 && (
                  <span className="text-gray-600 text-xs font-mono">
                    {library.length} track{library.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Column headers */}
            {library.length > 0 && (
              <div
                className="grid items-center px-4 py-2 border-b border-gray-800 flex-shrink-0"
                style={{ gridTemplateColumns: '28px 1fr 160px 64px 80px' }}
              >
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">#</span>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Title / Artist</span>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Artist</span>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center">Time</span>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center">Deck</span>
              </div>
            )}

            {/* Track list */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {library.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <svg className="w-12 h-12 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                  </svg>
                  <p className="text-gray-600 text-xs uppercase tracking-widest">Library is empty</p>
                  <p className="text-gray-700 text-xs">Click "Load from PC" to add tracks</p>
                </div>
              ) : (
                <ul className="py-1">
                  {library.map((track, idx) => (
                    <li
                      key={track.name}
                      className="grid items-center px-4 py-2.5 hover:bg-gray-800/60 group transition-colors"
                      style={{ gridTemplateColumns: '28px 1fr 160px 64px 80px' }}
                    >
                      {/* Index */}
                      <span className="text-[11px] font-mono text-gray-600 group-hover:text-gray-500">
                        {idx + 1}
                      </span>

                      {/* Title + small filename */}
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-white text-xs font-semibold truncate leading-tight" title={track.title}>
                          {track.title}
                        </span>
                        <span className="text-gray-600 text-[10px] truncate leading-tight mt-0.5" title={track.name}>
                          {track.name}
                        </span>
                      </div>

                      {/* Artist */}
                      <span className="text-gray-400 text-xs truncate pr-2" title={track.artist}>
                        {track.artist}
                      </span>

                      {/* Duration */}
                      <span className="text-gray-500 text-xs font-mono text-center">
                        {track.duration}
                      </span>

                      {/* Deck A / B buttons + remove */}
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleLoadToDeck(track, 'A')}
                          className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: '#38bdf820',
                            color: '#38bdf8',
                            border: '1px solid #38bdf850',
                          }}
                          title="Load to Deck A"
                        >
                          A
                        </button>
                        <button
                          onClick={() => handleLoadToDeck(track, 'B')}
                          className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: '#fbbf2420',
                            color: '#fbbf24',
                            border: '1px solid #fbbf2450',
                          }}
                          title="Load to Deck B"
                        >
                          B
                        </button>
                        <button
                          onClick={(e) => handleRemove(e, track.name)}
                          className="text-gray-700 hover:text-red-500 transition-colors text-sm leading-none ml-0.5"
                          title="Remove from library"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-widest bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Load from PC
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
