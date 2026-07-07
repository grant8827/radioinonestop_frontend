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
  const radioWakeLockRef   = useRef(null)

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
    radioWakeLockRef.current?.release().catch(() => {})
    radioWakeLockRef.current = null
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
            // Prevent the OS/browser from suspending this tab (and its AudioContext/
            // MediaRecorder) while broadcasting — a suspended tab stops sending audio
            // to the backend, which starves ffmpeg and drops the Icecast source.
            if ('wakeLock' in navigator && !radioWakeLockRef.current) {
              navigator.wakeLock.request('screen')
                .then(lock => { radioWakeLockRef.current = lock })
                .catch(() => {})
            }
            if (radioRecorderRef.current && radioRecorderRef.current.state !== 'inactive') return
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

      ws.onerror = () => { 
        // We rely on ws.onclose to handle the reconnect loop smoothly
      }
      ws.onclose = () => {
        if (radioStatusRef.current === 'live' || radioStatusRef.current === 'connecting') {
          setRadioStatusBoth('reconnecting')
          radioCleanup()
          setTimeout(() => {
            if (radioStatusRef.current === 'reconnecting') {
              startRadio()
            }
          }, 1500)
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

  // VIDEO DISABLED: camera/screen capture, WHIP publishing, and RTMP relay
  // controls were removed. Inert values keep old unmounted components compatible.
  const videoStatus = 'disabled'
  const startVideo = useCallback(async () => {}, [])
  const stopVideo = useCallback(() => {}, [])

  // Cleanup on unmount
  useEffect(() => () => { radioCleanup() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-acquire the wake lock if it was released by the OS (e.g. screen locked then
  // unlocked) while still broadcasting.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (radioStatusRef.current === 'live' && 'wakeLock' in navigator && !radioWakeLockRef.current) {
        navigator.wakeLock.request('screen')
          .then(lock => { radioWakeLockRef.current = lock })
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

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
