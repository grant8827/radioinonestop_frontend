import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudioEngine } from '../context/AudioEngine'
import { useStream } from '../context/StreamContext'
import ListenersPage from './ListenersPage'
import UpgradeModal from './UpgradeModal'
import StudioCompositor from './StudioCompositor'
import Workspace from './studio/Workspace'

// Channel limits per plan
const MAX_CHANNELS = {
  starter: 0,       // No video streaming allowed
  professional: 0,  // No video streaming allowed
  enterprise: 3,    // Up to 3 channels
  ultimate: 6,      // Up to 6 channels
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

function MaskedField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  const isEditable = typeof onChange === 'function'
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
        {isEditable ? (
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || ''}
            className="flex-1 bg-transparent text-sm text-green-400 font-mono outline-none placeholder-gray-700"
          />
        ) : (
          <code className="flex-1 text-sm text-green-400 font-mono truncate select-all">
            {show ? value : '•'.repeat(Math.min(value.length, 32))}
          </code>
        )}
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="flex-shrink-0 text-gray-600 hover:text-white transition-colors p-0.5"
          aria-label={show ? 'Hide' : 'Show'}
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
        {!isEditable && <CopyButton text={value} />}
      </div>
    </div>
  )
}

function InfoRow({ icon, text }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-400">
      <span className="mt-0.5 flex-shrink-0 text-gray-600">{icon}</span>
      <span>{text}</span>
    </li>
  )
}

function useStreamDashboard() {
  const [liveStreams, setLiveStreams] = useState([])
  const [viewers, setViewers] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const [sRes, vRes] = await Promise.all([fetch('/api/streams'), fetch('/api/viewers')])
        if (!cancelled) {
          if (sRes.ok) setLiveStreams(await sRes.json())
          if (vRes.ok) { const v = await vRes.json(); setViewers(v.viewers ?? 0) }
        }
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

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

function StreamSettingsTab({ audioKey, liveStreams, viewers, host, sourcePassword, creds, isSuspended = false }) {
  const audioStream = liveStreams.find(s => s.key === audioKey)
  const anyLive = liveStreams.some(s => s.live)
  const otherStreams = liveStreams.filter(s => s.key !== audioKey)
  const [settingsTab, setSettingsTab] = useState('audio')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setSettingsTab('audio')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            settingsTab === 'audio'
              ? 'bg-gray-700 text-white'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
          }`}
        >
          Audio Settings
        </button>
        {/* VIDEO DISABLED: video settings tab removed. */}
      </div>

      <div style={{ display: settingsTab === 'audio' ? undefined : 'none' }} className="space-y-6">
        {/* Dashboard */}
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

      {/* Icecast / source client settings */}
      <IcecastCard host={host} audioKey={audioKey} sourcePassword={sourcePassword} />

      {/* ── Your RTMP Credentials ── */}
      <div className="bg-gray-900 border border-red-900/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-red-900/20 to-transparent border-b border-red-900/30">
          <span className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </span>
          <div>
            <h3 className="font-semibold text-white text-sm">Your RTMP Credentials</h3>
            <p className="text-xs text-gray-400">Use these in OBS Studio or any RTMP broadcaster</p>
          </div>
          <span className="ml-auto text-[10px] font-bold text-amber-400 bg-red-900/30 border border-red-700/40 rounded px-2 py-0.5">PERSONAL</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {creds ? (
            <>
              <Field label="RTMP Server URL" value={creds.rtmp_ingest_base} />
              <MaskedField label="Stream Key" value={creds.stream_key} />
              <Field label="Full Publish URL" value={`${creds.rtmp_ingest_base}/${creds.stream_key}`} />
              {creds.station_slug && <Field label="Station ID" value={creds.station_slug} />}
            </>
          ) : (
            <p className="text-xs text-gray-500 py-2">Sign in to view your credentials</p>
          )}
        </div>
      </div>

      {/* ── Channel Playback URLs ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-800/60 to-gray-900 border-b border-gray-800">
          <span className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.25h.008v.008H12v-.008z" />
            </svg>
          </span>
          <div>
            <h3 className="font-semibold text-white text-sm">Channel Playback URLs</h3>
            <p className="text-xs text-gray-400">Share these links so listeners and viewers can tune in</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {creds && (
            <>
              <Field label="Audio Stream (HLS)" value={`https://${host}/hls/${creds.stream_key}/index.m3u8`} />
              {creds.listen_url && <LiveListenerPlayer listenPath={creds.listen_url} />}
            </>
          )}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3 text-sm text-gray-400">
            These HLS URLs work in VLC, any browser with HLS support, and can be embedded with an HLS.js player.
            They go live automatically when you start streaming.
          </div>
        </div>
      </div>

      {/* ── RTMP Ingest ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">RTMP Ingest (This Server)</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {creds ? (
            <>
              <Field label="RTMP Server URL" value={creds.rtmp_ingest_base} />
              <MaskedField label="Your Stream Key" value={creds.stream_key} />
            </>
          ) : (
            <p className="text-xs text-gray-500 py-2">Sign in to view your RTMP details</p>
          )}
        </div>
      </div>

      </div>

      {/* VIDEO DISABLED: video and multistream settings are not mounted. */}
    </div>
  )
}

/* ─── Icecast / Shoutcast source-client card ────────────────── */

function IcecastCard({ host, audioKey = 'radio', sourcePassword = '' }) {
  const mount          = '/' + audioKey
  const icecastPort    = '8000'
  const listenUrl      = `https://${host}/icecast${mount}`

  return (
    <div className="bg-gray-900 border border-orange-900/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-orange-900/30 to-gray-900 border-b border-orange-900/30">
        <span className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </span>
        <div>
          <h3 className="font-semibold text-white text-sm">Icecast / Shoutcast Source</h3>
          <p className="text-xs text-gray-400">Connect BUTT, Mixxx, Liquidsoap, or Darkice</p>
        </div>
        <span className="ml-auto text-[10px] font-bold text-orange-400 bg-orange-900/30 border border-orange-700/40 rounded px-2 py-0.5">ICECAST 2</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Connection details */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Host / Address" value={host} />
          <Field label="Port" value={icecastPort} />
          <Field label="Mount Point" value={mount} />
          <Field label="Source Password" value={sourcePassword} />
        </div>
        <Field label="Listener URL (HTTPS — works while stream is active)" value={listenUrl} />

        {/* BUTT instructions */}
        <div className="bg-orange-950/20 border border-orange-800/30 rounded-lg p-4">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">BUTT (Broadcast Using This Tool)</p>
          <ol className="space-y-1.5 text-sm text-gray-300 list-decimal list-inside">
            <li>Open BUTT → <strong>Settings → Main</strong> → click <strong>ADD</strong> under Servers</li>
            <li>Type: <span className="text-orange-300 font-mono">Icecast</span></li>
            <li>Address: <span className="text-orange-300 font-mono">{host}</span> &nbsp;·&nbsp; Port: <span className="text-orange-300 font-mono">{icecastPort}</span></li>
            <li>Password: <span className="text-orange-300 font-mono">{sourcePassword}</span> &nbsp;·&nbsp; Mount: <span className="text-orange-300 font-mono">{mount}</span></li>
            <li>Click <strong>Add</strong>, select that server, press the <strong>▶ Play</strong> button</li>
          </ol>
        </div>

        {/* Mixxx */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mixxx</p>
          <ol className="space-y-1.5 text-sm text-gray-300 list-decimal list-inside">
            <li>Preferences → <strong>Live Broadcasting</strong></li>
            <li>Type: <span className="text-green-400 font-mono">Icecast 2</span> &nbsp;·&nbsp; Host: <span className="text-green-400 font-mono">{host}</span> &nbsp;·&nbsp; Port: <span className="text-green-400 font-mono">{icecastPort}</span></li>
            <li>Mount: <span className="text-green-400 font-mono">{mount}</span> &nbsp;·&nbsp; Login: <span className="text-green-400 font-mono">source</span> &nbsp;·&nbsp; Password: <span className="text-green-400 font-mono">{sourcePassword}</span></li>
            <li>Enable <strong>Enable Live Broadcasting</strong> and click <strong>Apply</strong></li>
          </ol>
        </div>

        {/* Liquidsoap */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Liquidsoap</p>
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all leading-relaxed bg-gray-900 rounded-lg px-3 py-2 mt-2">{`output.icecast(
  %mp3(bitrate = 192, samplerate = 44100, stereo = true),
  host     = "${host}",
  port     = ${icecastPort},
  password = "${sourcePassword}",
  mount    = "${mount}",
  radio
)`}</pre>
        </div>

        <ul className="space-y-1.5">
          <InfoRow icon="•" text="The listener URL only works while you are actively streaming — Icecast drops the mount when the source disconnects." />
          <InfoRow icon="•" text="For external source clients (BUTT, Mixxx) on Railway: use your Icecast service's own public URL from the Railway dashboard as the host, not this domain." />
          <InfoRow icon="•" text="Supported formats: MP3, AAC, OGG Vorbis, OGG Opus, FLAC." />
        </ul>
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
  const { token } = useAuth()
  const { getStreamTrack, getMasterAnalyser, resume } = useAudioEngine()
  const { radioStatus, startRadio, stopRadio,
          broadcastMode, setBroadcastMode,
          setIcecastStatus, icecastStartRef, icecastStopRef } = useStream()

  // 'hub' = broadcast directly to this server's fan-out hub (no Icecast needed)
  // 'icecast' = legacy path: server transcodes via ffmpeg and pushes to Icecast
  // broadcastMode is shared via StreamContext so NowPlaying's GO LIVE button can trigger it.

  const [cfg, setCfg] = useState(() => {
    try {
      const saved = localStorage.getItem('icecast_encoder_cfg')
      if (saved) return { host: defaultHost, port: '8000', mount: defaultMount, username: 'source', password: '', codec: 'mp3', bitrate: '192k', ...JSON.parse(saved) }
    } catch {}
    return { host: defaultHost, port: '8000', mount: defaultMount, username: 'source', password: '', codec: 'mp3', bitrate: '192k' }
  })

  const [cfgSaved, setCfgSaved] = useState(false)
  function saveConfig() {
    try { localStorage.setItem('icecast_encoder_cfg', JSON.stringify(cfg)) } catch {}
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
      const masterAnalyser = getMasterAnalyser()
      if (masterAnalyser) { analyserRef.current = masterAnalyser; drawSpectrum() }
      addLog('🔴 Hub broadcast active')
    } else if (radioStatus === 'idle' || radioStatus === 'stopped') {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      analyserRef.current = null
      const canvas = canvasRef.current
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [radioStatus, broadcastMode]) // eslint-disable-line react-hooks/exhaustive-deps

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
      setStatusBoth('requesting')
      terminalErrorRef.current = false
      addLog('Tapping Mixer main output…')

      // Resume the AudioEngine AudioContext (requires a user gesture)
      await resume()

      // Get the mixer's master output as a MediaStream
      const stream = getStreamTrack()
      if (!stream || stream.getTracks().length === 0) {
        setStatusBoth('error')
        addLog('Error: Mixer is not active — open the Mixer and start a channel first')
        return
      }
      streamRef.current = stream
      addLog('Mixer main output ready ✓')

      // Reuse the shared master analyser for the spectrum visualizer
      const masterAnalyser = getMasterAnalyser()
      if (masterAnalyser) {
        analyserRef.current = masterAnalyser
        drawSpectrum()
      }

      setStatusBoth('connecting')
      addLog('Opening WebSocket connection…')

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/encode?token=${encodeURIComponent(token)}`)
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
            setStatusBoth('live')
            addLog('🔴 ' + (msg.msg || 'Live'))
            startRecorder(stream, ws)
            keepaliveRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'ping' }))
            }, 10_000)
          } else if (msg.status === 'stopped') {
            setStatusBoth('stopped')
            addLog(msg.msg || 'Broadcast stopped')
            doCleanup()
          } else if (msg.status === 'error') {
            terminalErrorRef.current = true
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
          addLog('Connection lost. Reconnecting in 3s...')
          setStatusBoth('reconnecting')
          doCleanup({ closeSocket: false })
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null
            if (statusRef.current === 'reconnecting' && connectionAttemptRef.current === attempt) {
              goLive()
            }
          }, 3000)
        }
      }
    } catch (err) {
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
              <option value="mp3">MP3 (libmp3lame)</option>
              <option value="aac">AAC</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Bitrate</label>
            <select value={cfg.bitrate} disabled={!canStart}
              onChange={e => setCfg(p => ({ ...p, bitrate: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-50">
              <option value="96k">96 kbps</option>
              <option value="128k">128 kbps</option>
              <option value="192k">192 kbps</option>
              <option value="320k">320 kbps</option>
            </select>
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

function VideoEncoderTab() {
  return (
    <div className="space-y-5">
      <div className="bg-gray-900 border border-amber-900/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-900/30 to-gray-900 border-b border-amber-900/30">
          <span className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </span>
          <div>
            <h3 className="font-semibold text-white text-sm">Video Encoder</h3>
            <p className="text-xs text-gray-400">Recommended settings for H.264 video streams</p>
          </div>
          <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/40 rounded px-2 py-0.5">H.264</span>
        </div>
        <div className="px-5 py-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Video Codec', value: 'H.264', note: 'x264 (CPU) or NVENC (GPU)' },
              { label: 'Video Bitrate', value: '2500 – 6000 kbps', note: 'CBR rate control' },
              { label: 'Keyframe Interval', value: '1 second', note: 'Required for LL-HLS' },
              { label: 'Resolution', value: '1280 × 720', note: 'Or 1920 × 1080' },
              { label: 'Frame Rate', value: '30 fps', note: '25 fps also fine' },
              { label: 'Profile', value: 'High / Main', note: 'Broad device support' },
              { label: 'Audio Codec', value: 'AAC, 160 kbps', note: '44.1 kHz stereo' },
              { label: 'Rate Control', value: 'CBR', note: 'Constant bitrate' },
            ].map(({ label, value, note }) => (
              <div key={label} className="bg-gray-800/60 rounded-lg px-4 py-3">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-white">{value}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{note}</div>
              </div>
            ))}
          </div>
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">OBS Configuration</p>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Go to <strong>Settings → Output → Video Encoder</strong> → select <span className="text-amber-300 font-mono">x264</span> or <span className="text-amber-300 font-mono">NVENC H.264</span></li>
              <li>Set <strong>Rate Control</strong> to <span className="text-amber-300 font-mono">CBR</span>, bitrate to <span className="text-amber-300 font-mono">4000 kbps</span></li>
              <li>Set <strong>Keyframe Interval</strong> to <span className="text-amber-300 font-mono">1 s</span> — critical for low-latency HLS</li>
              <li>Go to <strong>Settings → Video</strong> → set resolution and frame rate to <span className="text-amber-300 font-mono">30</span></li>
            </ol>
          </div>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Low-latency HLS note</p>
            <p className="text-sm text-gray-400">
              The server outputs LL-HLS with 1-second segments. A 1-second keyframe interval aligns GOP boundaries
              with segments, keeping end-to-end latency below 3 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const SOCIAL_PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube Live',
    defaultUrl: 'rtmps://a.rtmp.youtube.com/live2',
    badge: 'RTMPS',
    keyUrl: 'https://studio.youtube.com',
    keyNote: 'YouTube Studio → Go Live → Stream → copy Stream Key',
    colorBorder: 'border-red-900/40',
    colorFrom: 'from-red-900/30',
    colorIcon: 'bg-red-600/20 border-red-500/30 text-red-400',
    colorBadge: 'text-red-400 bg-red-900/30 border-red-700/40',
  },
  {
    id: 'facebook',
    name: 'Facebook Live',
    defaultUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    badge: 'RTMPS',
    keyUrl: 'https://www.facebook.com/live/producer',
    keyNote: 'Facebook → Create → Live Video → Streaming Software',
    colorBorder: 'border-amber-900/40',
    colorFrom: 'from-amber-900/30',
    colorIcon: 'bg-amber-600/20 border-amber-500/30 text-amber-400',
    colorBadge: 'text-amber-400 bg-amber-900/30 border-amber-700/40',
  },
  {
    id: 'twitch',
    name: 'Twitch TV',
    defaultUrl: 'rtmp://live.twitch.tv/app/',
    badge: 'RTMP',
    keyUrl: 'https://dashboard.twitch.tv/settings/stream',
    keyNote: 'Twitch Dashboard → Settings → Stream → copy Stream Key',
    colorBorder: 'border-red-900/40',
    colorFrom: 'from-red-900/30',
    colorIcon: 'bg-red-600/20 border-red-500/30 text-red-400',
    colorBadge: 'text-amber-400 bg-red-900/30 border-red-700/40',
  },
  {
    id: 'tiktok',
    name: 'TikTok Live',
    defaultUrl: '',
    badge: 'RTMP',
    keyUrl: 'https://www.tiktok.com/live',
    keyNote: 'TikTok Live Center → copy Server URL + Stream Key',
    colorBorder: 'border-pink-900/40',
    colorFrom: 'from-pink-900/30',
    colorIcon: 'bg-pink-600/20 border-pink-500/30 text-pink-400',
    colorBadge: 'text-pink-400 bg-pink-900/30 border-pink-700/40',
  },
  {
    id: 'instagram',
    name: 'Instagram Live',
    defaultUrl: '',
    badge: 'RTMP',
    keyUrl: 'https://www.instagram.com/',
    keyNote: 'Live Producer → copy Server URL + Stream Key',
    colorBorder: 'border-fuchsia-900/40',
    colorFrom: 'from-fuchsia-900/30',
    colorIcon: 'bg-fuchsia-600/20 border-fuchsia-500/30 text-fuchsia-400',
    colorBadge: 'text-fuchsia-400 bg-fuchsia-900/30 border-fuchsia-700/40',
  },
  {
    id: 'x',
    name: 'X Live',
    defaultUrl: '',
    badge: 'RTMP',
    keyUrl: 'https://studio.x.com/',
    keyNote: 'Media Studio Live → copy Server URL + Stream Key',
    colorBorder: 'border-slate-700/60',
    colorFrom: 'from-slate-700/40',
    colorIcon: 'bg-slate-500/20 border-slate-400/30 text-slate-300',
    colorBadge: 'text-slate-300 bg-slate-700/30 border-slate-500/40',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Live',
    defaultUrl: '',
    badge: 'RTMP',
    keyUrl: 'https://www.linkedin.com/video/live/',
    keyNote: 'LinkedIn Live Event → copy Server URL + Stream Key',
    colorBorder: 'border-cyan-900/40',
    colorFrom: 'from-cyan-900/30',
    colorIcon: 'bg-cyan-600/20 border-cyan-500/30 text-cyan-400',
    colorBadge: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/40',
  },
  {
    id: 'custom',
    name: 'Custom RTMP',
    defaultUrl: '',
    badge: 'RTMP',
    keyUrl: null,
    keyNote: 'Enter any RTMP server URL and stream key',
    colorBorder: 'border-indigo-900/40',
    colorFrom: 'from-indigo-900/30',
    colorIcon: 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400',
    colorBadge: 'text-indigo-400 bg-indigo-900/30 border-indigo-700/40',
  },
]

// ── OAuth Platform Definitions ─────────────────────────────────────────────
const OAUTH_PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube',
    tag: 'YouTube Live',
    authPath: '/api/auth/youtube/connect',
    color: '#FF0000',
    bg: 'rgba(255,0,0,0.08)',
    border: 'rgba(255,0,0,0.25)',
    textColor: '#FF6B6B',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    scopes: 'youtube.force-ssl',
    ticket: 'ST-1002',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    tag: 'Twitch TV',
    authPath: '/api/auth/twitch/connect',
    color: '#9146FF',
    bg: 'rgba(145,70,255,0.08)',
    border: 'rgba(145,70,255,0.25)',
    textColor: '#B98EFF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
    scopes: 'channel:manage:broadcast',
    ticket: 'ST-1001',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    tag: 'Facebook Live',
    authPath: '/api/auth/facebook/connect',
    color: '#1877F2',
    bg: 'rgba(24,119,242,0.08)',
    border: 'rgba(24,119,242,0.25)',
    textColor: '#60A5FA',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    scopes: 'publish_video, pages_manage_posts',
    ticket: 'ST-1003',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    tag: 'TikTok Live',
    authPath: '/api/auth/tiktok/connect',
    color: '#FE2C55',
    bg: 'rgba(254,44,85,0.08)',
    border: 'rgba(254,44,85,0.25)',
    textColor: '#FE6B85',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    scopes: 'user.info.basic, video.publish',
    ticket: 'ST-1004',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    tag: 'IG Live Producer',
    authPath: '/api/auth/instagram/connect',
    color: '#E1306C',
    bg: 'rgba(225,48,108,0.08)',
    border: 'rgba(225,48,108,0.30)',
    textColor: '#F472B6',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    scopes: 'instagram_basic, publish_video',
    ticket: 'ST-1005',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    tag: 'X Live',
    authPath: '/api/auth/x/connect',
    color: '#FFFFFF',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.15)',
    textColor: '#E2E8F0',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    scopes: 'tweet.write, media.write',
    ticket: 'ST-1006',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    tag: 'LinkedIn Live',
    authPath: '/api/auth/linkedin/connect',
    color: '#0A66C2',
    bg: 'rgba(10,102,194,0.08)',
    border: 'rgba(10,102,194,0.25)',
    textColor: '#60A5FA',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    scopes: 'w_member_social, rw_organizationAdmin',
    ticket: 'ST-1007',
  },
]

// ── Platform Connections UI component ──────────────────────────────────────
function PlatformConnections({ connectedPlatforms = {}, onConnect, onDisconnect, onSyncComplete, disabled }) {
  const { token } = useAuth()
  const [toast, setToast] = useState(null)    // { id, msg, type } type: 'info'|'error'
  const [connecting, setConnecting] = useState(null) // platform id currently initiating
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    if (!token) {
      setToast({ id: '__sync', msg: 'Sign in to sync stream keys.', type: 'info' })
      setTimeout(() => setToast(null), 3500)
      return
    }
    setSyncing(true)
    try {
      const r = await fetch('/api/user/oauth-stream-keys/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error(`Server error ${r.status}`)
      const results = await r.json() // [{platform, dest?, error?}]
      const synced = results.filter((x) => x.dest).map((x) => x.dest)
      const errors = results.filter((x) => x.error)
      if (synced.length > 0 && onSyncComplete) {
        onSyncComplete(synced)
      }
      if (synced.length > 0) {
        const names = synced.map((d) => d.label).join(', ')
        setToast({ id: '__sync_ok', msg: `Synced: ${names}`, type: 'info' })
      } else if (errors.length > 0) {
        const first = errors[0]
        setToast({ id: '__sync_err', msg: `Sync failed for ${first.platform}: ${first.error}`, type: 'error' })
      } else {
        setToast({ id: '__sync_none', msg: 'No connected platforms to sync.', type: 'info' })
      }
      setTimeout(() => setToast(null), 5000)
    } catch (err) {
      setToast({ id: '__sync_err', msg: `Sync error: ${err.message}`, type: 'error' })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setSyncing(false)
    }
  }

  async function handleConnect(platform) {
    if (!token) {
      setToast({ id: platform.id, msg: 'Sign in to connect platforms.', type: 'info' })
      setTimeout(() => setToast(null), 3500)
      return
    }
    if (!platform.authPath) {
      setToast({ id: platform.id, msg: `OAuth integration for ${platform.name} is in development — use manual stream key below.`, type: 'info' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    setConnecting(platform.id)
    try {
      const res = await fetch(`/api/auth/${platform.id}/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        if (res.status === 503) {
          setToast({ id: platform.id, msg: `${platform.name} OAuth is not yet configured on the server.`, type: 'info' })
        } else {
          setToast({ id: platform.id, msg: `Could not connect: ${text}`, type: 'error' })
        }
        setTimeout(() => setToast(null), 4000)
        return
      }
      const { redirect_url } = await res.json()
      window.location.href = redirect_url
    } catch (err) {
      setToast({ id: platform.id, msg: `Network error: ${err.message}`, type: 'error' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setConnecting(null)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
        <span className="w-8 h-8 rounded-lg bg-red-900/30 border border-red-700/40 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">Platform Connections</h3>
          <p className="text-xs text-gray-400">Login-to-Stream — connect accounts for automatic credential provisioning</p>
        </div>
        <span className="text-[9px] font-bold text-amber-400 bg-red-900/20 border border-red-700/30 rounded px-2 py-1 uppercase tracking-wider shrink-0">OAuth 2.0</span>
      </div>

      {/* Platform grid */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {OAUTH_PLATFORMS.map((platform) => {
          const connected = !!connectedPlatforms[platform.id]
          const isToast = toast?.id === platform.id
          return (
            <div
              key={platform.id}
              style={{ border: `1px solid ${platform.border}`, background: platform.bg }}
              className="rounded-xl p-3.5 flex flex-col gap-3 relative overflow-hidden"
            >
              {/* Glow line at top */}
              <div style={{ background: platform.color, height: 2, position: 'absolute', top: 0, left: 0, right: 0, opacity: connected ? 0.8 : 0.3 }} />

              {/* Icon + name */}
              <div className="flex items-center gap-2.5">
                <span style={{ color: platform.textColor }}>{platform.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight truncate">{platform.name}</p>
                  <p className="text-[9px] text-gray-500 truncate">{platform.tag}</p>
                </div>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${connected ? 'text-green-400' : 'text-gray-500'}`}>
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              {/* Toast / Connect button */}
              {isToast ? (
                <div className={`text-[9px] leading-relaxed rounded-lg px-2 py-1.5 ${
                  toast.type === 'error'
                    ? 'text-red-400 bg-red-900/20 border border-red-700/30'
                    : 'text-amber-400 bg-amber-900/20 border border-amber-700/30'
                }`}>
                  {toast.msg}
                </div>
              ) : connected ? (
                <button
                  onClick={() => onDisconnect?.(platform.id)}
                  disabled={disabled}
                  style={{ borderColor: platform.border, color: platform.textColor }}
                  className="w-full text-[10px] font-semibold border rounded-lg py-1.5 bg-transparent hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(platform)}
                  disabled={disabled || connecting === platform.id}
                  style={{ background: platform.bg, borderColor: platform.border, color: platform.textColor }}
                  className="w-full text-[10px] font-bold border rounded-lg py-1.5 hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {connecting === platform.id ? (
                    <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  )}
                  {connecting === platform.id ? 'Connecting…' : 'Connect'}
                </button>
              )}

              {/* Ticket ref */}
              <p className="text-[8px] text-gray-700 font-mono">{platform.ticket}</p>
            </div>
          )
        })}
      </div>

      {/* Footer: info + sync button */}
      <div className="px-5 py-3 border-t border-gray-800 bg-gray-950/40 flex items-center gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            OAuth provisions stream credentials automatically. Click <span className="text-gray-400 font-semibold">Sync</span> to pull live stream keys from your connected accounts into the destinations list.
          </p>
        </div>

        {/* Sync stream keys button */}
        <button
          onClick={handleSync}
          disabled={syncing || disabled}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
            bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500
            text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {syncing ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          )}
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>
    </div>
  )
}

// Migrate old format { platform, stream_key, enabled } → new format { id, platform, label, serverUrl, streamKey, active }
function migrateChannel(d) {
  if (d.streamKey !== undefined) return d // already new format
  const p = SOCIAL_PLATFORMS.find((pl) => pl.id === d.platform)
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    platform: d.platform || 'custom',
    label: d.label || p?.name || d.platform || 'Channel',
    serverUrl: d.serverUrl || p?.defaultUrl || '',
    streamKey: d.stream_key || '',
    active: d.active ?? d.enabled ?? false,
  }
}

/* ─── Inline listen player ────────────────────────────────────── */
function LiveListenerPlayer({ listenPath }) {
  const listenUrl = window.location.origin + listenPath
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  function toggle() {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      el.src = ''
      setPlaying(false)
    } else {
      el.src = listenUrl
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  // Stop when component unmounts (e.g. tab switch)
  useEffect(() => () => {
    const el = audioRef.current
    if (el) { el.pause(); el.src = '' }
  }, [])

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Live Station Stream</p>
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
        <button
          onClick={toggle}
          className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
            playing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          aria-label={playing ? 'Stop' : 'Play'}
        >
          {playing ? (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <code className="flex-1 text-sm text-green-400 font-mono truncate select-all">{listenUrl}</code>
        <CopyButton text={listenUrl} />
        <a
          href={listenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white"
        >
          Open
        </a>
      </div>
      {playing && (
        <p className="mt-1.5 text-xs text-orange-400 animate-pulse">● Listening live</p>
      )}
      <audio ref={audioRef} preload="none" />
    </div>
  )
}

// ── Slate image IndexedDB helpers ────────────────────────────────────────────
function openSlateDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('radio-slate', 1)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('images', { keyPath: 'key' })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}
function idbSaveSlate(blob) {
  return openSlateDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite')
      tx.objectStore('images').put({ key: 'slate', blob })
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    }),
  )
}
function idbLoadSlate() {
  return openSlateDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly')
      const req = tx.objectStore('images').get('slate')
      req.onsuccess = (e) => resolve(e.target.result?.blob || null)
      req.onerror = (e) => reject(e.target.error)
    }),
  )
}
function idbDeleteSlate() {
  return openSlateDB().then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite')
      tx.objectStore('images').delete('slate')
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    }),
  )
}

// ── Video Preview component ────────────────────────────────────────────────
function VideoPreview({ isLive, liveStatus, onGoLive, onStop, isSuspended = false }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [slateUrl, setSlateUrl] = useState(null)
  const [camError, setCamError] = useState(null)
  const [camReady, setCamReady] = useState(false)
  const [camEnabled, setCamEnabled] = useState(false)

  // Load slate from IDB on mount
  useEffect(() => {
    idbLoadSlate()
      .then((blob) => { if (blob) setSlateUrl(URL.createObjectURL(blob)) })
      .catch(() => {})
  }, [])

  // Start/stop camera based on camEnabled + slate
  useEffect(() => {
    if (!camEnabled || slateUrl) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        setCamReady(false)
      }
      return
    }
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCamReady(true)
        setCamError(null)
      })
      .catch((err) => {
        if (!cancelled) {
          setCamError(err.name === 'NotAllowedError' ? 'Camera access denied' : 'No camera found')
          setCamEnabled(false)
        }
      })
    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [slateUrl, camEnabled])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (slateUrl) URL.revokeObjectURL(slateUrl)
    setSlateUrl(URL.createObjectURL(file))
    idbSaveSlate(file).catch(() => {})
    e.target.value = ''
  }

  function removeSlate() {
    if (slateUrl) URL.revokeObjectURL(slateUrl)
    setSlateUrl(null)
    idbDeleteSlate().catch(() => {})
  }

  return (
    <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
      {/* 16:9 preview area */}
      <div className="relative w-full" style={{ aspectRatio: '16/9', background: '#0a0a0a' }}>
        {/* Camera feed */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity ${slateUrl ? 'opacity-0' : 'opacity-100'}`}
        />
        {/* Slate image */}
        {slateUrl && (
          <img
            src={slateUrl}
            alt="Broadcast slate"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Placeholder when neither camera nor slate is ready */}
        {!slateUrl && !camReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-gray-800" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-gray-600 text-sm">{camError || 'Camera is off — click Camera On below'}</p>
          </div>
        )}
        {/* LIVE badge */}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 rounded-md px-2.5 py-1 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-bold text-white tracking-wide">LIVE</span>
          </div>
        )}
        {/* Slate badge */}
        {slateUrl && (
          <span className="absolute top-3 right-3 text-[10px] font-bold text-gray-300 bg-black/70 border border-gray-700 rounded px-2 py-0.5 backdrop-blur-sm">
            SLATE IMAGE
          </span>
        )}
      </div>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-900 border-t border-gray-800">
        <div className="flex-1 min-w-[8rem]">
          {slateUrl ? (
            <p className="text-xs text-gray-400 truncate">Slate active — viewers see this still</p>
          ) : camReady ? (
            <p className="text-xs text-gray-400 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1.5 align-middle" />
              Camera live
            </p>
          ) : (
            <p className="text-xs text-gray-600 truncate">{camError || 'Camera off'}</p>
          )}
        </div>
        {slateUrl && (
          <button
            onClick={removeSlate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-700/50 bg-gray-900 hover:bg-red-950/20 transition-all shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 border border-gray-700 transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {slateUrl ? 'Change Image' : 'Add Slate Image'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {/* Camera On / Off toggle */}
        <button
          onClick={() => setCamEnabled((v) => !v)}
          disabled={!!slateUrl}
          title={slateUrl ? 'Remove slate to use camera' : camEnabled ? 'Turn camera off' : 'Turn camera on'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
            camEnabled
              ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-600/40'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          {camEnabled ? 'Camera Off' : 'Camera On'}
        </button>
        {/* Go Live / Stop */}
        {onGoLive && (
          <button
            onClick={liveStatus === 'live' ? onStop : () => onGoLive(streamRef.current || null)}
            disabled={liveStatus === 'connecting' || isSuspended}
            title={isSuspended ? 'Streaming suspended — listener limit exceeded. Upgrade to resume.' : ''}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
              liveStatus === 'live'
                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/40'
                : liveStatus === 'connecting' || isSuspended
                ? 'bg-gray-800/50 text-gray-600 border-gray-700 cursor-not-allowed'
                : 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-600/40'
            }`}
          >
            {liveStatus === 'live' ? (
              <><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Stop</>
            ) : liveStatus === 'connecting' ? 'Connecting…' : isSuspended ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z" />
                </svg>
                Suspended
              </>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> Go Live</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function ChannelTab({ host, audioKey, isSuspended = false, manualOnly = false }) {
  const { token, user } = useAuth()
  const { videoStatus } = useStream()

  const userPlan = user?.plan || 'starter'
  const maxChannels = MAX_CHANNELS[userPlan] || 0

  // Disable editing while a VIDEO broadcast is live (multistream destinations only)
  const isLive = videoStatus === 'live'

  // ── Channels list ──────────────────────────────────────────────────────────
  const [channels, setChannels] = useState([])
  const [showKeys, setShowKeys] = useState({}) // id → bool (per-card key reveal)

  // ── Upgrade modal state ────────────────────────────────────────────────────
  const [upgradeModal, setUpgradeModal] = useState({ show: false, feature: null, requiredPlan: null })

  // ── OAuth platform connection status (Stage 2: loaded from backend) ────────
  const [connectedPlatforms, setConnectedPlatforms] = useState({})

  // ── Add-channel form ───────────────────────────────────────────────────────
  const [formPlatform, setFormPlatform] = useState('youtube')
  const [formLabel,    setFormLabel]    = useState('')
  const [formUrl,      setFormUrl]      = useState(SOCIAL_PLATFORMS[0].defaultUrl)
  const [formKey,      setFormKey]      = useState('')
  const [showFormKey,  setShowFormKey]  = useState(false)
  const [formError,    setFormError]    = useState('')

  // ── Save feedback ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [metrics, setMetrics] = useState({ cpu: 0, bandwidth: 0, fps: 0, active_streams: 0 })
  const [eventLogs, setEventLogs] = useState([])

  function addEventLog(msg, kind = 'info') {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false })
    setEventLogs((prev) => [...prev.slice(-79), { t, msg, kind }])
  }

  // Update server URL when platform dropdown changes
  function handlePlatformChange(id) {
    setFormPlatform(id)
    const p = SOCIAL_PLATFORMS.find((pl) => pl.id === id)
    setFormUrl(p?.id !== 'custom' ? (p?.defaultUrl || '') : '')
    setFormError('')
  }

  // ── Load credentials + saved channels on mount ─────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch('/api/destinations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.destinations)) {
          const mapped = data.destinations.map((d) => ({
            id: d.id,
            platform: d.platform || 'custom',
            label: d.name || d.label || d.platform || 'Channel',
            serverUrl: d.serverUrl,
            streamKey: d.streamKey,
            active: !!(d.enabled ?? d.active),
          }))
          setChannels(mapped)
          return
        }
        return fetch('/api/user/stream-credentials', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.ok ? r.json() : null).then((legacy) => {
          if (Array.isArray(legacy?.destinations)) {
            setChannels(legacy.destinations.map(migrateChannel))
          }
        })
      })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token) return
    let canceled = false
    async function pollMetrics() {
      try {
        const res = await fetch('/api/metrics', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        if (!canceled) {
          setMetrics({
            cpu: Number(data.cpu || 0),
            bandwidth: Number(data.bandwidth || 0),
            fps: Number(data.fps || 0),
            active_streams: Number(data.active_streams || 0),
          })
        }
      } catch (_) {}
    }
    pollMetrics()
    const id = setInterval(pollMetrics, 1000)
    return () => { canceled = true; clearInterval(id) }
  }, [token])

  useEffect(() => {
    if (videoStatus === 'live') addEventLog('Video relay is live', 'live')
    else if (videoStatus === 'connecting') addEventLog('Video relay is connecting…', 'info')
    else if (videoStatus === 'error') addEventLog('Video relay encountered an error', 'error')
    else if (videoStatus === 'idle' || videoStatus === 'stopped') addEventLog('Video relay is idle', 'info')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoStatus])

  // ── Load OAuth connections on mount ────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch('/api/user/oauth-connections', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const map = {}
          data.forEach((c) => { map[c.platform] = c })
          setConnectedPlatforms(map)
        }
      })
      .catch(() => {})
  }, [token])

  // ── Handle ?oauth_success=platform redirect back from provider ─────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('oauth_success')
    const error = params.get('oauth_error')
    if (!success && !error) return
    // Clean the query params from the URL without a page reload
    window.history.replaceState({}, '', window.location.pathname)
    if (success && token) {
      // Refresh connection list
      fetch('/api/user/oauth-connections', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            const map = {}
            data.forEach((c) => { map[c.platform] = c })
            setConnectedPlatforms(map)
          }
        })
        .catch(() => {})
    }
    if (error) {
      console.warn('[oauth] callback error:', error, params.get('platform'))
    }
  }, [token])

  async function createDestination(channel) {
    if (!token) return
    setSaving(true)
    setSaveMsg('')
    try {
      const r = await fetch('/api/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: channel.label,
          serverUrl: channel.serverUrl,
          streamKey: channel.streamKey,
          enabled: !!channel.active,
          platform: channel.platform,
        }),
      })
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        throw new Error(text || `Save failed (${r.status})`)
      }
      const data = await r.json().catch(() => null)
      setChannels((prev) => prev.map((c) => c.id === channel.id ? { ...c, id: data?.id || c.id } : c))
      setSaveMsg('Saved!')
      addEventLog(`Destination added: ${channel.label}`, 'info')
    } catch {
      setSaveMsg('Network error')
      addEventLog('Failed to add destination', 'error')
    } finally {
      setSaving(false)
    }
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function updateDestination(channel) {
    if (!token || !channel?.id) return
    setSaving(true)
    setSaveMsg('')
    try {
      const r = await fetch(`/api/destinations/${encodeURIComponent(channel.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: channel.label,
          serverUrl: channel.serverUrl,
          streamKey: channel.streamKey,
          enabled: !!channel.active,
          platform: channel.platform,
        }),
      })
      if (!r.ok) throw new Error(`Update failed (${r.status})`)
      setSaveMsg('Saved!')
    } catch {
      setSaveMsg('Save failed — try again')
      addEventLog(`Failed to update destination: ${channel.label}`, 'error')
    } finally {
      setSaving(false)
    }
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function removeDestination(id, label) {
    if (!token || !id) return false
    setSaving(true)
    setSaveMsg('')
    try {
      const r = await fetch(`/api/destinations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error(`Delete failed (${r.status})`)
      setSaveMsg('Saved!')
      addEventLog(`Destination removed: ${label}`, 'info')
      return true
    } catch {
      setSaveMsg('Save failed — try again')
      addEventLog(`Failed to remove destination: ${label}`, 'error')
      return false
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  // ── Add channel ────────────────────────────────────────────────────────────
  function addChannel() {
    if (isLive) return
    
    // Check channel limit based on user's plan
    if (channels.length >= maxChannels) {
      const requiredPlan = maxChannels === 0 ? 'enterprise' : 'ultimate'
      setUpgradeModal({
        show: true,
        feature: 'Video streaming with more channels',
        requiredPlan
      })
      return
    }
    
    const key = formKey.trim()
    const url = formUrl.trim()
    if (!key) { setFormError('Stream key is required'); return }
    if (!url) { setFormError('Server URL is required'); return }
    if (!/^rtmps?:\/\//i.test(url)) { setFormError('Server URL must start with rtmp:// or rtmps://'); return }
    const p = SOCIAL_PLATFORMS.find((pl) => pl.id === formPlatform)
    const label = formLabel.trim() || p?.name || formPlatform
    const channel = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      platform: formPlatform,
      label,
      serverUrl: url,
      streamKey: key,
      active: false,
    }
    const updated = [...channels, channel]
    setChannels(updated)
    createDestination(channel)
    // Reset form (keep platform selection)
    setFormLabel('')
    setFormKey('')
    setShowFormKey(false)
    setFormError('')
  }

  // ── Delete channel ─────────────────────────────────────────────────────────
  function deleteChannel(id) {
    if (isLive) return
    const target = channels.find((c) => c.id === id)
    setChannels((prev) => prev.filter((c) => c.id !== id))
    removeDestination(id, target?.label || 'channel')
  }

  // ── Toggle Staged / Muted ──────────────────────────────────────────────────
  function toggleActive(id) {
    if (isLive) return
    let toggled = null
    const updated = channels.map((c) => {
      if (c.id === id) {
        toggled = { ...c, active: !c.active }
        return toggled
      }
      return c
    })
    setChannels(updated)
    if (toggled) {
      updateDestination(toggled)
      addEventLog(`${toggled.label} set to ${toggled.active ? 'Staged' : 'Muted'}`, toggled.active ? 'live' : 'info')
    }
  }

  const selectedPlatform = SOCIAL_PLATFORMS.find((p) => p.id === formPlatform) || SOCIAL_PLATFORMS[0]

  return (
    <div className="space-y-6">

      {/* ── Video Preview — mirrored with radio page's Go Live Video button via shared StreamContext ── */}
      {!manualOnly && (maxChannels > 0 ? (
        <StudioCompositor
          isLive={videoStatus === 'live'}
          videoKey={audioKey}
          isSuspended={isSuspended}
        />
      ) : (
        // Locked video preview for plans without video streaming
        <div className="bg-black border border-gray-800 rounded-xl overflow-hidden relative">
          <div className="relative w-full" style={{ aspectRatio: '16/9', background: '#0a0a0a' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="text-center px-4">
                <p className="text-white font-semibold text-lg mb-1">Video Streaming Locked</p>
                <p className="text-gray-400 text-sm mb-4">Upgrade to Enterprise or Ultimate to broadcast live video</p>
                <button
                  onClick={() => setUpgradeModal({ show: true, feature: 'Video Live Streaming', requiredPlan: 'enterprise' })}
                  className="px-5 py-2.5 rounded-lg rio-logo-gradient text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/40"
                >
                  Upgrade to Unlock
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-t border-gray-800">
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p className="text-xs text-gray-500">Available in <span className="text-amber-400 font-semibold">Enterprise</span> and <span className="text-amber-400 font-semibold">Ultimate</span> plans</p>
          </div>
        </div>
      ))}

      {!manualOnly && maxChannels > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-950/40">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Stream Metrics</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-800/70 rounded-lg px-3 py-2">
                <div className="text-[10px] uppercase text-gray-500">CPU</div>
                <div className="text-white font-mono text-lg">{metrics.cpu.toFixed(1)}%</div>
              </div>
              <div className="bg-gray-800/70 rounded-lg px-3 py-2">
                <div className="text-[10px] uppercase text-gray-500">Bandwidth</div>
                <div className="text-white font-mono text-lg">{metrics.bandwidth.toFixed(2)} Mbps</div>
              </div>
              <div className="bg-gray-800/70 rounded-lg px-3 py-2">
                <div className="text-[10px] uppercase text-gray-500">FPS</div>
                <div className="text-white font-mono text-lg">{Math.round(metrics.fps)}</div>
              </div>
              <div className="bg-gray-800/70 rounded-lg px-3 py-2">
                <div className="text-[10px] uppercase text-gray-500">Active Streams</div>
                <div className="text-white font-mono text-lg">{metrics.active_streams}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-950/40">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Routing Console</p>
            </div>
            <div className="p-3 h-44 overflow-y-auto font-mono text-xs bg-gray-950">
              {eventLogs.length === 0 && <div className="text-gray-600">Waiting for events…</div>}
              {eventLogs.map((l, i) => (
                <div key={`${l.t}-${i}`} className="mb-1">
                  <span className="text-gray-600">[{l.t}]</span>{' '}
                  <span className={l.kind === 'error' ? 'text-red-400' : l.kind === 'live' ? 'text-green-300' : 'text-gray-300'}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sync from OAuth (if applicable) ── */}
      {/* TODO: Implement SyncOAuthButton component for OAuth integration
      {maxChannels > 0 && (
        <SyncOAuthButton
          onSyncComplete={(synced) => {
            setChannels((prev) => {
            const next = [...prev]
            synced.forEach((dest) => {
              const existingIdx = next.findIndex((ch) => ch.platform === dest.platform)
              if (existingIdx >= 0) {
                next[existingIdx] = {
                  ...next[existingIdx],
                  label: dest.label,
                  serverUrl: dest.server_url,
                  streamKey: dest.stream_key,
                }
              } else {
                next.push({
                  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  platform: dest.platform,
                  label: dest.label,
                  serverUrl: dest.server_url,
                  streamKey: dest.stream_key,
                  active: true,
                })
              }
            })
            saveChannels(next)
            return next
          })
        }}
        disabled={isLive}
      />
      )}
      */}

      {/* ── Platform Connections (Video Settings) disabled per request ── */}
      {false && manualOnly && (maxChannels > 0 ? (
        <PlatformConnections
          connectedPlatforms={connectedPlatforms}
          onDisconnect={async (platformId) => {
            try {
              await fetch(`/api/user/oauth-connections/${platformId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              })
            } catch { /* best-effort */ }
            setConnectedPlatforms((prev) => { const n = { ...prev }; delete n[platformId]; return n })
          }}
          disabled={isLive}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden relative opacity-60">
          <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center px-4">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="text-white font-semibold mb-1">Enterprise Feature</p>
              <button
                onClick={() => setUpgradeModal({ show: true, feature: 'Social Media Platform Connections', requiredPlan: 'enterprise' })}
                className="mt-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all"
              >
                Upgrade
              </button>
            </div>
          </div>
          <PlatformConnections connectedPlatforms={{}} onDisconnect={() => {}} disabled={true} />
        </div>
      ))}

      {/* ── Multistream Destinations ── */}
      {manualOnly && (maxChannels > 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* Section header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <span className="w-8 h-8 rounded-lg bg-gray-700/40 border border-gray-700 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </span>
          <div>
            <h3 className="font-semibold text-white text-sm">Manual Destinations</h3>
            <p className="text-xs text-gray-400">Paste stream keys directly — fallback while OAuth is in development</p>
          </div>
          {isLive && (
            <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-900/30 border border-red-700/40 rounded px-2 py-0.5">● LIVE — editing locked</span>
          )}
        </div>

        {/* ── Add channel form ── */}
        <div className="px-5 py-5 space-y-4 border-b border-gray-800/60">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add Streaming Destination</p>

          {/* Platform dropdown */}
          <div>
            <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">Platform</label>
            <select
              value={formPlatform}
              onChange={(e) => handlePlatformChange(e.target.value)}
              disabled={isLive}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Label + Server URL row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">
                Channel Label
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                disabled={isLive}
                placeholder={selectedPlatform?.name || 'My channel'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">
                Server Ingest URL
              </label>
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                disabled={isLive || (formPlatform !== 'custom' && !!selectedPlatform?.defaultUrl)}
                placeholder="rtmp://"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs"
              />
            </div>
          </div>

          {/* Stream Key */}
          <div>
            <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5 block">
              Stream Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showFormKey ? 'text' : 'password'}
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addChannel() }}
                disabled={isLive}
                placeholder={`Paste your ${selectedPlatform?.name || ''} stream key`}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              />
              <button
                type="button"
                onClick={() => setShowFormKey((v) => !v)}
                disabled={isLive}
                className="p-2 text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-50"
                title={showFormKey ? 'Hide' : 'Show'}
              >
                {showFormKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Documentation link */}
          {selectedPlatform?.keyUrl && (
            <a
              href={selectedPlatform.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-md px-3 py-1.5 transition-opacity hover:opacity-80 ${selectedPlatform.colorBadge}`}
            >
              Get {selectedPlatform.name} Stream Key ↗
            </a>
          )}

          {/* Validation error */}
          {formError && (
            <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {formError}
            </p>
          )}

          {/* Channel limit info and Add button */}
          <div className="flex items-center gap-3">
            <button
              onClick={addChannel}
              disabled={isLive || channels.length >= maxChannels}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-amber-400 border border-red-600/30 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {channels.length >= maxChannels && maxChannels > 0
                ? 'Channel Limit Reached'
                : channels.length >= maxChannels && maxChannels === 0
                ? 'Upgrade to Add Channels'
                : saving
                ? 'Saving…'
                : 'Add / Link Channel'}
            </button>
            {maxChannels > 0 && (
              <div className="text-xs font-semibold text-gray-400 whitespace-nowrap">
                {channels.length} / {maxChannels} {maxChannels === 1 ? 'channel' : 'channels'}
              </div>
            )}
          </div>
        </div>

        {/* ── Connected channels list ── */}
        <div className="px-5 py-5">
          {channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <p className="text-gray-600 text-xs uppercase tracking-widest">No destinations configured</p>
              <p className="text-gray-700 text-[11px]">Add a platform above to start multicasting</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">
                Connected Destinations ({channels.length})
              </p>
              {channels.map((channel) => {
                const p = SOCIAL_PLATFORMS.find((pl) => pl.id === channel.platform) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1]
                const keyVisible = showKeys[channel.id] || false
                return (
                  <div key={channel.id} className={`border ${p.colorBorder} rounded-xl overflow-hidden`}>
                    {/* Card header */}
                    <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${p.colorFrom} to-transparent border-b ${p.colorBorder}`}>
                      <span className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 font-bold text-xs ${p.colorIcon}`}>
                        {channel.label[0]?.toUpperCase() || '?'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate leading-tight">{channel.label}</p>
                        <p className="text-[10px] text-gray-600 truncate font-mono">{channel.serverUrl}</p>
                      </div>
                      <span className={`text-[10px] font-bold border rounded px-2 py-0.5 shrink-0 ${p.colorBadge}`}>{p.badge}</span>

                      {/* Staged / Muted toggle */}
                      <button
                        type="button"
                        onClick={() => toggleActive(channel.id)}
                        disabled={isLive}
                        title={channel.active ? 'Click to mute this destination' : 'Click to stage this destination'}
                        className={`flex items-center gap-1.5 shrink-0 ${isLive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className={`relative w-9 h-5 rounded-full transition-colors ${channel.active ? 'bg-green-600' : 'bg-gray-700'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${channel.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase w-10 ${channel.active ? 'text-green-400' : 'text-gray-600'}`}>
                          {channel.active ? 'Staged' : 'Muted'}
                        </span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteChannel(channel.id)}
                        disabled={isLive}
                        className="text-gray-700 hover:text-red-500 transition-colors ml-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Remove this destination"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>

                    {/* Stream key row */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900/60">
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider shrink-0 w-20">Stream Key</span>
                      <code className="flex-1 text-xs font-mono text-gray-400 truncate">
                        {keyVisible ? channel.streamKey : '•'.repeat(Math.min(channel.streamKey.length, 28))}
                      </code>
                      <button
                        onClick={() => setShowKeys((prev) => ({ ...prev, [channel.id]: !prev[channel.id] }))}
                        className="text-gray-600 hover:text-gray-400 transition-colors"
                        title={keyVisible ? 'Hide stream key' : 'Show stream key'}
                      >
                        {keyVisible ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                      <CopyButton text={channel.streamKey} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Save feedback */}
          {saveMsg && (
            <p className={`mt-3 text-xs font-medium ${saveMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </div>
      ) : (
        // Locked multistream destinations
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden relative opacity-60">
          <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center px-4">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="text-white font-semibold mb-1">Enterprise Feature</p>
              <p className="text-gray-400 text-sm mb-3">Multistream to multiple platforms simultaneously</p>
              <button
                onClick={() => setUpgradeModal({ show: true, feature: 'Multistream Destinations', requiredPlan: 'enterprise' })}
                className="mt-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all"
              >
                Upgrade
              </button>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
              <span className="w-8 h-8 rounded-lg bg-gray-700/40 border border-gray-700 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-white text-sm">Manual Destinations</h3>
                <p className="text-xs text-gray-400">Available with video streaming</p>
              </div>
            </div>
            <div className="px-5 py-16 flex flex-col items-center justify-center gap-2">
              <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <p className="text-gray-600 text-xs">Upgrade to configure multistream destinations</p>
            </div>
          </div>
        </div>
      ))}

      {/* Upgrade Modal */}
      {upgradeModal.show && (
        <UpgradeModal
          requiredPlan={upgradeModal.requiredPlan}
          featureName={upgradeModal.feature}
          onClose={() => setUpgradeModal({ show: false, feature: null, requiredPlan: null })}
        />
      )}
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
  // VIDEO DISABLED: video stream workspace tab removed.
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
  const fallbackRtmpBase = `rtmp://${host}:1935/live`
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

  // Use personal credentials when available, otherwise fall back to shared defaults
  // rtmp_ingest_base is the base without the key; fall back to derived hostname URL
  const rtmpBase = creds?.rtmp_ingest_base ?? fallbackRtmpBase
  const audioKey = creds?.stream_key ?? fallbackAudioKey

  const [tab, setTab] = useState('listeners')
  const { liveStreams, viewers } = useStreamDashboard()

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
          host={host}
          sourcePassword={creds?.source_password ?? ''}
          creds={creds}
          isSuspended={isSuspended}
        />
      </div>
      <div style={{ display: tab === 'audio' ? undefined : 'none' }}>
        <AudioEncoderTab audioKey={audioKey} host={host} listenUrl={creds?.listen_url} isSuspended={isSuspended} />
      </div>
      {/* VIDEO DISABLED: camera compositor and multistream workspace are not mounted. */}
      {tab === 'listeners' && <ListenersPage />}
    </div>
  )
}
