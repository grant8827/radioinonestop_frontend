import { useState, useEffect } from 'react'
import { useAudioEngine } from '../context/AudioEngine'

const TABS = [
  { id: 'record', label: 'Record' },
  { id: 'monitor', label: 'Headphone / Monitor Out' },
]

const hasDirPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function SettingsPage() {
  const [tab, setTab] = useState('record')
  const audioEngine = useAudioEngine()
  const {
    recording,
    recTime,
    recDirName,
    setRecDirHandle,
    clearRecDirHandle,
    startRec,
    stopRec,
    getHeadphoneOutputSupport,
    setHeadphoneOutputDevice,
    getHeadphoneOutputDevice,
  } = audioEngine ?? {}

  // Format (local pref only)
  const [format, setFormat] = useState(() => localStorage.getItem('recFormat') || 'webm')
  const [recError, setRecError] = useState('')
  const [monitorDevices, setMonitorDevices] = useState([])
  const [monitorDeviceId, setMonitorDeviceId] = useState(() => localStorage.getItem('headphoneMonitorDeviceId') || '')
  const [monitorError, setMonitorError] = useState('')
  const [monitorLoading, setMonitorLoading] = useState(false)
  const monitorSupported = getHeadphoneOutputSupport?.() ?? false

  // Listen for open-settings-record event dispatched by the Mixer nudge
  useEffect(() => {
    const handler = () => setTab('record')
    document.addEventListener('open-settings-record', handler)
    return () => document.removeEventListener('open-settings-record', handler)
  }, [])

  // Listen for rec-error events from Mixer
  useEffect(() => {
    const handler = (e) => setRecError(e.detail || 'Recording error')
    document.addEventListener('rec-error', handler)
    return () => document.removeEventListener('rec-error', handler)
  }, [])

  const refreshMonitorDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const devices = await navigator.mediaDevices.enumerateDevices()
    setMonitorDevices(devices.filter((d) => d.kind === 'audiooutput'))
    setMonitorDeviceId(getHeadphoneOutputDevice?.() || '')
  }

  useEffect(() => {
    refreshMonitorDevices().catch(() => {})
    const handler = () => refreshMonitorDevices().catch(() => {})
    navigator.mediaDevices?.addEventListener?.('devicechange', handler)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler)
  }, [getHeadphoneOutputDevice])

  const pickFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      setRecDirHandle?.(handle)
      setRecError('')
    } catch (e) {
      if (e.name !== 'AbortError') setRecError('Could not open folder: ' + e.message)
    }
  }

  const handleRecToggle = () => {
    setRecError('')
    if (recording) {
      stopRec?.()
      return
    }
    const result = startRec?.(format)
    if (result === 'no-stream') setRecError('No audio stream yet — load a track and start the mixer first.')
    else if (result === 'unsupported') setRecError('MediaRecorder not supported in this browser.')
  }

  const handleMonitorDeviceChange = async (deviceId) => {
    setMonitorError('')
    setMonitorDeviceId(deviceId)
    const result = await setHeadphoneOutputDevice?.(deviceId)
    if (!result?.ok) {
      setMonitorError(
        result?.reason === 'unsupported'
          ? 'This browser cannot choose a separate headphone output.'
          : 'Could not switch headphone output. Check browser permissions and device availability.'
      )
      setMonitorDeviceId(getHeadphoneOutputDevice?.() || '')
    }
  }

  const unlockMonitorLabels = async () => {
    setMonitorError('')
    setMonitorLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      await refreshMonitorDevices()
    } catch {
      setMonitorError('Microphone permission is needed before the browser will show full device names.')
    } finally {
      setMonitorLoading(false)
    }
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
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              tab === id
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {label}
            {id === 'record' && recording && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-600/20 border border-red-600/40 text-red-400 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                Live
              </span>
            )}
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
                  {recDirName
                    ? <span className="text-gray-200">{recDirName}</span>
                    : <span className="text-gray-500">No folder selected</span>}
                </div>
                {hasDirPicker && (
                  <button
                    onClick={pickFolder}
                    disabled={recording}
                    className="shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 border border-gray-600 text-sm text-gray-200 rounded-lg transition-colors"
                  >
                    Browse…
                  </button>
                )}
                {hasDirPicker && recDirName && !recording && (
                  <button
                    onClick={clearRecDirHandle}
                    className="shrink-0 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-400 rounded-lg transition-colors"
                    title="Clear folder"
                  >
                    ✕
                  </button>
                )}
              </div>
              {!hasDirPicker && (
                <p className="text-xs text-amber-400 mt-2">
                  Folder picker not supported in this browser — recordings will download to your Downloads folder automatically.
                </p>
              )}
              {hasDirPicker && !recDirName && (
                <p className="text-xs text-gray-500 mt-2">
                  Select a folder so recordings save automatically. Without one they'll download to your browser's Downloads folder.
                </p>
              )}
              {recDirName && (
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
                  disabled={recording}
                  onClick={() => { setFormat(id); localStorage.setItem('recFormat', id) }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-40 ${
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
          <div className={`bg-gray-900 rounded-xl border overflow-hidden transition-colors ${
            recording ? 'border-red-800/60' : 'border-gray-800'
          }`}>
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Record</h2>
              {recording && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  RECORDING LIVE
                  {recDirName && <span className="font-normal text-gray-500 ml-1">→ {recDirName}</span>}
                </span>
              )}
            </div>
            <div className="px-5 py-5 flex items-center gap-5">
              {/* REC / STOP button */}
              <button
                onClick={handleRecToggle}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  recording
                    ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_#ef444440]'
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
                  {formatTime(recTime ?? 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {recording ? 'Recording in progress…' : recDirName ? `Ready · saves to ${recDirName}` : 'Ready · will download when stopped'}
                </p>
              </div>
            </div>

            {recError && (
              <div className="px-5 pb-4">
                <p className="text-xs text-red-400">{recError}</p>
              </div>
            )}
          </div>

        </div>
      )}

      {tab === 'monitor' && (
        <div className="max-w-lg space-y-5">
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Headphone Output</h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Monitor Device
                </label>
                <select
                  value={monitorDeviceId}
                  disabled={!monitorSupported}
                  onChange={(e) => handleMonitorDeviceChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 disabled:opacity-50 focus:outline-none focus:border-red-500"
                >
                  <option value="">System default output</option>
                  {monitorDevices
                    .filter((device) => device.deviceId && device.deviceId !== 'default')
                    .map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Output ${idx + 1}`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => refreshMonitorDevices().catch(() => setMonitorError('Could not refresh output devices.'))}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 rounded-lg transition-colors"
                >
                  Refresh Devices
                </button>
                <button
                  onClick={unlockMonitorLabels}
                  disabled={monitorLoading || !navigator.mediaDevices?.getUserMedia}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-sm text-gray-300 rounded-lg transition-colors"
                >
                  {monitorLoading ? 'Checking...' : 'Show Device Names'}
                </button>
              </div>

              {!monitorSupported && (
                <p className="text-xs text-amber-400">
                  Your browser does not support selecting a separate headphone output. Chrome or Edge is recommended for this feature.
                </p>
              )}
              {monitorSupported && (
                <p className="text-xs text-gray-500">
                  This changes only the local headphone/cue monitor path. The stream, recording, mixer channels, and Auto DJ output stay on the main mix.
                </p>
              )}
              {monitorError && <p className="text-xs text-red-400">{monitorError}</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
