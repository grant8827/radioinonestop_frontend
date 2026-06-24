import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAudioEngine } from '../context/AudioEngine'

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

function nameFromEmail(email) {
  if (!email) return null
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function microphoneErrorMessage(error) {
  const message = error?.message || String(error || '')
  if (/permission|denied|notallowed/i.test(message)) return 'Microphone access was denied. Allow microphone access in your browser and try again.'
  if (/notfound|device|requested device/i.test(message)) return 'No usable microphone was found. Check the microphone connection and try again.'
  return message ? `Microphone could not start: ${message}` : 'Microphone could not start. Check browser microphone access and try again.'
}

// Plays the host's audio stream for guests
function RemoteAudio({ stream }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null
  }, [stream])
  return <audio ref={ref} autoPlay playsInline />
}

// ── Mute / unmute control ──────────────────────────────────────────────────────
function MuteButton({ useMixerSend = false, muted, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
        muted ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
      }`}
    >
      {muted ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
          </svg>
          {useMixerSend ? 'Unmute Send' : 'Unmute'}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
          {useMixerSend ? 'Mute Send' : 'Mute'}
        </>
      )}
    </button>
  )
}

// ── Leave button ───────────────────────────────────────────────────────────────
function LeaveButton({ onLeave }) {
  return (
    <button
      onClick={onLeave}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-red-700 hover:bg-red-600 text-white transition-all"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
      </svg>
      Leave
    </button>
  )
}

// ── Settings panel ─────────────────────────────────────────────────────────────
function SettingsPanel({ inviteUrl, passcode, limit, onPasscodeChange, onLimitChange }) {
  const [copied, setCopied] = useState(false)
  const url = inviteUrl || window.location.href

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [url])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my conference call', url }) } catch {}
    } else {
      handleCopy()
    }
  }, [url, handleCopy])

  return (
    <div className="p-4 flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passcode</span>
          <input
            type="text"
            value={passcode}
            onChange={(e) => onPasscodeChange(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 32))}
            placeholder="Optional"
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest limit</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
          >
            <option value="8">8 guests</option>
            <option value="16">16 guests</option>
            <option value="32">32 guests</option>
          </select>
        </label>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Invite link</p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-300 break-all font-mono select-all">
            {url}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                copied ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 text-gray-200 hover:bg-gray-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 text-center">Anyone with this link can join without signing in.</p>
    </div>
  )
}

// ── Participant tile ───────────────────────────────────────────────────────────
function ParticipantTile({ peerId, username, isLocalPeer, iAmHost, speaking, control, onRouteChange, onGainChange, onMuteToggle, onDisconnect }) {
  const name = username || 'Guest'
  const route = control?.route || 'pgm'
  const gain = control?.gain ?? 0.8
  const muted = control?.muted ?? false
  const disconnected = control?.disconnected ?? false
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className={`border rounded-lg p-3 bg-gray-900 ${route === 'pgm' ? 'border-red-700/70' : 'border-green-700/60'} ${disconnected ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div
          className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            route === 'pgm' ? 'bg-red-900' : 'bg-green-950'
          } ${speaking && !muted && !disconnected ? 'ring-4 ring-yellow-300 ring-offset-2 ring-offset-gray-950' : 'ring-2 ring-gray-800'}`}
        >
          <span className="text-lg font-bold text-white select-none">{initials}</span>
          {muted && (
            <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border-2 border-gray-950">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              route === 'pgm' ? 'bg-red-600 text-white' : 'bg-green-700 text-white'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {isLocalPeer ? 'Host' : route === 'pgm' ? 'On-Air' : 'Cue'}
            </span>
            {speaking && !disconnected && <span className="text-[10px] text-yellow-300">Voice active</span>}
            {disconnected && <span className="text-[10px] text-red-300">Dropped locally</span>}
          </div>
        </div>
      </div>

      {iAmHost && !isLocalPeer && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onRouteChange(peerId, 'cue')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${route === 'cue' ? 'bg-green-700 border-green-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}`}>
              CUE
            </button>
            <button type="button" onClick={() => onRouteChange(peerId, 'pgm')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${route === 'pgm' ? 'bg-red-700 border-red-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}`}>
              PGM
            </button>
          </div>
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
              <span>Gain</span><span>{Math.round(gain * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" value={gain}
              onChange={(e) => onGainChange(peerId, Number(e.target.value))}
              className="w-full accent-red-500" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onMuteToggle(peerId)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${muted ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              {muted ? 'Unmute' : 'Force Mute'}
            </button>
            <button type="button" onClick={() => onDisconnect(peerId)}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-gray-950 border border-red-900/70 text-red-300 hover:bg-red-950">
              Disconnect
            </button>
          </div>
        </div>
      )}
      {iAmHost && isLocalPeer && (
        <p className="mt-3 text-xs text-gray-500">Mixer send is published as the host return feed.</p>
      )}
    </div>
  )
}

// ── Audio level meter ──────────────────────────────────────────────────────────
function AudioLevelMeter({ analyser, label, muted = false }) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    let rafId = 0
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (let i = 0; i < data.length; i += 1) {
        const value = Math.abs(data[i] - 128) / 128
        if (value > peak) peak = value
      }
      setLevel(muted ? 0 : Math.min(1, peak * 2.2))
      rafId = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(rafId)
  }, [analyser, muted])

  const displayedLevel = analyser ? level : 0

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-gray-700 bg-gray-800">
      <span className="text-[10px] text-gray-400">{label}</span>
      <div className="flex items-end gap-0.5 h-3">
        {Array.from({ length: 8 }).map((_, idx) => {
          const threshold = (idx + 1) / 8
          const active = displayedLevel >= threshold
          const color = idx < 4 ? 'bg-green-400' : idx < 6 ? 'bg-yellow-400' : 'bg-red-400'
          return <span key={idx} className={`w-1 rounded-sm transition-all ${active ? color : 'bg-gray-700'}`} style={{ height: `${4 + idx}px` }} />
        })}
      </div>
    </div>
  )
}

function ConferenceSendMeter({ audioEngine, muted }) {
  return <AudioLevelMeter analyser={audioEngine?.getConferenceSendAnalyser?.()} label="Send" muted={muted} />
}

function ConferenceReturnMeter({ audioEngine }) {
  return <AudioLevelMeter analyser={audioEngine?.getConferenceReturnAnalyser?.()} label="Return" />
}

function BusCanvas({ analyser, label, color, muted = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
    let rafId = 0

    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#030712'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 1
      for (let y = 24; y < height; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
      }
      ctx.fillStyle = '#9ca3af'
      ctx.font = '12px sans-serif'
      ctx.fillText(label, 12, 20)
      ctx.strokeStyle = muted ? '#4b5563' : color
      ctx.lineWidth = 2
      ctx.beginPath()
      if (analyser && data && !muted) {
        analyser.getByteTimeDomainData(data)
        const slice = width / data.length
        for (let i = 0; i < data.length; i += 1) {
          const y = (data[i] / 255) * height
          const x = i * slice
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
      } else {
        ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2)
      }
      ctx.stroke()
      rafId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [analyser, color, label, muted])

  return <canvas ref={canvasRef} width="640" height="112" className="h-28 w-full rounded-lg border border-gray-800 bg-gray-950" />
}

// ── Participant grid ───────────────────────────────────────────────────────────
function GroupTab({ myPeerId, iAmHost, peers, participantControls, speakingMap, onRouteChange, onGainChange, onMuteToggle, onDisconnect }) {
  const myEntry = myPeerId ? [{ peerId: myPeerId, isLocal: true }] : []
  const others = Object.keys(peers)
    .filter((id) => id !== myPeerId)
    .map((id) => ({ peerId: id, isLocal: false }))
  const allPeers = [...myEntry, ...others]

  if (allPeers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-600">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <p className="text-sm">No one else is here yet</p>
        <p className="text-xs text-gray-700">Share the link to invite others</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
      {allPeers.map(({ peerId, isLocal }) => (
        <ParticipantTile
          key={peerId}
          peerId={peerId}
          username={peers[peerId]?.username || (isLocal ? 'You' : 'Guest')}
          isLocalPeer={isLocal}
          iAmHost={iAmHost}
          speaking={speakingMap[peerId] || false}
          control={participantControls[peerId]}
          onRouteChange={onRouteChange}
          onGainChange={onGainChange}
          onMuteToggle={onMuteToggle}
          onDisconnect={onDisconnect}
        />
      ))}
    </div>
  )
}

// ── Page entry point ───────────────────────────────────────────────────────────
export default function ConferenceRoom({ roomId: propRoomId, onLeave, username: propUsername, isActive, onGoToMixer }) {
  const { roomId: routeRoomId } = useParams()
  const roomId = propRoomId ?? routeRoomId
  const inviteUrl = `${window.location.origin}/conference/${roomId}`
  const { user, token: authToken } = useAuth()
  const audioEngine = useAudioEngine()

  // hasBecomeVisible triggers WS connect — set once when tab is first selected
  const [hasBecomeVisible, setHasBecomeVisible] = useState(false)
  useEffect(() => {
    if (!hasBecomeVisible && (isActive || !propRoomId)) setHasBecomeVisible(true)
  }, [isActive, propRoomId, hasBecomeVisible])

  const isGuest = !authToken && !propUsername
  const [guestName, setGuestName] = useState('')
  const [guestNameSubmitted, setGuestNameSubmitted] = useState(false)
  const username = propUsername || (isGuest ? guestName : null) || nameFromEmail(user?.email) || 'Guest'
  const readyToJoin = isGuest ? guestNameSubmitted : hasBecomeVisible

  // UI state
  const [connected, setConnected] = useState(false)
  const [myPeerId, setMyPeerId] = useState(null)
  const [iAmHost, setIAmHost] = useState(false)
  const [peers, setPeers] = useState({})
  const [remoteStreams, setRemoteStreams] = useState({}) // guest: peerId → MediaStream from host
  const [micMuted, setMicMuted] = useState(false)
  const [sendMuted, setSendMuted] = useState(false)
  const [participantControls, setParticipantControls] = useState({})
  const [speakingMap] = useState({})
  const [tab, setTab] = useState('group')
  const [passcode, setPasscode] = useState('')
  const [limit, setLimit] = useState('8')
  const [conferenceChannelId, setConferenceChannelId] = useState(null)
  const [outboundStatus, setOutboundStatus] = useState({ status: 'connecting', message: '' })
  const [microphoneError, setMicrophoneError] = useState('')
  const [error, setError] = useState(null)
  const [disconnected, setDisconnected] = useState(false)

  // Refs that don't need to trigger re-render
  const wsRef = useRef(null)
  const pcsRef = useRef({})
  const micStreamRef = useRef(null)
  const isMountedRef = useRef(false)
  const leavingRef = useRef(false)
  const isHostRef = useRef(false)

  const secureInviteUrl = useMemo(() => {
    try {
      const url = new URL(inviteUrl)
      if (passcode) url.searchParams.set('pwd', passcode)
      else url.searchParams.delete('pwd')
      if (limit) url.searchParams.set('limit', limit)
      return url.toString()
    } catch {
      return inviteUrl
    }
  }, [inviteUrl, passcode, limit])

  // Poll conferenceChannelId for host
  useEffect(() => {
    if (!audioEngine) return
    const id = setInterval(() => setConferenceChannelId(audioEngine.getConferenceChannelId?.() ?? null), 1000)
    return () => clearInterval(id)
  }, [audioEngine])

  // For guests: acquire mic BEFORE opening the WebSocket so it's guaranteed
  // available when the host's offer arrives. micReady gates the signaling effect.
  const [micReady, setMicReady] = useState(!!audioEngine)
  useEffect(() => {
    if (!readyToJoin) return
    if (audioEngine) { setMicReady(true); return }
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        micStreamRef.current = stream
        setMicReady(true)
      })
      .catch((err) => {
        if (!cancelled) {
          setMicrophoneError(microphoneErrorMessage(err))
          setMicReady(true) // proceed without mic so the WS still opens
        }
      })
    return () => {
      cancelled = true
      micStreamRef.current?.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
  }, [readyToJoin, audioEngine])

  // WebRTC signaling lifecycle — runs only after mic is ready
  useEffect(() => {
    if (!micReady || !roomId) return

    isMountedRef.current = true
    leavingRef.current = false

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = new URL(`${proto}://${window.location.host}/ws/conference`)
    wsUrl.searchParams.set('room', roomId)
    wsUrl.searchParams.set('username', username)
    if (authToken) wsUrl.searchParams.set('token', authToken)

    const ws = new WebSocket(wsUrl.toString())
    wsRef.current = ws

    const sendWs = (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    }

    const getHostMixerTrack = () => {
      const stream = audioEngine?.getConferenceSendTrack?.() || audioEngine?.getStreamTrack?.()
      return stream?.getAudioTracks?.()?.[0] ?? null
    }

    const addTracksToPC = (pc, isMakingOffer) => {
      if (isHostRef.current) {
        const track = getHostMixerTrack()
        if (track) {
          try { pc.addTrack(track.clone(), new MediaStream([track])) } catch {}
        }
      } else {
        const tracks = micStreamRef.current?.getAudioTracks() || []
        tracks.forEach((t) => {
          try { pc.addTrack(t, micStreamRef.current) } catch {}
        })
      }
    }

    const createPC = (peerId) => {
      const existing = pcsRef.current[peerId]
      if (existing) { existing.close(); delete pcsRef.current[peerId] }

      const pc = new RTCPeerConnection(RTC_CONFIG)
      pcsRef.current[peerId] = pc

      pc.onicecandidate = (e) => {
        if (e.candidate) sendWs({ type: 'candidate', to: peerId, candidate: e.candidate.toJSON() })
      }

      pc.ontrack = (e) => {
        if (!isMountedRef.current) return
        const stream = e.streams[0] || new MediaStream([e.track])
        if (isHostRef.current) {
          audioEngine?.resume?.()
          audioEngine?.connectConferenceStream?.(peerId, e.track, { participantId: peerId })
          const ctrl = { route: 'pgm', gain: 0.8, muted: false, disconnected: false }
          audioEngine?.setConferenceParticipantControl?.(peerId, ctrl)
          setParticipantControls((prev) => prev[peerId] ? prev : { ...prev, [peerId]: ctrl })
          setOutboundStatus({ status: 'live', message: 'Live' })
        } else {
          setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }))
        }
      }

      return pc
    }

    const makeOffer = async (peerId) => {
      const pc = createPC(peerId)
      addTracksToPC(pc)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendWs({ type: 'offer', to: peerId, sdp: pc.localDescription.sdp })
      } catch (err) {
        console.warn('[conference] offer failed:', err)
      }
    }

    ws.onopen = () => {
      if (audioEngine) setOutboundStatus({ status: 'connecting', message: 'Connecting mixer send...' })
    }

    ws.onmessage = async (e) => {
      if (!isMountedRef.current) return
      let msg
      try { msg = JSON.parse(e.data) } catch { return }

      switch (msg.type) {
        case 'joined': {
          isHostRef.current = msg.isHost
          setMyPeerId(msg.peerId)
          setIAmHost(msg.isHost)
          setConnected(true)
          // Build initial peers map (self + existing)
          const initial = { [msg.peerId]: { username, isHost: msg.isHost } }
          for (const p of (msg.peers || [])) {
            initial[p.peerId] = { username: p.username, isHost: p.isHost }
          }
          setPeers(initial)
          // Host initiates with all existing guests
          if (msg.isHost) {
            for (const p of (msg.peers || [])) {
              if (!p.isHost) makeOffer(p.peerId)
            }
            const track = getHostMixerTrack()
            setOutboundStatus({ status: track ? 'live' : 'connecting', message: track ? 'Live' : 'Connecting mixer send...' })
          }
          break
        }
        case 'peer_joined': {
          setPeers((prev) => ({ ...prev, [msg.peerId]: { username: msg.username, isHost: msg.isHost } }))
          if (isHostRef.current && !msg.isHost) {
            makeOffer(msg.peerId)
          }
          break
        }
        case 'offer': {
          const pc = createPC(msg.from)
          addTracksToPC(pc)
          try {
            await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendWs({ type: 'answer', to: msg.from, sdp: pc.localDescription.sdp })
          } catch (err) {
            console.warn('[conference] answer failed:', err)
          }
          break
        }
        case 'answer': {
          const pc = pcsRef.current[msg.from]
          if (pc) {
            try { await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp }) } catch {}
          }
          break
        }
        case 'candidate': {
          const pc = pcsRef.current[msg.from]
          if (pc) {
            try { await pc.addIceCandidate(msg.candidate) } catch {}
          }
          break
        }
        case 'peer_left': {
          const pc = pcsRef.current[msg.peerId]
          if (pc) { pc.close(); delete pcsRef.current[msg.peerId] }
          if (isHostRef.current) {
            audioEngine?.disconnectConferenceStream?.(msg.peerId)
          } else {
            setRemoteStreams((prev) => { const n = { ...prev }; delete n[msg.peerId]; return n })
          }
          setPeers((prev) => { const n = { ...prev }; delete n[msg.peerId]; return n })
          setParticipantControls((prev) => { const n = { ...prev }; delete n[msg.peerId]; return n })
          break
        }
        default:
          break
      }
    }

    ws.onerror = () => {
      if (isMountedRef.current && !leavingRef.current) setError('WebSocket connection error')
    }

    ws.onclose = () => {
      if (isMountedRef.current && !leavingRef.current) setDisconnected(true)
    }

    return () => {
      isMountedRef.current = false
      ws.close()
      Object.values(pcsRef.current).forEach((pc) => { try { pc.close() } catch {} })
      pcsRef.current = {}
      audioEngine?.disconnectAllConferenceStreams?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micReady, roomId])

  const handleLeave = useCallback(() => {
    leavingRef.current = true
    wsRef.current?.close()
    Object.values(pcsRef.current).forEach((pc) => { try { pc.close() } catch {} })
    pcsRef.current = {}
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
    if (onLeave) onLeave()
    else setDisconnected(true)
  }, [onLeave])

  const handleToggleMic = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev
      micStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next })
      return next
    })
  }, [])

  const handleToggleSend = useCallback(() => {
    setSendMuted((prev) => {
      const next = !prev
      audioEngine?.setConferenceSendMuted?.(next)
      setOutboundStatus((s) => ({ ...s, message: next ? 'Muted' : 'Live' }))
      return next
    })
  }, [audioEngine])

  const updateParticipantControl = useCallback((peerId, patch) => {
    setParticipantControls((prev) => {
      const current = prev[peerId] || { route: 'pgm', gain: 0.8, muted: false, disconnected: false }
      const next = { ...current, ...patch }
      audioEngine?.setConferenceParticipantControl?.(peerId, next)
      return { ...prev, [peerId]: next }
    })
  }, [audioEngine])

  const handleRouteChange = useCallback((peerId, route) => {
    updateParticipantControl(peerId, { route, disconnected: false })
    if (route === 'pgm') {
      audioEngine?.setupConferenceChannel?.()
      audioEngine?.setConferenceActive?.(true, false, 0.8)
    }
  }, [audioEngine, updateParticipantControl])

  const handleGainChange = useCallback((peerId, gain) => {
    updateParticipantControl(peerId, { gain, disconnected: false })
  }, [updateParticipantControl])

  const handleMuteToggle = useCallback((peerId) => {
    setParticipantControls((prev) => {
      const current = prev[peerId] || { muted: false }
      const next = { ...current, muted: !current.muted, disconnected: false }
      audioEngine?.setConferenceParticipantControl?.(peerId, next)
      return { ...prev, [peerId]: next }
    })
  }, [audioEngine])

  const handleDisconnect = useCallback((peerId) => {
    updateParticipantControl(peerId, { muted: true, disconnected: true })
    audioEngine?.disconnectConferenceStream?.(peerId)
    const pc = pcsRef.current[peerId]
    if (pc) { pc.close(); delete pcsRef.current[peerId] }
  }, [audioEngine, updateParticipantControl])

  // ── Guest name entry ─────────────────────────────────────────────────────────
  if (isGuest && !guestNameSubmitted) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-1">Join Studio Room</h2>
          <p className="text-xs text-gray-500 mb-5">Enter your name so other participants can identify you.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (guestName.trim()) setGuestNameSubmitted(true) }}>
            <input
              type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name" maxLength={64} autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors mb-4"
            />
            <button type="submit" disabled={!guestName.trim()}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
              Join Room
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (disconnected) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-base font-semibold text-white mb-1">Disconnected</p>
          <p className="text-sm text-gray-500 mb-5">You were disconnected from the room.</p>
          <div className="flex gap-3">
            <button
              onClick={() => { if (onLeave) onLeave(); else window.location.href = '/' }}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => { setDisconnected(false); setConnected(false); setMyPeerId(null); setPeers({}); setRemoteStreams({}); setParticipantControls({}); if (isGuest) setGuestNameSubmitted(false) }}
              className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Rejoin
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-2">Could not join room</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={() => setError(null)} className="mt-4 px-4 py-2 rounded-lg bg-gray-800 text-sm hover:bg-gray-700">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Connecting…
        </div>
      </div>
    )
  }

  const statusDotClass = outboundStatus.status === 'live' ? 'bg-green-400'
    : outboundStatus.status === 'error' ? 'bg-red-400'
    : outboundStatus.status === 'mic' ? 'bg-blue-400'
    : 'bg-yellow-400'

  const guestCount = Object.keys(peers).length - 1

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Remote audio elements for guests */}
      {Object.entries(remoteStreams).map(([pid, stream]) => (
        <RemoteAudio key={pid} stream={stream} />
      ))}

      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-sm font-semibold">Conference</span>
          {iAmHost && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-gray-700 bg-gray-800 text-[10px] text-gray-300">
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
              Send: {outboundStatus.message || outboundStatus.status}
            </span>
          )}
          {iAmHost && <ConferenceSendMeter audioEngine={audioEngine} muted={sendMuted} />}
          {iAmHost && <ConferenceReturnMeter audioEngine={audioEngine} />}
        </div>
        <div className="flex items-center gap-2">
          <MuteButton
            useMixerSend={iAmHost}
            muted={iAmHost ? sendMuted : micMuted}
            onToggle={iAmHost ? handleToggleSend : handleToggleMic}
          />
          <LeaveButton onLeave={handleLeave} />
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 flex shrink-0">
        <button
          onClick={() => setTab('group')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'group' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Group
          {guestCount > 0 && (
            <span className="ml-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {guestCount}
            </span>
          )}
        </button>
        {iAmHost && (
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'settings' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        )}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {microphoneError && (
          <div className="mx-4 mt-4 rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
            {microphoneError}
          </div>
        )}

        {iAmHost && tab === 'group' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 pb-0">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-300">Program Bus</span>
                <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-bold text-white">PGM</span>
              </div>
              <BusCanvas
                analyser={audioEngine?.getConferencePgmAnalyser?.() || audioEngine?.getConferenceAnalyser?.()}
                label="Live broadcast feed"
                color="#ef4444"
                muted={sendMuted}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-green-300">Cue Bus</span>
                <span className="rounded-full bg-green-700 px-2 py-0.5 text-[10px] font-bold text-white">CUE</span>
              </div>
              <BusCanvas
                analyser={audioEngine?.getConferenceCueAnalyser?.()}
                label="Off-air talkback"
                color="#22c55e"
              />
            </div>
          </section>
        )}

        {iAmHost && conferenceChannelId === null && tab === 'group' && (
          <div className="mx-4 mt-4 border-2 border-amber-500 bg-amber-950 px-4 py-4 text-amber-100 shadow-lg shadow-amber-950/40">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-gray-950">!</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Conference return is not ready</p>
                <p className="mt-1 text-xs leading-5 text-amber-200">
                  Open Mixer and check the dedicated <strong>CONF</strong> strip so callers can be heard locally and sent on-air.
                </p>
                {onGoToMixer && (
                  <button onClick={onGoToMixer} className="mt-3 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-bold transition-colors">
                    Open Mixer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'group' && (
          <GroupTab
            myPeerId={myPeerId}
            iAmHost={iAmHost}
            peers={peers}
            participantControls={participantControls}
            speakingMap={speakingMap}
            onRouteChange={handleRouteChange}
            onGainChange={handleGainChange}
            onMuteToggle={handleMuteToggle}
            onDisconnect={handleDisconnect}
          />
        )}

        {tab === 'settings' && (
          <SettingsPanel
            inviteUrl={secureInviteUrl}
            passcode={passcode}
            limit={limit}
            onPasscodeChange={setPasscode}
            onLimitChange={setLimit}
          />
        )}
      </main>
    </div>
  )
}
