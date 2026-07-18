import { useState, useEffect, useRef } from 'react'
import { useAudioEngine } from '../context/AudioEngine'

const TABS = [
  { id: 'record', label: 'Record' },
  { id: 'monitor', label: 'Headphone / Monitor Out' },
  { id: 'mixer', label: 'Mixer Settings' },
]

const hasDirPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const GRAPHIC_EQ_BANDS = [
  { key: '31_25', label: '31.25' },
  { key: '62_5', label: '62.5' },
  { key: '125', label: '125' },
  { key: '250', label: '250' },
  { key: '500', label: '500' },
  { key: '1k', label: '1K' },
  { key: '2k', label: '2K' },
  { key: '4k', label: '4K' },
  { key: '8k', label: '8K' },
  { key: '16k', label: '16K' },
]

function defaultGraphicEq() {
  return GRAPHIC_EQ_BANDS.reduce((acc, band) => ({ ...acc, [band.key]: 0.5 }), {})
}

function dbLabel(value) {
  const dB = Math.round((value - 0.5) * 24)
  if (dB > 0) return `+${dB}`
  return `${dB}`
}

function SettingsFader({ value, onChange, label, color = '#fbbf24', height = 150, readout = 'percent' }) {
  const trackRef = useRef(null)
  const dragRef = useRef(false)

  const getVal = (clientY) => {
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, 1 - (clientY - rect.top - 8) / (rect.height - 16)))
  }

  const handlePointerDown = (e) => {
    e.preventDefault()
    trackRef.current.setPointerCapture(e.pointerId)
    dragRef.current = true
    onChange(getVal(e.clientY))
  }

  const handlePointerMove = (e) => {
    if (dragRef.current) onChange(getVal(e.clientY))
  }

  const handlePointerUp = () => {
    dragRef.current = false
  }

  const travel = height - 16
  const capH = 20
  const capBottom = 8 + value * travel - capH / 2

  return (
    <div className="flex flex-col items-center gap-2 select-none" title={label}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-[10px] font-mono text-gray-500">{readout === 'db' ? dbLabel(value) : Math.round(value * 100)}</span>
      <div
        ref={trackRef}
        className="relative w-10 cursor-pointer touch-none"
        style={{ height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="absolute left-1/2 top-2 bottom-2 w-1.5 -translate-x-1/2 rounded bg-black"
          style={{ boxShadow: 'inset 0 0 6px #000000cc, inset 0 1px 2px #000000aa' }}
        />
        <div
          className="absolute left-1/2 bottom-2 w-1.5 -translate-x-1/2 rounded-b"
          style={{
            height: `${value * travel}px`,
            background: `linear-gradient(to top, ${color}66, ${color}22)`,
          }}
        />
        <div
          className="absolute left-1/2 h-5 w-7 -translate-x-1/2 rounded bg-black/40 pointer-events-none"
          style={{ bottom: `${capBottom - 2}px` }}
        />
        <div
          className="absolute left-1/2 h-5 w-7 -translate-x-1/2 rounded pointer-events-none"
          style={{
            bottom: `${capBottom}px`,
            background: 'linear-gradient(180deg, #3f4e6a 0%, #232f46 50%, #151c2e 100%)',
            border: `1px solid ${color}55`,
            boxShadow: '0 4px 10px #00000099, inset 0 1px 0 #ffffff18',
          }}
        >
          <div className="absolute left-[15%] right-[15%] top-1/2 h-px -translate-y-1 rounded" style={{ background: `${color}77` }} />
          <div className="absolute left-[15%] right-[15%] top-1/2 h-px translate-y-1 rounded" style={{ background: `${color}44` }} />
        </div>
      </div>
    </div>
  )
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
    setMixerSettingsMode,
    getMixerSettingsMode,
    connectExternalLineIn,
    setExternalLineOutDevice,
    getExternalLineOutDevice,
    setExternalCueOutDevice,
    getExternalCueOutDevice,
    updateMasterFader,
    updateMasterEq,
    updateMasterGraphicEq,
    updateMasterOutputGain,
  } = audioEngine ?? {}

  // Format (local pref only)
  const [format, setFormat] = useState(() => localStorage.getItem('recFormat') || 'webm')
  const [recError, setRecError] = useState('')
  const [monitorDevices, setMonitorDevices] = useState([])
  const [monitorDeviceId, setMonitorDeviceId] = useState(() => localStorage.getItem('headphoneMonitorDeviceId') || '')
  const [monitorError, setMonitorError] = useState('')
  const [monitorLoading, setMonitorLoading] = useState(false)
  const monitorSupported = getHeadphoneOutputSupport?.() ?? false
  const [mixerMode, setMixerMode] = useState(() => getMixerSettingsMode?.() || localStorage.getItem('mixerSettingsMode') || 'app')
  const [masterVolume, setMasterVolume] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mixer_master') || 'null')
      return saved?.fader ?? 0.8
    } catch { return 0.8 }
  })
  const [masterEq, setMasterEq] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mixer_master_eq') || 'null') || { hi: 0.5, mid: 0.5, lo: 0.5 }
    } catch { return { hi: 0.5, mid: 0.5, lo: 0.5 } }
  })
  const [graphicEq, setGraphicEq] = useState(() => {
    try {
      return { ...defaultGraphicEq(), ...(JSON.parse(localStorage.getItem('mixer_graphic_eq') || 'null') || {}) }
    } catch { return defaultGraphicEq() }
  })
  const [outputGain, setOutputGain] = useState(() => Number(localStorage.getItem('mixer_output_gain') || '0.5'))
  const [mixerInputDevices, setMixerInputDevices] = useState([])
  const [mixerOutputDevices, setMixerOutputDevices] = useState([])
  const [lineInDeviceId, setLineInDeviceId] = useState(() => localStorage.getItem('externalMixerLineInDeviceId') || '')
  const [lineOutDeviceId, setLineOutDeviceId] = useState(() => localStorage.getItem('externalMixerLineOutDeviceId') || '')
  const [cueOutDeviceId, setCueOutDeviceId] = useState(() => localStorage.getItem('externalMixerCueOutDeviceId') || '')
  const [mixerError, setMixerError] = useState('')
  const [mixerLoading, setMixerLoading] = useState(false)
  const connectedLineInRef = useRef('')

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

  const refreshMixerDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const devices = await navigator.mediaDevices.enumerateDevices()
    setMixerInputDevices(devices.filter((d) => d.kind === 'audioinput' && d.deviceId))
    setMixerOutputDevices(devices.filter((d) => d.kind === 'audiooutput' && d.deviceId))
    setLineOutDeviceId(getExternalLineOutDevice?.() || localStorage.getItem('externalMixerLineOutDeviceId') || '')
    setCueOutDeviceId(getExternalCueOutDevice?.() || localStorage.getItem('externalMixerCueOutDeviceId') || '')
  }

  useEffect(() => {
    refreshMonitorDevices().catch(() => {})
    refreshMixerDevices().catch(() => {})
    const handler = () => refreshMonitorDevices().catch(() => {})
    const mixerHandler = () => refreshMixerDevices().catch(() => {})
    navigator.mediaDevices?.addEventListener?.('devicechange', handler)
    navigator.mediaDevices?.addEventListener?.('devicechange', mixerHandler)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handler)
      navigator.mediaDevices?.removeEventListener?.('devicechange', mixerHandler)
    }
  }, [getHeadphoneOutputDevice, getExternalLineOutDevice, getExternalCueOutDevice])

  useEffect(() => {
    setMixerSettingsMode?.(mixerMode)
  }, [mixerMode, setMixerSettingsMode])

  useEffect(() => {
    updateMasterFader?.(masterVolume)
  }, [masterVolume, updateMasterFader])

  useEffect(() => {
    updateMasterEq?.('hi', masterEq.hi)
    updateMasterEq?.('mid', masterEq.mid)
    updateMasterEq?.('lo', masterEq.lo)
  }, [masterEq, updateMasterEq])

  useEffect(() => {
    GRAPHIC_EQ_BANDS.forEach(({ key }) => updateMasterGraphicEq?.(key, graphicEq[key]))
  }, [graphicEq, updateMasterGraphicEq])

  useEffect(() => {
    updateMasterOutputGain?.(outputGain)
  }, [outputGain, updateMasterOutputGain])

  useEffect(() => {
    if (mixerMode !== 'external' || !lineInDeviceId || mixerInputDevices.length === 0) return

    const savedLabel = localStorage.getItem('externalMixerLineInDeviceLabel') || ''
    const savedDevice = mixerInputDevices.find((device) => device.deviceId === lineInDeviceId)
      || (savedLabel ? mixerInputDevices.find((device) => device.label === savedLabel) : null)

    // Browsers can assign a new device ID after permissions or browser data
    // change. Recover the same physical input by its saved label when possible.
    if (!savedDevice) {
      connectedLineInRef.current = ''
      return
    }

    const deviceId = savedDevice.deviceId
    if (deviceId !== lineInDeviceId) {
      localStorage.setItem('externalMixerLineInDeviceId', deviceId)
      queueMicrotask(() => setLineInDeviceId(deviceId))
      return
    }
    if (connectedLineInRef.current === deviceId) return

    connectedLineInRef.current = deviceId
    connectExternalLineIn?.(deviceId).then((result) => {
      if (result?.ok) {
        setMixerError('')
        return
      }
      // Do not leave a failed startup attempt marked as connected. A later
      // devicechange event or user interaction can now retry it.
      connectedLineInRef.current = ''
      setMixerError('Could not reconnect the saved line-in source. Allow microphone access or click the page, then try again.')
    })
  }, [mixerMode, lineInDeviceId, mixerInputDevices, connectExternalLineIn])

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

  const unlockMixerDeviceLabels = async () => {
    setMixerError('')
    setMixerLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      await refreshMixerDevices()
    } catch {
      setMixerError('Microphone permission is needed before the browser will show full device names.')
    } finally {
      setMixerLoading(false)
    }
  }

  const handleMixerModeChange = (mode) => {
    setMixerMode(mode)
    localStorage.setItem('mixerSettingsMode', mode)
  }

  const handleMasterVolumeChange = (value) => {
    const nextValue = Number(value)
    setMasterVolume(nextValue)
    try {
      const saved = JSON.parse(localStorage.getItem('mixer_master') || 'null') || {}
      localStorage.setItem('mixer_master', JSON.stringify({ ...saved, fader: nextValue }))
    } catch {
      // localStorage can fail in private browsing; the live engine value still updates.
    }
  }

  const handleGraphicEqChange = (band, value) => {
    const nextValue = Number(value)
    setGraphicEq((prev) => {
      const next = { ...prev, [band]: nextValue }
      localStorage.setItem('mixer_graphic_eq', JSON.stringify(next))
      return next
    })
  }

  const handleOutputGainChange = (value) => {
    const nextValue = Number(value)
    setOutputGain(nextValue)
    localStorage.setItem('mixer_output_gain', String(nextValue))
  }

  const handleLineInChange = async (deviceId) => {
    setMixerError('')
    setLineInDeviceId(deviceId)
    connectedLineInRef.current = deviceId
    const selected = mixerInputDevices.find((device) => device.deviceId === deviceId)
    if (selected?.label) localStorage.setItem('externalMixerLineInDeviceLabel', selected.label)
    const result = await connectExternalLineIn?.(deviceId)
    if (!result?.ok) {
      connectedLineInRef.current = ''
      setMixerError('Could not connect the selected line-in source. Check browser permissions and device availability.')
      setLineInDeviceId(localStorage.getItem('externalMixerLineInDeviceId') || '')
    }
  }

  const handleLineOutChange = async (deviceId) => {
    setMixerError('')
    setLineOutDeviceId(deviceId)
    const result = await setExternalLineOutDevice?.(deviceId)
    if (!result?.ok) {
      setMixerError(
        result?.reason === 'unsupported'
          ? 'This browser cannot choose a separate line-out device.'
          : 'Could not switch line-out. Check browser permissions and device availability.'
      )
      setLineOutDeviceId(getExternalLineOutDevice?.() || '')
    }
  }

  const handleCueOutChange = async (deviceId) => {
    setMixerError('')
    setCueOutDeviceId(deviceId)
    const result = await setExternalCueOutDevice?.(deviceId)
    if (!result?.ok) {
      setMixerError(
        result?.reason === 'unsupported'
          ? 'This browser cannot choose a separate cue-out device.'
          : 'Could not switch cue-out. Check browser permissions and device availability.'
      )
      setCueOutDeviceId(getExternalCueOutDevice?.() || '')
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
                  disabled={!monitorSupported || mixerMode === 'external'}
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
                  disabled={mixerMode === 'external'}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-sm text-gray-300 rounded-lg transition-colors"
                >
                  Refresh Devices
                </button>
                <button
                  onClick={unlockMonitorLabels}
                  disabled={monitorLoading || mixerMode === 'external' || !navigator.mediaDevices?.getUserMedia}
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
              {mixerMode === 'external' && (
                <p className="text-xs text-amber-400">
                  Headphone output is inactive while External Mixer mode is on. Use Mixer Settings → External Mixer → Cue Out Destination instead.
                </p>
              )}
              {monitorError && <p className="text-xs text-red-400">{monitorError}</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'mixer' && (
        <div className="w-full max-w-6xl space-y-5">
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Mixer Mode</h2>
            </div>
            <div className="px-5 py-5">
              <div className="inline-flex rounded-lg border border-gray-700 bg-gray-950 p-1">
                {[
                  { id: 'app', label: 'App Mixer' },
                  { id: 'external', label: 'External Mixer' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleMixerModeChange(id)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      mixerMode === id
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                App Mixer sends the in-app mix to the stream. External Mixer sends the selected line-in source to the stream and sends the app mix to the selected line-out.
              </p>
            </div>
          </div>

          {mixerMode === 'app' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-200">App Mixer Graphic EQ</h2>
              </div>
              <div className="px-5 py-5 overflow-x-auto">
                <div className="inline-flex min-w-[980px] items-end justify-between gap-6 rounded-xl border border-gray-800 bg-gray-100 px-6 py-5 text-gray-950">
                  <div className="flex flex-col items-center">
                    <SettingsFader
                      value={masterVolume}
                      onChange={handleMasterVolumeChange}
                      label="VOL"
                      color="#2563eb"
                      height={165}
                    />
                  </div>

                  {GRAPHIC_EQ_BANDS.map(({ key, label }) => (
                    <SettingsFader
                      key={key}
                      label={label}
                      color="#2563eb"
                      height={165}
                      readout="db"
                      value={graphicEq[key]}
                      onChange={(value) => handleGraphicEqChange(key, value)}
                    />
                  ))}

                  <SettingsFader
                    value={outputGain}
                    onChange={handleOutputGainChange}
                    label="GAIN"
                    color="#2563eb"
                    height={165}
                    readout="db"
                  />

                  <div className="flex h-[165px] flex-col justify-between pb-3 pt-10 text-xs font-bold text-gray-700">
                    <span>+12</span>
                    <span>+6</span>
                    <span>0</span>
                    <span>-6</span>
                    <span>-12</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mixerMode === 'external' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-200">External Mixer Routing</h2>
              </div>
              <div className="px-5 py-5 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Line In Source
                  </label>
                  <select
                    value={lineInDeviceId}
                    onChange={(e) => handleLineInChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="">Select input device</option>
                    {mixerInputDevices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Input ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    This is where the audio is coming from. In External Mixer mode, this source is sent to the stream.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Line Out Destination
                  </label>
                  <select
                    value={lineOutDeviceId}
                    disabled={!monitorSupported}
                    onChange={(e) => handleLineOutChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 disabled:opacity-50 focus:outline-none focus:border-red-500"
                  >
                    <option value="">System default output</option>
                    {mixerOutputDevices
                      .filter((device) => device.deviceId && device.deviceId !== 'default')
                      .map((device, idx) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Output ${idx + 1}`}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    This is where the app mixer audio is sent out, for example into a USB mixer or audio interface.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Cue Out Destination
                  </label>
                  <select
                    value={cueOutDeviceId}
                    disabled={!monitorSupported}
                    onChange={(e) => handleCueOutChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 disabled:opacity-50 focus:outline-none focus:border-red-500"
                  >
                    <option value="">System default output</option>
                    {mixerOutputDevices
                      .filter((device) => device.deviceId && device.deviceId !== 'default')
                      .map((device, idx) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Output ${idx + 1}`}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    This sends cue/PFL audio to a separate external mixer channel while External Mixer mode is on.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => refreshMixerDevices().catch(() => setMixerError('Could not refresh mixer devices.'))}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 rounded-lg transition-colors"
                  >
                    Refresh Devices
                  </button>
                  <button
                    onClick={unlockMixerDeviceLabels}
                    disabled={mixerLoading || !navigator.mediaDevices?.getUserMedia}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-sm text-gray-300 rounded-lg transition-colors"
                  >
                    {mixerLoading ? 'Checking...' : 'Show Device Names'}
                  </button>
                </div>

                {!monitorSupported && (
                  <p className="text-xs text-amber-400">
                    Your browser does not support selecting a separate line-out device. Chrome or Edge is recommended for external mixer output routing.
                  </p>
                )}
                {mixerError && <p className="text-xs text-red-400">{mixerError}</p>}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
