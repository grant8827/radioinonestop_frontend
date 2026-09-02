import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudioEngine } from '../context/AudioEngine'
import { useStream } from '../context/StreamContext'
import ListenersPage from './ListenersPage'

const ENCODER_WS_URL = import.meta.env.VITE_ENCODER_WS_URL || 'wss://stream.radioinonestop.com/ws/encode'

const PLAN_AUDIO_BITRATES = {
  starter: ['96k'],
  professional: ['96k', '128k'],
  enterprise: ['96k', '128k', '192k'],
  ultimate: ['96k', '128k', '192k', '320k'],
}

function audioBitratesForPlan(plan) {
  return PLAN_AUDIO_BITRATES[plan] || PLAN_AUDIO_BITRATES.starter
}

/* ─── Shared helpers ──────────────────────────────────────────── */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
        <code className="flex-1 text-sm text-green-400 font-mono truncate select-all">{value}</code>
        <CopyButton text={value} />
      </div>
    </div>
  )
}

/* Inline audio-only listener used to preview the station's Hub stream. */
function LiveListenerPlayer({ listenPath }) {
  const listenUrl = new URL(listenPath, window.location.origin).toString()
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  function toggle() {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      setPlaying(false)
      return
    }

    audio.src = listenUrl
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  useEffect(() => () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
  }, [])

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Live Station Stream</p>
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-colors ${playing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          aria-label={playing ? 'Stop listening' : 'Listen live'}
        >
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d={playing ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'} />
          </svg>
        </button>
        <code className="flex-1 text-sm text-green-400 font-mono truncate select-all">{listenUrl}</code>
        <CopyButton text={listenUrl} />
        <a href={listenUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white">
          Open
        </a>
      </div>
      {playing && <p className="mt-1.5 text-xs text-orange-400 animate-pulse">● Listening live</p>}
      <audio ref={audioRef} preload="none" />
    </div>
  )
}

function useStreamDashboard(token) {
  const [liveStreams, setLiveStreams] = useState([])
  const [viewers, setViewers] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const [sRes, analyticsRes] = await Promise.all([
          fetch('/api/streams'),
          token
            ? fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } })
            : Promise.resolve(null),
        ])
        if (!cancelled) {
          if (sRes.ok) setLiveStreams(await sRes.json())
          if (analyticsRes?.ok) {
            const analytics = await analyticsRes.json()
            setViewers(analytics.live_count ?? 0)
          } else {
            setViewers(0)
          }
        }
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [token])

  return { liveStreams, viewers }
}

function calcUptime(startedAt) {
  if (!startedAt) return '--'
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function DashboardCard({ label, colorClass, iconPath, stream, viewers }) {
  const live = stream?.live ?? false
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 flex flex-col gap-3 ${live ? 'border-gray-700' : 'border-gray-800'}`}>
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d={iconPath} /></svg>
        </span>
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className={`ml-auto flex items-center gap-1.5 text-[10px] font-bold border rounded px-2 py-0.5 ${live ? 'text-green-400 bg-green-900/30 border-green-700/40' : 'text-gray-500 bg-gray-800/50 border-gray-700/40'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          {live ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800/70 rounded-lg px-3 py-2">
          <div className="text-gray-500 mb-0.5">Uptime</div>
          <div className="text-white font-mono font-semibold">{live ? calcUptime(stream.startedAt) : '--'}</div>
        </div>
        {viewers !== undefined ? (
          <div className="bg-gray-800/70 rounded-lg px-3 py-2">
            <div className="text-gray-500 mb-0.5">Listeners</div>
            <div className="text-white font-mono font-semibold">{viewers}</div>
          </div>
        ) : (
          <div className="bg-gray-800/70 rounded-lg px-3 py-2">
            <div className="text-gray-500 mb-0.5">Key</div>
            <div className="text-green-400 font-mono font-semibold truncate">{stream?.key ?? '--'}</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Tab content ─────────────────────────────────────────────── */

function StreamSettingsTab({ audioKey, liveStreams, viewers, creds }) {
  const { user } = useAuth()
  const { broadcastMode } = useStream()
  const allowedBitrates = audioBitratesForPlan(user?.plan)
  const defaultBitrate = allowedBitrates[allowedBitrates.length - 1]
  const audioStream = liveStreams.find(s => s.key === audioKey)
  const anyLive = liveStreams.some(s => s.live)
  const otherStreams = liveStreams.filter(s => s.key !== audioKey)
  const hubListenPath = creds?.hub_listen_url || creds?.listen_url || ''
  const hubListenUrl = hubListenPath ? new URL(hubListenPath, window.location.origin).toString() : ''
  const icecastHost = 'stream.radioinonestop.com'
  const icecastPort = creds?.icecast_port || '8000'
  const icecastMount = creds?.stream_key || audioKey
  // RadioBOSS must pull directly from DigitalOcean so its connection does not
  // pass through Railway's 15-minute HTTP request limit.
  const radioBossListenUrl = icecastMount
    ? `https://${icecastHost}/${icecastMount}`
    : ''
  const [encoderSettings, setEncoderSettings] = useState({
    host: '',
    port: '8000',
    mount: `/${audioKey}`,
    username: 'source',
    password: '',
    codec: 'mp3',
    bitrate: defaultBitrate,
  })

  useEffect(() => {
    const loadEncoderSettings = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('icecast_encoder_cfg') || '{}')
        setEncoderSettings({
          host: saved.host || '',
          port: saved.port || '8000',
          mount: saved.mount || `/${audioKey}`,
          username: saved.username || 'source',
          password: saved.password || '',
          codec: saved.codec || 'mp3',
          bitrate: allowedBitrates.includes(saved.bitrate) ? saved.bitrate : defaultBitrate,
        })
      } catch {
        setEncoderSettings({ host: '', port: '8000', mount: `/${audioKey}`, username: 'source', password: '', codec: 'mp3', bitrate: defaultBitrate })
      }
    }
    loadEncoderSettings()
    window.addEventListener('radio-encoder-config-saved', loadEncoderSettings)
    return () => window.removeEventListener('radio-encoder-config-saved', loadEncoderSettings)
  }, [audioKey, defaultBitrate])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Dashboard</span>
          <span className={`flex items-center gap-1.5 text-[10px] font-bold border rounded px-2 py-0.5 ${anyLive ? 'text-green-400 bg-green-900/20 border-green-700/40' : 'text-gray-500 bg-gray-800/50 border-gray-700/40'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${anyLive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            {anyLive ? 'ON AIR' : 'IDLE'}
          </span>
          <span className="ml-auto text-xs text-gray-600">auto-refresh 5s</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <DashboardCard
            label="Audio Stream"
            colorClass="bg-red-600/20 border-red-500/30 text-red-400"
            iconPath="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H5.02L16.89 2.37 16.26.91 3.24 6.15zM12 18c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8H6V8h12v2z"
            stream={audioStream}
            viewers={viewers}
          />
        </div>
        {otherStreams.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {otherStreams.map(s => (
              <div key={s.key} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.live ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                <code className="text-xs text-green-400 font-mono truncate">{s.key}</code>
                <span className="ml-auto text-[10px] text-gray-500">{s.live ? 'live' : 'off'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-800/60 to-gray-900 border-b border-gray-800">
          <span className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.25h.008v.008H12v-.008z" />
            </svg>
          </span>
          <div>
            <h3 className="font-semibold text-white text-sm">Radio Listener Links</h3>
            <p className="text-xs text-gray-400">The working links for the current radio broadcast modes</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {creds && (
            <>
              {radioBossListenUrl && (
                <div className="rounded-lg border border-green-700/50 bg-green-950/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded bg-green-600/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
                      Recommended
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wider text-green-300">
                      RadioBOSS pull URL (MP3 / Icecast)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-green-800/60 bg-gray-950 px-3 py-2">
                    <code className="flex-1 truncate font-mono text-sm text-green-400 select-all">{radioBossListenUrl}</code>
                    <CopyButton text={radioBossListenUrl} />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Copy this URL into RadioBOSS as an internet stream. Do not use the Station Hub URL in RadioBOSS.
                  </p>
                </div>
              )}
              {hubListenUrl && <Field label="Browser player only — do not use in RadioBOSS" value={hubListenUrl} />}
              {hubListenPath && <LiveListenerPlayer listenPath={hubListenPath} />}
            </>
          )}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3 text-sm text-gray-400">
            The RadioBOSS URL becomes playable after the Icecast encoder is live. The Station Hub link uses WebM
            and is intended only for Hub-mode browser listening.
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Audio Encoder Settings</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-4">
          <Field label="Broadcast Mode" value={broadcastMode === 'icecast' ? 'Icecast' : 'Station Hub'} />
          <Field label="Host" value={icecastHost} />
          <Field label="Port" value={icecastPort} />
          <Field label="Mount Point" value={`/${creds?.stream_key || audioKey}`} />
          <Field label="Username" value={creds?.icecast_username || encoderSettings.username || 'source'} />
          <Field label="Source Password" value={creds?.source_password || encoderSettings.password || 'Not available'} />
          <Field label="Output Codec" value={encoderSettings.codec.toUpperCase()} />
          <Field label="Bitrate" value={encoderSettings.bitrate.replace(/k$/i, ' kbps')} />
          <Field label="Sample Rate" value="44.1 kHz" />
          <Field label="Channels" value="Stereo (2 channels)" />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Station Identity</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {creds ? (
            <>
              {creds.station_slug && <Field label="Station ID" value={creds.station_slug} />}
              <Field label="Audio Stream Key" value={creds.stream_key} />
            </>
          ) : (
            <p className="text-xs text-gray-500 py-2">Sign in to view your station details</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Browser broadcaster (WebRTC WHIP) ──────────────────────── */

function BrowserStreamer({ audioKey }) {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [level, setLevel] = useState(0)

  const pcRef = useRef(null)
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const animRef = useRef(null)
  const statusRef = useRef('idle')

  function setStatusSync(s) { setStatus(s); statusRef.current = s }

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      const mics = devs.filter(d => d.kind === 'audioinput')
      setDevices(mics)
      if (mics.length > 0) setSelectedDevice(mics[0].deviceId)
    }).catch(() => {})
  }, [])

  function drawMeter() {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    setLevel(Math.min(100, (avg / 128) * 100))
    animRef.current = requestAnimationFrame(drawMeter)
  }

  function cleanup() {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    analyserRef.current = null
    setLevel(0)
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }

  async function startStream() {
    try {
      setStatusSync('requesting')
      setErrorMsg('')

      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        ...(selectedDevice ? { deviceId: { exact: selectedDevice } } : {}),
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      streamRef.current = stream

      // Level meter
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        analyserRef.current = analyser
        drawMeter()
      } catch (_) {}

      setStatusSync('connecting')

      const pc = new RTCPeerConnection({ iceServers: [] })
      pcRef.current = pc
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering to finish
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('ICE gathering timed out')), 10000)
        if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); return }
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve() }
        })
      })

      const res = await fetch(`/webrtc/${audioKey}/whip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription.sdp,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Server returned ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`)
      }

      const answerSdp = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatusSync('error')
          setErrorMsg('WebRTC connection lost')
          cleanup()
        }
      })

      setStatusSync('live')
    } catch (err) {
      setStatusSync('error')
      setErrorMsg(err.message)
      cleanup()
    }
  }

  function stopStream() {
    cleanup()
    setStatusSync('stopped')
  }

  // cleanup on unmount
  useEffect(() => () => cleanup(), [])

  const isLive = status === 'live'
  const isBusy = status === 'requesting' || status === 'connecting'
  const canStart = status === 'idle' || status === 'stopped' || status === 'error'
  const BAR_COUNT = 24
  const activeCount = Math.round((level / 100) * BAR_COUNT)

  const statusLabel = isLive ? 'LIVE' : isBusy
    ? (status === 'requesting' ? 'MIC REQUEST' : 'CONNECTING')
    : status === 'error' ? 'ERROR'
    : status === 'stopped' ? 'STOPPED'
    : 'IDLE'

  const statusClass = isLive
    ? 'text-green-400 bg-green-900/30 border-green-700/40'
    : isBusy
    ? 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40'
    : status === 'error'
    ? 'text-red-400 bg-red-900/30 border-red-700/40'
    : 'text-gray-500 bg-gray-800/50 border-gray-700/40'

  return (
    <div className="bg-red-950/20 border border-red-800/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-red-900/20 to-transparent border-b border-red-800/30">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
          isLive ? 'bg-red-400 animate-pulse' : isBusy ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
        }`} />
        <span className="text-sm font-semibold text-white">Browser Broadcaster</span>
        <span className={`ml-auto text-[10px] font-bold border rounded px-2 py-0.5 ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Mic selector */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Microphone Input</p>
          <select
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
            disabled={!canStart}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500 disabled:opacity-50 cursor-pointer"
          >
            {devices.length === 0 && <option value="">No microphone found</option>}
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Level meter */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Audio Level</p>
          <div className="flex gap-0.5 h-5">
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const active = i < activeCount
              const isHot = i >= BAR_COUNT * 0.85
              const isMid = i >= BAR_COUNT * 0.65
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-all duration-75 ${
                    active
                      ? isHot ? 'bg-red-500' : isMid ? 'bg-yellow-500' : 'bg-green-500'
                      : 'bg-gray-800'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Error message */}
        {status === 'error' && errorMsg && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-2.5 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Start / Stop */}
        {canStart ? (
          <button
            onClick={startStream}
            disabled={devices.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            Go Live from Browser
          </button>
        ) : (
          <button
            onClick={stopStream}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors"
          >
            Stop Broadcast
          </button>
        )}

        <p className="text-xs text-gray-500">
          Publishes mic audio via WebRTC → your server → HLS at{' '}
          <code className="text-green-400 font-mono">/hls/{audioKey}/index.m3u8</code>.
          Microphone only (no system audio). Cannot run at the same time as OBS on the same stream key.
        </p>
      </div>
    </div>
  )
}

/* ─── Icecast / Shoutcast browser encoder ────────────────────── */

function IcecastEncoder({ defaultHost = '', defaultMount = '/radio', listenUrl = '', isSuspended = false }) {
  const { token, user } = useAuth()
  const allowedBitrates = audioBitratesForPlan(user?.plan)
  const defaultBitrate = allowedBitrates[allowedBitrates.length - 1]
  const { getStreamTrack, getStreamAnalyser, resume } = useAudioEngine()
  const { radioStatus, radioError, startRadio, stopRadio,
          broadcastMode, setBroadcastMode,
          setIcecastStatus, icecastError, setIcecastError, icecastStartRef, icecastStopRef } = useStream()

  // 'hub' = broadcast directly to this server's fan-out hub (no Icecast needed)
  // 'icecast' = legacy path: server transcodes via ffmpeg and pushes to Icecast
  // broadcastMode is shared via StreamContext so NowPlaying's GO LIVE button can trigger it.

  const [cfg, setCfg] = useState(() => {
    try {
      const saved = localStorage.getItem('icecast_encoder_cfg')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          host: defaultHost,
          port: '8000',
          mount: defaultMount,
          username: 'source',
          password: '',
          ...parsed,
          codec: 'mp3',
          bitrate: allowedBitrates.includes(parsed.bitrate) ? parsed.bitrate : defaultBitrate,
        }
      }
    } catch {}
    return { host: defaultHost, port: '8000', mount: defaultMount, username: 'source', password: '', codec: 'mp3', bitrate: defaultBitrate }
  })

  useEffect(() => {
    setCfg(current => allowedBitrates.includes(current.bitrate)
      ? current
      : { ...current, bitrate: defaultBitrate })
  }, [defaultBitrate, user?.plan])

  const [cfgSaved, setCfgSaved] = useState(false)
  function saveConfig() {
    try {
      localStorage.setItem('icecast_encoder_cfg', JSON.stringify(cfg))
      window.dispatchEvent(new Event('radio-encoder-config-saved'))
    } catch {}
    setCfgSaved(true)
    setTimeout(() => setCfgSaved(false), 1500)
  }

  // Sync host from prop when it becomes available (e.g. after login)
  const prevDefaultHost = useRef('')
  useEffect(() => {
    if (defaultHost && defaultHost !== prevDefaultHost.current) {
      const old = prevDefaultHost.current
      prevDefaultHost.current = defaultHost
      // Only overwrite if the user hasn't manually typed something different
      setCfg(p => (p.host === '' || p.host === old) ? { ...p, host: defaultHost } : p)
    }
  }, [defaultHost])

  // Sync mount from prop when it becomes available (e.g. after credentials load)
  const prevDefaultMount = useRef('/radio')
  useEffect(() => {
    if (defaultMount && defaultMount !== prevDefaultMount.current) {
      const old = prevDefaultMount.current
      prevDefaultMount.current = defaultMount
      setCfg(p => (p.mount === '/radio' || p.mount === old) ? { ...p, mount: defaultMount } : p)
    }
  }, [defaultMount])

  // For hub mode the source-of-truth lives in StreamContext (shared with NowPlaying button).
  // For icecast mode we use local state as before.
  const [localStatus, setLocalStatus] = useState('idle') // idle | requesting | connecting | live | stopped | error
  const status = broadcastMode === 'hub' ? radioStatus : localStatus
  const [logs, setLogs] = useState([])

  const wsRef = useRef(null)
  const recorderRef = useRef(null)
  const keepaliveRef = useRef(null)
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const statusRef = useRef('idle')
  const logsEndRef = useRef(null)
  const terminalErrorRef = useRef(false)
  const reconnectTimerRef = useRef(null)
  const connectionAttemptRef = useRef(0)
  const manualStopRef = useRef(false)
  const wakeLockRef = useRef(null)
  const lastHubErrorRef = useRef('')

  function setStatusBoth(s) {
    if (broadcastMode === 'hub') {
      // hub state lives in StreamContext; only keep statusRef in sync for local guards
      statusRef.current = s
    } else {
      setLocalStatus(s)
      setIcecastStatus(s) // sync to context so NowPlaying can reflect it
      statusRef.current = s
    }
  }

  function addLog(msg) {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [...prev.slice(-199), { t, msg }])
  }

  // Auto-scroll the console log
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  // Cleanup on unmount without allowing the close event to schedule a reconnect.
  useEffect(() => () => {
    manualStopRef.current = true
    connectionAttemptRef.current += 1
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    doCleanup()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-acquire the wake lock if the OS released it (e.g. screen locked then
  // unlocked) while we're still supposed to be broadcasting.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (statusRef.current === 'live' && 'wakeLock' in navigator && !wakeLockRef.current) {
        navigator.wakeLock.request('screen')
          .then(lock => { wakeLockRef.current = lock })
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Register start/stop handlers into context so NowPlaying's GO LIVE button works.
  // No deps: runs every render so the refs always point to the latest closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (icecastStartRef) icecastStartRef.current = () => { if (broadcastMode === 'icecast') goLive() }
    if (icecastStopRef)  icecastStopRef.current  = () => stopStream()
  })

  // When hub broadcast goes live from NowPlaying button, start spectrum here too
  useEffect(() => {
    if (broadcastMode !== 'hub') return
    statusRef.current = radioStatus
    if (radioStatus === 'live') {
      const streamAnalyser = getStreamAnalyser()
      if (streamAnalyser) { analyserRef.current = streamAnalyser; drawSpectrum() }
      addLog('🔴 Hub broadcast active')
      lastHubErrorRef.current = ''
    } else if (radioStatus === 'error' && radioError && radioError !== lastHubErrorRef.current) {
      addLog('Error: ' + radioError)
      lastHubErrorRef.current = radioError
    } else if (radioStatus === 'idle' || radioStatus === 'stopped') {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      analyserRef.current = null
      const canvas = canvasRef.current
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      lastHubErrorRef.current = ''
    }
  }, [radioStatus, radioError, broadcastMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Frequency spectrum canvas ──────────────────────────────────────────
  function drawSpectrum() {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const buf = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(buf)
    ctx.clearRect(0, 0, w, h)
    const bars = 64
    const bw = Math.floor(w / bars) - 1
    for (let i = 0; i < bars; i++) {
      const bin = Math.round(Math.pow(i / bars, 1.5) * (buf.length * 0.8))
      const v = buf[Math.min(bin, buf.length - 1)] / 255
      const bh = Math.max(1, v * h)
      const hue = (1 - v) * 120
      ctx.fillStyle = `hsl(${hue}, 80%, ${38 + v * 22}%)`
      ctx.fillRect(i * (bw + 1), h - bh, bw, bh)
    }
    rafRef.current = requestAnimationFrame(drawSpectrum)
  }

  function doCleanup({ closeSocket = true } = {}) {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    analyserRef.current = null
    if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null }
    if (recorderRef.current) { try { recorderRef.current.stop() } catch {} recorderRef.current = null }
    // Don't stop the mixer's stream tracks — they are owned by AudioEngine
    streamRef.current = null
    if (closeSocket && wsRef.current) { try { wsRef.current.close() } catch {} }
    wsRef.current = null
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  function startRecorder(stream, ws) {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      addLog('MediaRecorder already active — duplicate live signal ignored')
      return
    }
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm'
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data)
    }
    recorder.start(250)
    addLog('MediaRecorder started (250 ms chunks, ' + mimeType + ')')
  }

  async function goLive() {
    if (!token) { addLog('Error: not signed in'); return }
    if (['requesting', 'connecting', 'live'].includes(statusRef.current)) {
      addLog('Encoder start ignored — a connection is already active')
      return
    }
    const attempt = connectionAttemptRef.current + 1
    connectionAttemptRef.current = attempt
    manualStopRef.current = false
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    try {
      setIcecastError('')
      setStatusBoth('requesting')
      terminalErrorRef.current = false
      addLog('Tapping Mixer main output…')

      // Resume the AudioEngine AudioContext (requires a user gesture)
      await resume()

      // Get the mixer's master output as a MediaStream
      const stream = getStreamTrack()
      if (!stream || stream.getTracks().length === 0) {
        setIcecastError('Mixer is not active. Open the Mixer and start a channel first.')
        setStatusBoth('error')
        addLog('Error: Mixer is not active — open the Mixer and start a channel first')
        return
      }
      streamRef.current = stream
      addLog('Mixer main output ready ✓')

      // Read the final encoder bus so the visualizer follows either the app
      // mixer or the external mixer line-in, whichever is being broadcast.
      const streamAnalyser = getStreamAnalyser()
      if (streamAnalyser) {
        analyserRef.current = streamAnalyser
        drawSpectrum()
      }

      setStatusBoth('connecting')
      addLog('Opening WebSocket connection…')

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const mainServerWsUrl = `${proto}//${window.location.host}/ws/encode`
      const wsBaseUrl = broadcastMode === 'icecast' ? ENCODER_WS_URL : mainServerWsUrl
      const ws = new WebSocket(`${wsBaseUrl}?token=${encodeURIComponent(token)}`)
      wsRef.current = ws
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        if (connectionAttemptRef.current !== attempt) {
          ws.close(1000, 'stale encoder attempt')
          return
        }
        if (broadcastMode === 'hub') {
          addLog('Connected — starting hub broadcast…')
          ws.send(JSON.stringify({ action: 'broadcast' }))
        } else {
          addLog('Connected — sending encoder config…')
          ws.send(JSON.stringify({
            action: 'start',
            host: cfg.host,
            port: cfg.port,
            mount: cfg.mount,
            username: cfg.username,
            password: cfg.password,
            codec: cfg.codec,
            bitrate: cfg.bitrate,
          }))
        }
      }

      ws.onmessage = (e) => {
        if (connectionAttemptRef.current !== attempt) return
        try {
          const msg = JSON.parse(e.data)
          if (msg.status === 'live') {
            setIcecastError('')
            setStatusBoth('live')
            addLog('🔴 ' + (msg.msg || 'Live'))
            // Prevent the OS/browser from suspending this tab while broadcasting —
            // a suspended tab stops sending audio to the backend, which starves
            // ffmpeg and drops the Icecast source (even though nothing looks wrong
            // locally).
            if ('wakeLock' in navigator && !wakeLockRef.current) {
              navigator.wakeLock.request('screen')
                .then(lock => { wakeLockRef.current = lock })
                .catch(() => {})
            }
            startRecorder(stream, ws)
            keepaliveRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'ping' }))
            }, 10_000)
          } else if (msg.status === 'stopped') {
            setIcecastError('')
            setStatusBoth('stopped')
            addLog(msg.msg || 'Broadcast stopped')
            doCleanup()
          } else if (msg.status === 'error') {
            terminalErrorRef.current = true
            setIcecastError(msg.msg || 'Broadcast failed')
            setStatusBoth('error')
            addLog('Error: ' + msg.msg)
            doCleanup()
          }
        } catch {}
      }

      ws.onerror = () => { 
        addLog('WebSocket transport error')
      }

      ws.onclose = (event) => {
        if (connectionAttemptRef.current !== attempt) return
        wsRef.current = null
        addLog(`WebSocket closed (code=${event.code}${event.reason ? ` reason=${event.reason}` : ''})`)
        if (terminalErrorRef.current || manualStopRef.current) return
        if (statusRef.current === 'live' || statusRef.current === 'connecting') {
          addLog('Connection lost. Reconnecting...')
          setStatusBoth('reconnecting')
          doCleanup({ closeSocket: false })
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null
            if (statusRef.current === 'reconnecting' && connectionAttemptRef.current === attempt) {
              goLive()
            }
          }, 1500)
        }
      }
    } catch (err) {
      setIcecastError(err.message || 'Could not start the broadcast')
      setStatusBoth('error')
      addLog('Error: ' + err.message)
      doCleanup()
    }
  }

  function stopStream() {
    addLog('Stopping broadcast…')
    manualStopRef.current = true
    connectionAttemptRef.current += 1
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (recorderRef.current) { try { recorderRef.current.stop() } catch {} recorderRef.current = null }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }))
    }
    setIcecastError('')
    doCleanup()
    setStatusBoth('stopped')
  }

  const isLive = status === 'live'
  const isBusy = status === 'requesting' || status === 'connecting' || status === 'reconnecting'
  const canStart = ['idle', 'stopped', 'error'].includes(status)

  const statusLabel = { idle: 'IDLE', requesting: 'STARTING', connecting: 'CONNECTING', reconnecting: 'RECONNECTING', live: 'LIVE', stopped: 'STOPPED', error: 'ERROR' }[status] || 'IDLE'
  const statusCls = isLive
    ? 'text-orange-400 bg-orange-900/30 border-orange-700/40'
    : isBusy ? 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40'
    : status === 'error' ? 'text-red-400 bg-red-900/30 border-red-700/40'
    : 'text-gray-500 bg-gray-800/50 border-gray-700/40'

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 disabled:opacity-50'

  return (
    <div className="bg-gray-900 border border-orange-900/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-orange-900/25 to-gray-900 border-b border-orange-900/30">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
          isLive ? 'bg-orange-400 animate-pulse' : isBusy ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
        }`} />
        <div>
          <h3 className="text-sm font-semibold text-white">Browser Encoder</h3>
          <p className="text-xs text-gray-400">
            {broadcastMode === 'hub'
              ? 'Broadcast to the station hub — listeners connect directly through this server'
              : 'Transcode via FFmpeg and push to Icecast / Shoutcast'}
          </p>
        </div>
        {/* Mode selector */}
        <div className="ml-auto flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-0.5">
          <button onClick={() => canStart && setBroadcastMode('hub')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${broadcastMode === 'hub' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Hub
          </button>
          <button onClick={() => canStart && setBroadcastMode('icecast')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${broadcastMode === 'icecast' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Icecast
          </button>
        </div>
        <span className={`text-[10px] font-bold border rounded px-2 py-0.5 flex-shrink-0 ${statusCls}`}>
          {statusLabel}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Config grid — hidden in hub mode */}
        {broadcastMode === 'icecast' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Host</label>
            <input type="text" value={cfg.host} disabled={!canStart} placeholder="stream.example.com or 192.168.1.x"
              onChange={e => setCfg(p => ({ ...p, host: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Port</label>
            <input type="text" value={cfg.port} disabled={!canStart} placeholder="8000"
              onChange={e => setCfg(p => ({ ...p, port: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Mount Point</label>
            <input type="text" value={cfg.mount} disabled={!canStart} placeholder="/radio"
              onChange={e => setCfg(p => ({ ...p, mount: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</label>
            <input type="text" value={cfg.username} disabled={!canStart} placeholder="source"
              onChange={e => setCfg(p => ({ ...p, username: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Password</label>
            <input type="password" value={cfg.password} disabled={!canStart} placeholder="••••••••"
              onChange={e => setCfg(p => ({ ...p, password: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Output Codec</label>
            <select value={cfg.codec} disabled={!canStart}
              onChange={e => setCfg(p => ({ ...p, codec: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-50">
              <option value="mp3">MP3 (drop-protected)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Bitrate</label>
            <select value={cfg.bitrate} disabled={!canStart}
              onChange={e => setCfg(p => ({ ...p, bitrate: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-50">
              {allowedBitrates.map(bitrate => (
                <option key={bitrate} value={bitrate}>{bitrate.replace('k', ' kbps')}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-500 capitalize">{user?.plan || 'starter'} package bitrate</p>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Audio Source</label>
            <div className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              Mixer Main Output
              <span className="ml-auto text-[10px] text-gray-500 font-mono">master bus</span>
            </div>
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              onClick={saveConfig}
              disabled={!canStart}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                cfgSaved
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40'
              }`}>
              {cfgSaved ? '✓ Saved' : 'Save Config'}
            </button>
          </div>
        </div>
        )}

        {/* Frequency spectrum visualizer */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Frequency Spectrum</p>
          <canvas ref={canvasRef} width={560} height={56}
            className="w-full rounded-lg bg-gray-950 block" />
        </div>

        {/* Console log */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Console</p>
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 h-28 overflow-y-auto font-mono text-xs flex flex-col gap-0.5">
            {logs.length === 0 && <span className="text-gray-700">Waiting…</span>}
            {logs.map((l, i) => (
              <div key={i}>
                <span className="text-gray-600">[{l.t}]</span>{' '}
                <span className={
                  l.msg.startsWith('Error') ? 'text-red-400'
                  : l.msg.startsWith('🔴') ? 'text-orange-300'
                  : 'text-gray-400'
                }>{l.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {broadcastMode === 'hub' && status === 'error' && radioError && (
          <div className="rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {radioError}
          </div>
        )}

        {broadcastMode === 'icecast' && status === 'error' && icecastError && (
          <div className="rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {icecastError}
          </div>
        )}

        {/* Listener share link — hub mode only */}
        {broadcastMode === 'hub' && listenUrl && (
          <div className={`rounded-lg border px-4 py-3 ${isLive ? 'border-orange-700/50 bg-orange-900/10' : 'border-gray-700/50 bg-gray-800/30'}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isLive ? 'text-orange-400' : 'text-gray-500'}`}>
              {isLive ? '🔴 Share with listeners' : 'Listener link'}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-green-400 font-mono truncate select-all bg-gray-950 border border-gray-800 rounded px-2 py-1">
                {window.location.origin + listenUrl}
              </code>
              <CopyButton text={window.location.origin + listenUrl} />
            </div>
          </div>
        )}

        {/* Go Live / Stop */}
        {canStart ? (
          <button
            onClick={broadcastMode === 'hub' ? startRadio : goLive}
            disabled={isBusy || !token || (broadcastMode === 'icecast' && !cfg.host) || isSuspended}
            title={isSuspended ? 'Streaming suspended — listener limit exceeded. Upgrade to resume.' : ''}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors shadow-lg shadow-orange-900/20">
            {isSuspended ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z" />
                </svg>
                Streaming Suspended
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-white inline-block" />
                {broadcastMode === 'hub' ? 'Go Live → Station Hub' : 'Go Live → Icecast / Shoutcast'}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={broadcastMode === 'hub' ? stopRadio : stopStream}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors">
            ■ Stop Broadcast
          </button>
        )}

        {!token && (
          <p className="text-xs text-yellow-500/80 text-center">Sign in to use the browser encoder</p>
        )}

        <p className="text-xs text-gray-600">
          {broadcastMode === 'hub'
            ? 'The Mixer\'s main output is streamed directly to this server\'s fan-out hub. Listeners receive your audio at /listen/{station-id}. Open the Mixer and activate a channel before going live.'
            : 'The Mixer\'s main output is captured and sent to the server via WebSocket, transcoded by FFmpeg, and pushed to Icecast. Open the Mixer and activate a channel before going live. Expected latency: 0.5–2 s.'}
        </p>
      </div>
    </div>
  )
}

/* ─── Audio encoder tab ───────────────────────────────────────── */

function AudioEncoderTab({ audioKey, host, listenUrl, isSuspended = false }) {
  const mount = '/' + audioKey
  return (
    <div className="space-y-5">
      <IcecastEncoder defaultHost={host} defaultMount={mount} listenUrl={listenUrl} isSuspended={isSuspended} />
    </div>
  )
}

/* ─── Tab definitions ─────────────────────────────────────────── */

const TABS = [
  {
    id: 'listeners',
    label: 'Listeners',
    icon: () => (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
    ),
  },
  {
    id: 'audio',
    label: 'Audio Encoder',
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Stream Settings',
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

/* ─── Main component ──────────────────────────────────────────── */

export default function StreamSetup({ isSuspended = false }) {
  const host = window.location.hostname
  const fallbackAudioKey = 'radio'

  const { token } = useAuth()
  const [creds, setCreds] = useState(null)

  // Fetch the logged-in user's personal stream credentials once
  useEffect(() => {
    if (!token) { setCreds(null); return }
    fetch('/api/user/stream-credentials', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.stream_key) setCreds(data)
      })
      .catch(() => {})
  }, [token])

  // Use personal credentials when available, otherwise fall back to the shared audio mount.
  const audioKey = creds?.stream_key ?? fallbackAudioKey

  const [tab, setTab] = useState('listeners')
  const { liveStreams, viewers } = useStreamDashboard(token)

  return (
    <div className="max-w-7xl mx-auto w-full px-2 py-2">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white mb-1">Stream Setup</h2>
        <p className="text-sm text-gray-400">Connection details, encoder settings, and channel URLs.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
            }`}
          >
            {t.icon(tab === t.id)}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content — all tabs stay mounted; CSS hides inactive ones so streams survive tab switches */}
      <div style={{ display: tab === 'settings' ? undefined : 'none' }}>
        <StreamSettingsTab
          audioKey={audioKey}
          liveStreams={liveStreams}
          viewers={viewers}
          creds={creds}
        />
      </div>
      <div style={{ display: tab === 'audio' ? undefined : 'none' }}>
        <AudioEncoderTab audioKey={audioKey} host={host} listenUrl={creds?.listen_url} isSuspended={isSuspended} />
      </div>
      {tab === 'listeners' && <ListenersPage />}
    </div>
  )
}
