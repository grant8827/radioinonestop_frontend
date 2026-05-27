import { useEffect, useRef, useState } from 'react'

// ── IndexedDB persistence ──────────────────────────────────────────────────────
const IDB_NAME    = 'radio-track-library'
const IDB_STORE   = 'tracks'
const IDB_VERSION = 1

function openTrackDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'name' })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

async function idbSaveTrack(track) {
  const db = await openTrackDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put({
      name: track.name, title: track.title,
      artist: track.artist, duration: track.duration,
      blob: track.blob,
    })
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror    = (e) => { db.close(); reject(e.target.error) }
  })
}

async function idbDeleteTrack(name) {
  const db = await openTrackDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(name)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror    = (e) => { db.close(); reject(e.target.error) }
  })
}

async function idbLoadAllTracks() {
  const db = await openTrackDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).getAll()
    req.onsuccess = (e) => {
      db.close()
      resolve(
        e.target.result.map((r) => ({
          name: r.name, title: r.title, artist: r.artist, duration: r.duration,
          url: URL.createObjectURL(r.blob),
        }))
      )
    }
    req.onerror = (e) => { db.close(); reject(e.target.error) }
  })
}

// ── helpers ────────────────────────────────────────────────────────────────────
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

const AUDIO_EXTS = /\.(mp3|wav|m4a|flac|ogg|aac|opus|wma)$/i

async function processFiles(fileList) {
  const files = Array.from(fileList).filter(
    (f) => f.type.startsWith('audio/') || AUDIO_EXTS.test(f.name)
  )
  return Promise.all(
    files.map(async (file) => {
      const url = URL.createObjectURL(file)
      const { artist, title } = parseFilename(file.name)
      const duration = await readDuration(url)
      return { url, name: file.name, title, artist, duration, blob: file }
    })
  )
}

// ── component ──────────────────────────────────────────────────────────────────
export default function TrackLibrary({
  onTrackLoadA,
  onTrackLoadB,
  queue = [],
  onQueueChange,
  repeatPlaylist = false,
  onRepeatChange,
  nowPlayingA = null,
  nowPlayingB = null,
}) {
  const [tab, setTab] = useState('library')
  const [library, setLibrary] = useState([])
  const fileInputRef = useRef(null)
  const dirInputRef  = useRef(null)
  const queueReadyRef = useRef(false) // don't save until restore is done

  // ── restore library from IndexedDB on mount + rebuild saved auto playlist ─────
  useEffect(() => {
    idbLoadAllTracks()
      .then((tracks) => {
        if (tracks.length > 0) {
          setLibrary(tracks)
          try {
            const savedNames = JSON.parse(localStorage.getItem('auto_playlist_queue') || '[]')
            if (savedNames.length > 0) {
              const byName = Object.fromEntries(tracks.map((t) => [t.name, t]))
              const restored = savedNames.map((n) => byName[n]).filter(Boolean)
              if (restored.length > 0) {
                onQueueChange?.(restored)
                queueReadyRef.current = true
                return
              }
            }
          } catch {}
        }
        queueReadyRef.current = true
      })
      .catch(() => { queueReadyRef.current = true })
  }, [])

  // ── persist auto playlist to localStorage on every change ────────────────────
  useEffect(() => {
    if (!queueReadyRef.current) return
    try {
      localStorage.setItem('auto_playlist_queue', JSON.stringify(queue.map((t) => t.name)))
    } catch {}
  }, [queue])

  // ── load handlers ────────────────────────────────────────────────────────────
  const addToLibrary = (newTracks) => {
    setLibrary((prev) => {
      const existing = new Set(prev.map((t) => t.name))
      const toAdd = newTracks.filter((t) => !existing.has(t.name))
      toAdd.forEach((t) => { if (t.blob) idbSaveTrack(t).catch(() => {}) })
      return [...prev, ...toAdd]
    })
  }

  const handleFilePick = async (e) => {
    const tracks = await processFiles(e.target.files)
    addToLibrary(tracks)
    e.target.value = ''
  }

  const handleDirPick = async (e) => {
    const tracks = await processFiles(e.target.files)
    addToLibrary(tracks)
    e.target.value = ''
  }

  // ── library actions ──────────────────────────────────────────────────────────
  const loadToDeck = (track, deck) => {
    if (deck === 'A') onTrackLoadA?.(track)
    else              onTrackLoadB?.(track)
  }

  const addToQueue = (track) => {
    onQueueChange?.([...queue, track])
  }

  const removeFromLibrary = (name) => {
    setLibrary((prev) => {
      const track = prev.find((t) => t.name === name)
      if (track?.url?.startsWith('blob:')) URL.revokeObjectURL(track.url)
      idbDeleteTrack(name).catch(() => {})
      return prev.filter((t) => t.name !== name)
    })
  }

  // ── queue actions ────────────────────────────────────────────────────────────
  const removeFromQueue = (idx) => {
    onQueueChange?.(queue.filter((_, i) => i !== idx))
  }

  const clearQueue = () => onQueueChange?.([])

  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...queue]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onQueueChange?.(next)
  }

  const moveDown = (idx) => {
    if (idx === queue.length - 1) return
    const next = [...queue]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onQueueChange?.(next)
  }

  const dragIndexRef              = useRef(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  // ── shared button style helper ───────────────────────────────────────────────
  const deckBtn = (color, border) => ({
    background: `${color}15`, color, border: `1px solid ${border}`,
    padding: '2px 5px', borderRadius: 4, fontSize: 9, fontWeight: 900, lineHeight: 1.4,
    cursor: 'pointer',
  })

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-800 bg-[#0d1117] overflow-hidden">

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFilePick}
      />
      <input
        ref={dirInputRef}
        type="file"
        accept="audio/*"
        multiple
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleDirPick}
      />

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-800 shrink-0">
        {[
          { id: 'library',  label: library.length > 0 ? `Library (${library.length})` : 'Library' },
          { id: 'playlist', label: queue.length > 0    ? `Auto Playlist (${queue.length})` : 'Auto Playlist' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors"
            style={{
              color: tab === t.id ? '#38bdf8' : '#4b5563',
              borderBottom: tab === t.id ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ LIBRARY TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'library' && (
        <>
          {/* Load buttons */}
          <div className="flex gap-2 p-2 border-b border-gray-800 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-600/30 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Files
            </button>
            <button
              onClick={() => dirInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/30 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
              Folder
            </button>
          </div>

          {/* Column headers */}
          {library.length > 0 && (
            <div
              className="grid items-center px-3 py-1.5 border-b border-gray-800/60 shrink-0"
              style={{ gridTemplateColumns: '20px 1fr 44px 92px' }}
            >
              <span className="text-[9px] font-bold text-gray-700 uppercase">#</span>
              <span className="text-[9px] font-bold text-gray-700 uppercase">Title</span>
              <span className="text-[9px] font-bold text-gray-700 uppercase text-center">Time</span>
              <span className="text-[9px] font-bold text-gray-700 uppercase text-center">A / B / +Q</span>
            </div>
          )}

          {/* Track list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {library.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <svg className="w-10 h-10 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                </svg>
                <p className="text-gray-600 text-xs uppercase tracking-widest">Library empty</p>
                <p className="text-gray-700 text-[11px] text-center px-4">Load files or a folder above</p>
              </div>
            ) : (
              <ul className="py-1">
                {library.map((track, idx) => (
                  <li
                    key={track.name}
                    className="grid items-center px-3 py-2 hover:bg-gray-800/50 group transition-colors"
                    style={{ gridTemplateColumns: '20px 1fr 44px 92px' }}
                  >
                    <span className="text-[10px] font-mono text-gray-700">{idx + 1}</span>
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-white text-[11px] font-semibold truncate leading-tight">
                        {track.title}
                      </span>
                      <span className="text-gray-500 text-[9px] truncate">{track.artist}</span>
                    </div>
                    <span className="text-gray-500 text-[10px] font-mono text-center">
                      {track.duration}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => loadToDeck(track, 'A')} style={deckBtn('#38bdf8', '#38bdf840')} title="Load to Deck A">A</button>
                      <button onClick={() => loadToDeck(track, 'B')} style={deckBtn('#fbbf24', '#fbbf2440')} title="Load to Deck B">B</button>
                      <button onClick={() => addToQueue(track)}      style={deckBtn('#a78bfa', '#a78bfa40')} title="Add to Auto Playlist">+</button>
                      <button
                        onClick={() => removeFromLibrary(track.name)}
                        className="text-gray-700 hover:text-red-500 text-xs ml-0.5 transition-colors"
                      >✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ══ AUTO PLAYLIST TAB ════════════════════════════════════════════════════ */}
      {tab === 'playlist' && (
        <>
          {/* Controls bar — always visible */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
            <span className="text-[9px] text-gray-600 font-mono">
              {queue.length > 0
                ? `${queue.length} track${queue.length !== 1 ? 's' : ''} queued`
                : 'No tracks queued'}
            </span>
            <div className="flex items-center gap-2">
              {/* Repeat toggle */}
              <button
                onClick={() => onRepeatChange?.(!repeatPlaylist)}
                title={repeatPlaylist ? 'Repeat on — click to turn off' : 'Repeat off — click to loop playlist'}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors border"
                style={{
                  color:      repeatPlaylist ? '#a78bfa' : '#4b5563',
                  background: repeatPlaylist ? '#a78bfa18' : 'transparent',
                  borderColor: repeatPlaylist ? '#a78bfa40' : '#374151',
                }}
              >
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
                Repeat
              </button>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-[9px] font-bold uppercase tracking-wider text-red-700 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Column headers */}
          {queue.length > 0 && (
            <div
              className="grid items-center px-3 py-1.5 border-b border-gray-800/60 shrink-0"
              style={{ gridTemplateColumns: '22px 1fr 44px 84px' }}
            >
              <span className="text-[9px] font-bold text-gray-700 uppercase">#</span>
              <span className="text-[9px] font-bold text-gray-700 uppercase">Title</span>
              <span className="text-[9px] font-bold text-gray-700 uppercase text-center">Time</span>
              <span className="text-[9px] font-bold text-gray-700 uppercase text-center">Actions</span>
            </div>
          )}

          {/* Queue list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <svg className="w-10 h-10 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z" />
                </svg>
                <p className="text-gray-600 text-xs uppercase tracking-widest">Queue empty</p>
                <p className="text-gray-700 text-[11px] text-center px-4">
                  Go to Library and tap [+] on any track
                </p>
              </div>
            ) : (
              <ul className="py-1">
                {queue.map((track, idx) => (
                  <li
                    key={`${track.name}-${idx}`}
                    draggable
                    onDragStart={() => { dragIndexRef.current = idx }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx) }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={() => {
                      setDragOverIdx(null)
                      const from = dragIndexRef.current
                      if (from === null || from === idx) return
                      const next = [...queue]
                      const [moved] = next.splice(from, 1)
                      next.splice(idx, 0, moved)
                      onQueueChange?.(next)
                      dragIndexRef.current = null
                    }}
                    onDragEnd={() => { setDragOverIdx(null); dragIndexRef.current = null }}
                    className={`grid items-center px-3 py-2 group transition-colors cursor-grab active:cursor-grabbing${
                        (track.name === nowPlayingA?.name || track.name === nowPlayingB?.name)
                          ? ' bg-purple-900/40 border-l-2 border-purple-400'
                          : ' hover:bg-gray-800/50'
                      }${dragOverIdx === idx ? ' border-t-2 border-purple-500' : ''}`}
                    style={{ gridTemplateColumns: '22px 1fr 44px 84px' }}
                  >
                    <span className="text-[10px] font-mono text-purple-500 font-bold">{idx + 1}</span>
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-white text-[11px] font-semibold truncate leading-tight">
                        {track.title}
                      </span>
                      <span className="text-gray-500 text-[9px] truncate">{track.artist}</span>
                    </div>
                    <span className="text-gray-500 text-[10px] font-mono text-center">
                      {track.duration}
                    </span>
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => loadToDeck(track, 'A')} style={deckBtn('#38bdf8', '#38bdf840')} title="Load to Deck A">A</button>
                      <button onClick={() => loadToDeck(track, 'B')} style={deckBtn('#fbbf24', '#fbbf2440')} title="Load to Deck B">B</button>
                      <button
                        onClick={() => moveUp(idx)}
                        className="text-gray-700 hover:text-gray-400 text-[10px] px-0.5 transition-colors"
                        style={{ opacity: idx === 0 ? 0.3 : 1 }}
                        title="Move up"
                      >↑</button>
                      <button
                        onClick={() => moveDown(idx)}
                        className="text-gray-700 hover:text-gray-400 text-[10px] px-0.5 transition-colors"
                        style={{ opacity: idx === queue.length - 1 ? 0.3 : 1 }}
                        title="Move down"
                      >↓</button>
                      <button
                        onClick={() => removeFromQueue(idx)}
                        className="text-gray-700 hover:text-red-500 text-xs ml-0.5 transition-colors"
                        title="Remove from queue"
                      >✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
