import { useState, useRef } from 'react'
import { useAudioEngine } from '../context/AudioEngine'

const TABS = [
  { id: 'record', label: 'Record' },
]

const hasDirPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export default function SettingsPage() {
  const [tab, setTab] = useState('record')
  const { getStreamTrack } = useAudioEngine()

  // Folder picker state
  const dirHandleRef = useRef(null)
  const [dirName, setDirName] = useState(() => localStorage.getItem('recDirName') || '')

  // Format
  const [format, setFormat] = useState(() => localStorage.getItem('recFormat') || 'webm')

  // Recording state
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const [recError, setRecError] = useState('')
  const mrRef     = useRef(null)
  const chunksRef = useRef([])
  const timerRef  = useRef(null)

  const pickFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      dirHandleRef.current = handle
      setDirName(handle.name)
      localStorage.setItem('recDirName', handle.name)
    } catch (e) {
      if (e.name !== 'AbortError') setRecError('Could not open folder: ' + e.message)
    }
  }

  const startRecording = () => {
    setRecError('')
    const stream = getStreamTrack()
    if (!stream || stream.getAudioTracks().length === 0) {
      setRecError('No audio stream yet — load a track and start the mixer first.')
      return
    }

    const mimeType = format === 'ogg'
      ? 'audio/ogg; codecs=opus'
      : 'audio/webm; codecs=opus'
    let mr
    try {
      mr = new MediaRecorder(stream, { mimeType })
    } catch {
      try { mr = new MediaRecorder(stream) } catch (e2) {
        setRecError('MediaRecorder not supported: ' + e2.message)
        return
      }
    }

    chunksRef.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      clearInterval(timerRef.current)
      const actualMime = mr.mimeType || mimeType
      const blob = new Blob(chunksRef.current, { type: actualMime })
      const ext = actualMime.includes('ogg') ? 'ogg' : 'webm'
      const filename = `mix-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`

      if (dirHandleRef.current) {
        try {
          const fh = await dirHandleRef.current.getFileHandle(filename, { create: true })
          const writable = await fh.createWritable()
          await writable.write(blob)
          await writable.close()
        } catch {
          downloadBlob(blob, filename)
        }
      } else {
        downloadBlob(blob, filename)
      }
      setRecTime(0)
      setRecording(false)
    }

    mrRef.current = mr
    mr.start(1000)
    setRecording(true)
    setRecTime(0)
    timerRef.current = setInterval(() => setRecTime((t) => t + 1), 1000)
  }

  const stopRecording = () => {
    mrRef.current?.stop()
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 px-4 py-6 lg:px-8">
      <h1 className="text-lg font-bold text-white mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Record tab */}
      {tab === 'record' && (
        <div className="max-w-lg space-y-5">

          {/* Save Location */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Save Location</h2>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm truncate">
                  {dirName
                    ? <span className="text-gray-200">{dirName}</span>
                    : <span className="text-gray-500">No folder selected</span>}
                </div>
                {hasDirPicker && (
                  <button
                    onClick={pickFolder}
                    className="shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-sm text-gray-200 rounded-lg transition-colors"
                  >
                    Browse…
                  </button>
                )}
              </div>
              {!hasDirPicker && (
                <p className="text-xs text-amber-400 mt-2">
                  Folder picker not supported in this browser — recordings will download to your Downloads folder automatically.
                </p>
              )}
              {hasDirPicker && !dirName && (
                <p className="text-xs text-gray-500 mt-2">
                  If no folder is set, recordings download to your browser's Downloads folder.
                </p>
              )}
              {dirName && (
                <p className="text-xs text-gray-500 mt-2">
                  Folder selection resets on page refresh — click Browse to re-select.
                </p>
              )}
            </div>
          </div>

          {/* Format */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Recording Format</h2>
            </div>
            <div className="px-5 py-5 flex items-center gap-3">
              {[
                { id: 'webm', hint: 'Best compatibility' },
                { id: 'ogg',  hint: 'Open format' },
              ].map(({ id, hint }) => (
                <button
                  key={id}
                  onClick={() => { setFormat(id); localStorage.setItem('recFormat', id) }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    format === id
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {id.toUpperCase()}
                </button>
              ))}
              <span className="text-xs text-gray-500">
                {format === 'webm' ? 'Best compatibility (Chrome, Edge)' : 'Open format (Firefox)'}
              </span>
            </div>
          </div>

          {/* Record controls */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Record</h2>
            </div>
            <div className="px-5 py-5 flex items-center gap-5">
              {/* REC / STOP button */}
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  recording
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {recording
                  ? <span className="w-5 h-5 bg-white rounded-sm" />
                  : <span className="w-4 h-4 bg-red-500 rounded-full" />}
              </button>

              {/* Timer + status */}
              <div>
                <p className={`text-2xl font-mono font-bold tabular-nums leading-none ${
                  recording ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {formatTime(recTime)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {recording ? 'Recording…' : 'Ready to record'}
                </p>
              </div>

              {/* Destination hint */}
              {recording && (
                <p className="ml-auto text-xs text-gray-500 truncate max-w-40">
                  {dirHandleRef.current ? `→ ${dirName}` : '→ Downloads'}
                </p>
              )}
            </div>

            {recError && (
              <div className="px-5 pb-4">
                <p className="text-xs text-red-400">{recError}</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
