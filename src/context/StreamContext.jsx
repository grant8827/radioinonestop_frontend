import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useAudioEngine } from './AudioEngine'

const StreamCtx = createContext(null)

export function StreamProvider({ children }) {
  const { token } = useAuth()
  const audioEngine = useAudioEngine()

  // ── Radio stream ──────────────────────────────────────────────────────────
  const [radioStatus, setRadioStatus] = useState('idle') // idle | connecting | live | stopped | error
  const radioWsRef         = useRef(null)
  const radioRecorderRef   = useRef(null)
  const radioKeepaliveRef  = useRef(null)
  const radioStatusRef     = useRef('idle')

  // ── Icecast encoder shared state (consumed by NowPlaying button) ──────────
  const [broadcastMode, setBroadcastMode] = useState('icecast') // 'hub' | 'icecast'
  const [icecastStatus, setIcecastStatus] = useState('idle')
  const icecastStartRef = useRef(null) // set by IcecastEncoder on mount
  const icecastStopRef  = useRef(null) // set by IcecastEncoder on mount
  // ── Reconnect after refresh ─────────────────────────────────────────────
  const [reconnectNeeded, setReconnectNeeded] = useState(false)
  const [reconnectMode,   setReconnectMode]   = useState('icecast')
  const liveStateRef = useRef({ radio: false, icecast: false, mode: 'icecast' })
  function setRadioStatusBoth(s) { setRadioStatus(s); radioStatusRef.current = s }

  // Keep liveStateRef in sync so the beforeunload handler always reads current values
  useEffect(() => {
    liveStateRef.current = {
      radio:   radioStatus === 'live',
      icecast: icecastStatus === 'live',
      mode:    broadcastMode,
    }
  }, [radioStatus, icecastStatus, broadcastMode])

  function radioCleanup() {
    if (radioKeepaliveRef.current) { clearInterval(radioKeepaliveRef.current); radioKeepaliveRef.current = null }
    if (radioRecorderRef.current) { try { radioRecorderRef.current.stop() } catch {} radioRecorderRef.current = null }
    if (radioWsRef.current) { try { radioWsRef.current.close() } catch {} radioWsRef.current = null }
  }

  const startRadio = useCallback(async () => {
    if (!token) return
    const s = radioStatusRef.current
    if (s === 'live' || s === 'connecting') return
    try {
      setRadioStatusBoth('connecting')
      await audioEngine?.resume()

      const stream = audioEngine?.getStreamTrack?.()
      if (!stream || stream.getTracks().length === 0) {
        setRadioStatusBoth('error')
        return
      }

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/encode?token=${encodeURIComponent(token)}`)
      radioWsRef.current = ws
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => ws.send(JSON.stringify({ action: 'broadcast' }))

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.status === 'live') {
            setRadioStatusBoth('live')
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus' : 'audio/webm'
            const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 })
            radioRecorderRef.current = recorder
            recorder.ondataavailable = (ev) => {
              if (ev.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(ev.data)
            }
            recorder.start(250)
            // Keepalive: server drops the WS if no frame arrives within 15s.
            // During silence the recorder may not produce data, so send a ping
            // every 10s that the server ignores but which resets its read deadline.
            radioKeepaliveRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'ping' }))
            }, 10_000)
          } else if (msg.status === 'stopped') {
            setRadioStatusBoth('stopped')
            radioCleanup()
          } else if (msg.status === 'error') {
            setRadioStatusBoth('error')
            radioCleanup()
          }
        } catch {}
      }

      ws.onerror = () => { setRadioStatusBoth('error'); radioCleanup() }
      ws.onclose = () => {
        if (radioStatusRef.current === 'live' || radioStatusRef.current === 'connecting') {
          setRadioStatusBoth('stopped')
          radioCleanup()
        }
      }
    } catch {
      setRadioStatusBoth('error')
      radioCleanup()
    }
  }, [token, audioEngine])

  const stopRadio = useCallback(() => {
    if (radioWsRef.current?.readyState === WebSocket.OPEN) {
      radioWsRef.current.send(JSON.stringify({ action: 'stop' }))
    }
    setRadioStatusBoth('idle')
    radioCleanup()
  }, [])

  // ── Video stream ──────────────────────────────────────────────────────────
  const [videoStatus, setVideoStatus] = useState('idle') // idle | connecting | live | stopped | error
  const videoPcRef     = useRef(null)
  const videoStreamRef = useRef(null)
  const videoStatusRef = useRef('idle')

  function setVideoStatusBoth(s) { setVideoStatus(s); videoStatusRef.current = s }

  function videoCleanup() {
    if (videoPcRef.current) { videoPcRef.current.close(); videoPcRef.current = null }
    if (videoStreamRef.current) { videoStreamRef.current.getTracks().forEach(t => t.stop()); videoStreamRef.current = null }
    // Stop any running FFmpeg relay for this user (best-effort, fire-and-forget)
    if (token) {
      fetch('/api/stream/relay/stop', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }

  // providedStream: pass a camera/getUserMedia stream from SocialLive so we reuse it;
  //                 pass null (default) to capture a screen via getDisplayMedia.
  const startVideo = useCallback(async (videoKey, providedStream = null) => {
    if (!token || !videoKey) return
    const s = videoStatusRef.current
    if (s === 'live' || s === 'connecting') return
    try {
      setVideoStatusBoth('connecting')
      await audioEngine?.resume()

      let displayStream
      if (providedStream) {
        displayStream = providedStream
      } else {
        // Default to screen capture if nothing provided
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        })
      }
      videoStreamRef.current = displayStream

      // Mix in the Mixer's master audio output
      const audioTrack = audioEngine?.getStreamTrack?.()?.getTracks()[0]
      if (audioTrack) displayStream.addTrack(audioTrack)

      const pc = new RTCPeerConnection({ iceServers: [] })
      videoPcRef.current = pc
      displayStream.getTracks().forEach(track => pc.addTrack(track, displayStream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('ICE gathering timed out')), 10000)
        if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); return }
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve() }
        })
      })

      const res = await fetch(`/webrtc/${videoKey}/whip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp', Authorization: `Bearer ${token}` },
        body: pc.localDescription.sdp,
      })
      if (!res.ok) throw new Error(`WHIP ${res.status}`)

      const answer = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answer })

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setVideoStatusBoth('live')
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setVideoStatusBoth('stopped')
          videoCleanup()
        }
      }

      // Only attach an 'ended' auto-stop listener when we own the stream (screen share)
      if (!providedStream) {
        displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          setVideoStatusBoth('stopped')
          videoCleanup()
        })
      }

      // Give MediaMTX a moment to initialize the stream internally before starting the relay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Start FFmpeg relay: pull from MediaMTX RTSP → push to user's active destinations
      const relayRes = await fetch('/api/stream/relay/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: videoKey }),
      })
      if (!relayRes.ok) {
        throw new Error(`Relay failed to start: ${relayRes.status}`)
      }

      setVideoStatusBoth('live')
    } catch (err) {
      // User cancelled getDisplayMedia → go back to idle rather than error
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        setVideoStatusBoth('idle')
      } else {
        setVideoStatusBoth('error')
      }
      videoCleanup()
    }
  }, [token, audioEngine])

  const stopVideo = useCallback(() => {
    setVideoStatusBoth('idle')
    videoCleanup()
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { radioCleanup(); videoCleanup() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before page close/refresh when a stream is live, and save state for auto-reconnect
  useEffect(() => {
    const handler = (e) => {
      const { radio, icecast, mode } = liveStateRef.current
      if (radio || icecast) {
        localStorage.setItem('stream_reconnect', JSON.stringify({ radio, icecast, mode }))
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // On mount (once token is available): check if we need to offer a reconnect
  useEffect(() => {
    if (!token) return
    const saved = localStorage.getItem('stream_reconnect')
    if (!saved) return
    localStorage.removeItem('stream_reconnect')
    try {
      const { radio, icecast, mode } = JSON.parse(saved)
      if (radio || icecast) {
        setReconnectMode(radio ? 'radio' : mode)
        setReconnectNeeded(true)
      }
    } catch {}
  }, [token])

  const doReconnect = useCallback(async () => {
    setReconnectNeeded(false)
    if (reconnectMode === 'radio') {
      await startRadio()
    } else {
      icecastStartRef.current?.()
    }
  }, [reconnectMode, startRadio])

  const dismissReconnect = useCallback(() => setReconnectNeeded(false), [])

  return (
    <StreamCtx.Provider value={{
      radioStatus, startRadio, stopRadio,
      videoStatus, startVideo, stopVideo,
      broadcastMode, setBroadcastMode,
      icecastStatus, setIcecastStatus,
      icecastStartRef, icecastStopRef,
      reconnectNeeded, doReconnect, dismissReconnect,
    }}>
      {children}
    </StreamCtx.Provider>
  )
}

export function useStream() {
  return useContext(StreamCtx)
}
