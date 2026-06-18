import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

// ─── Canvas Visualizer ────────────────────────────────────────────────────────
function CanvasVisualizer({ analyser, isPlaying, isLive }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const phaseRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      if (!isLive) {
        // Off-air message
        ctx.fillStyle = '#1e1e2e'
        ctx.fillRect(0, 0, W, H)
        ctx.font = 'bold 13px system-ui'
        ctx.fillStyle = '#4b5563'
        ctx.textAlign = 'center'
        ctx.fillText('OFF AIR', W / 2, H / 2)
        return
      }

      const BARS = 48
      const gap  = 3
      const bw   = (W - gap * (BARS + 1)) / BARS

      if (analyser && isPlaying) {
        // Live frequency data
        const bufLen = analyser.frequencyBinCount
        const data   = new Uint8Array(bufLen)
        analyser.getByteFrequencyData(data)
        const step = Math.floor(bufLen / BARS)

        for (let i = 0; i < BARS; i++) {
          const val  = data[i * step] / 255
          const bh   = Math.max(3, val * (H - 8))
          const x    = gap + i * (bw + gap)
          const y    = H - bh

          const grad = ctx.createLinearGradient(0, y, 0, H)
          grad.addColorStop(0, '#6366f1')
          grad.addColorStop(1, '#10b981')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.roundRect(x, y, bw, bh, 2)
          ctx.fill()
        }
      } else {
        // Idle sine-wave animation
        phaseRef.current += 0.04
        const p = phaseRef.current
        for (let i = 0; i < BARS; i++) {
          const val = 0.08 + Math.abs(Math.sin(i * 0.32 + p) * 0.22 + Math.sin(i * 0.11 + p * 0.7) * 0.1)
          const bh  = Math.max(3, val * (H - 8))
          const x   = gap + i * (bw + gap)
          const y   = H - bh
          ctx.fillStyle = '#374151'
          ctx.beginPath()
          ctx.roundRect(x, y, bw, bh, 2)
          ctx.fill()
        }
      }
    }

    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [analyser, isPlaying, isLive])

  return (
    <canvas
      ref={canvasRef}
      width={420}
      height={120}
      style={{ width: '100%', height: 120, borderRadius: 8, display: 'block' }}
    />
  )
}

// ─── Vinyl Record SVG ─────────────────────────────────────────────────────────
function VinylRecord({ isSpinning, logoUrl, stationName }) {
  const GROOVES = [90, 80, 70, 60, 50, 42]
  const initial = stationName ? stationName[0].toUpperCase() : '♫'

  return (
    <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
      {/* Record disc */}
      <svg
        width="200" height="200" viewBox="0 0 200 200"
        style={{
          animation: isSpinning ? 'vinyl-spin 8s linear infinite' : 'none',
          display: 'block',
        }}
      >
        {/* Outer disc */}
        <circle cx="100" cy="100" r="98" fill="#111118" stroke="#2a2a3a" strokeWidth="1.5" />
        {/* Groove rings */}
        {GROOVES.map(r => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1e1e2e" strokeWidth="1.2" />
        ))}
        {/* Sheen */}
        <ellipse cx="75" cy="75" rx="30" ry="18"
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        {/* Label circle */}
        <circle cx="100" cy="100" r="30" fill="#1a1a2e" stroke="#6366f1" strokeWidth="1.5" />
        {/* Logo or initial inside label */}
        {logoUrl ? (
          <image href={logoUrl} x="76" y="76" width="48" height="48"
            clipPath="url(#label-clip)" preserveAspectRatio="xMidYMid slice" />
        ) : (
          <text x="100" y="106" textAnchor="middle" fontSize="18"
            fontWeight="800" fill="#6366f1" fontFamily="system-ui">{initial}</text>
        )}
        <defs>
          <clipPath id="label-clip">
            <circle cx="100" cy="100" r="28" />
          </clipPath>
        </defs>
        {/* Centre spindle */}
        <circle cx="100" cy="100" r="4" fill="#0a0a12" stroke="#444" strokeWidth="1" />
      </svg>

      {/* Tone-arm — pivots over/away from record */}
      <svg
        width="90" height="120" viewBox="0 0 90 120"
        style={{
          position: 'absolute',
          top: -10,
          right: -30,
          transformOrigin: '18px 18px',
          transform: isSpinning ? 'rotate(22deg)' : 'rotate(-8deg)',
          transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'none',
        }}
      >
        {/* Pivot base */}
        <circle cx="18" cy="18" r="9" fill="#2a2a3a" stroke="#555" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="4" fill="#111" />
        {/* Arm */}
        <line x1="18" y1="18" x2="52" y2="100" stroke="#555" strokeWidth="3.5" strokeLinecap="round" />
        {/* Headshell */}
        <rect x="46" y="96" width="14" height="6" rx="2" fill="#444" stroke="#666" strokeWidth="1" />
        {/* Stylus */}
        <line x1="53" y1="102" x2="53" y2="108" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ─── Station Modal ─────────────────────────────────────────────────────────────
export default function StationModal({ station, onClose }) {
  const [info, setInfo]         = useState(station)
  const [playing, setPlaying]   = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [playError, setPlayError] = useState('')
  const [icecastUnavailable, setIcecastUnavailable] = useState(false)
  const [volume, setVolume]     = useState(80)
  const [muted, setMuted]       = useState(false)
  const [analyser, setAnalyser] = useState(null)
  const [visible, setVisible]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const audioRef  = useRef(null)
  const hlsRef    = useRef(null)
  const acRef     = useRef(null)
  const srcRef    = useRef(null)
  const pollRef   = useRef(null)
  const listenerSessionRef = useRef(null)
  const heartbeatRef       = useRef(null)
  const autoPlayStartedRef = useRef(false)

  const hlsUrl    = `/hls/${info.slug}/index.m3u8`
  const streamUrl  = `/listen/${info.slug}` // WebM fallback (desktop Chrome/Firefox)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    autoPlayStartedRef.current = false
  }, [station.slug])

  // Poll station status every 10 s
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`/api/stations/${info.slug}`)
        if (r.ok) setInfo(await r.json())
      } catch { /* ignore */ }
    }
    poll()
    pollRef.current = setInterval(poll, 10_000)
    return () => clearInterval(pollRef.current)
  }, [info.slug])

  // If backend publishes a new Icecast URL while this modal is open,
  // allow trying Icecast again on the next play attempt.
  useEffect(() => {
    setIcecastUnavailable(false)
  }, [info.icecast_listen_url])

  // Resume AudioContext if the OS suspended it while the tab/app was backgrounded
  // (e.g. device woke from sleep, user switches back from another app).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && acRef.current?.state === 'suspended') {
        acRef.current.resume().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Volume / mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume / 100
    }
  }, [volume, muted])

  const stopListenerSession = useCallback((keepalive = false) => {
    const sessionID = listenerSessionRef.current
    if (!sessionID) return
    listenerSessionRef.current = null
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    const body = JSON.stringify({ session_id: sessionID })
    if (keepalive && navigator.sendBeacon) {
      navigator.sendBeacon('/api/listeners/stop', new Blob([body], { type: 'application/json' }))
      return
    }
    fetch('/api/listeners/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive,
    }).catch(() => {})
  }, [])

  const startListenerSession = useCallback(async () => {
    if (listenerSessionRef.current) return listenerSessionRef.current
    try {
      const r = await fetch('/api/listeners/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: info.slug }),
      })
      if (!r.ok) return null
      const data = await r.json()
      const sessionID = data.session_id
      if (!sessionID) return null
      listenerSessionRef.current = sessionID
      heartbeatRef.current = setInterval(() => {
        fetch('/api/listeners/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionID }),
          keepalive: true,
        }).catch(() => {})
      }, 15_000)
      return sessionID
    } catch {
      return null
    }
  }, [info.slug])

  // Cleanup HLS + listener session + AudioContext on unmount
  useEffect(() => {
    return () => {
      hlsRef.current?.destroy()
      stopListenerSession(true)
      srcRef.current?.disconnect()
      acRef.current?.close()
    }
  }, [stopListenerSession])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    setConnecting(true)
    setPlayError('')
    hlsRef.current?.destroy()
    hlsRef.current = null

    // Build AudioContext + analyser for visualizer.
    // IMPORTANT: On iOS, routing audio through AudioContext (createMediaElementSource)
    // causes the AudioContext to suspend when the screen locks, killing the stream.
    // We skip the wiring on iOS so the native <audio> element plays uninterrupted in
    // the background (exactly like Spotify/Apple Music). The idle sine animation shows
    // instead of the live waveform, which is the correct trade-off.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (!acRef.current && !isIOS) {
      try {
        const ac           = new (window.AudioContext || window.webkitAudioContext)()
        const analyserNode = ac.createAnalyser()
        analyserNode.fftSize = 128
        analyserNode.smoothingTimeConstant = 0.82
        acRef.current  = ac
        srcRef.current = ac.createMediaElementSource(audio)
        srcRef.current.connect(analyserNode)
        analyserNode.connect(ac.destination)
        setAnalyser(analyserNode)
      } catch (e) {
        // createMediaElementSource unavailable on this platform — idle animation only
      }
    }
    if (acRef.current?.state === 'suspended') acRef.current.resume()

    // Media Session API — registers with the OS "Now Playing" widget so audio
    // keeps playing on the lock screen / when the device sleeps (iOS + Android).
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title:   info.name  || 'Live Radio',
          artist:  info.genre || 'Radio In One Stop',
          album:   'Radio In One Stop',
          artwork: info.logo_url
            ? [{ src: info.logo_url, sizes: '512x512', type: 'image/jpeg' }]
            : [],
        })
        navigator.mediaSession.setActionHandler('play',  () => {
          audioRef.current?.play().catch(() => {})
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          hlsRef.current?.destroy(); hlsRef.current = null
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
          stopListenerSession(true)
          setPlaying(false)
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
        })
        navigator.mediaSession.setActionHandler('stop',  () => {
          hlsRef.current?.destroy(); hlsRef.current = null
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
          stopListenerSession(true)
          setPlaying(false)
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none'
        })
        navigator.mediaSession.playbackState = 'playing'
      } catch (e) { /* MediaSession unavailable */ }
    }

    const hasIcecastStream = !!info.icecast_listen_url && !icecastUnavailable
    const primaryStreamUrl = hasIcecastStream ? info.icecast_listen_url : streamUrl
    const startTracking = (forceWebListener = false) => {
      if (forceWebListener || !hasIcecastStream) startListenerSession().catch(() => {})
    }
    const markPlaying = () => {
      setPlaying(true)
      setConnecting(false)
    }
    const fail = (message = 'Stream is not ready yet') => {
      setPlaying(false)
      setConnecting(false)
      setPlayError(message)
    }
    const playDirect = async (src, timeoutMs = 8000) => {
      audio.src = src
      audio.load()
      await new Promise((resolve, reject) => {
        let settled = false
        const timer = setTimeout(() => {
          if (settled) return
          settled = true
          cleanup()
          reject(new Error('playback timeout'))
        }, timeoutMs)
        const cleanup = () => {
          clearTimeout(timer)
          audio.removeEventListener('playing', onPlaying)
          audio.removeEventListener('error', onError)
        }
        const onPlaying = () => {
          if (settled) return
          settled = true
          cleanup()
          resolve()
        }
        const onError = () => {
          if (settled) return
          settled = true
          cleanup()
          reject(new Error('audio error'))
        }
        audio.addEventListener('playing', onPlaying)
        audio.addEventListener('error', onError)
        const playPromise = audio.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            if (settled) return
            settled = true
            cleanup()
            reject(err)
          })
        }
      })
      markPlaying()
    }
    const playHls = () => new Promise((resolve, reject) => {
      if (Hls.isSupported()) {
        hlsRef.current?.destroy()
        const hls = new Hls({ lowLatencyMode: false, liveSyncDurationCount: 3 })
        hls.loadSource(hlsUrl)
        hls.attachMedia(audio)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().then(() => {
            markPlaying()
            startTracking(true)
            resolve()
          }).catch(() => fail())
        })
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            hls.destroy()
            hlsRef.current = null
            reject(new Error('HLS playback failed'))
          }
        })
        hlsRef.current = hls
        return
      }
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        playDirect(hlsUrl).then(() => {
          startTracking(true)
          resolve()
        }).catch((err) => reject(err))
        return
      }
      reject(new Error('HLS is not supported in this browser'))
    })

    playHls()
      .catch(() => playDirect(streamUrl, 8000))
      .catch(() => {
        if (hasIcecastStream) setIcecastUnavailable(true)
        return playDirect(primaryStreamUrl, hasIcecastStream ? 2000 : 8000)
      })
      .catch(() => {
        fail(hasIcecastStream ? 'Icecast stream is offline and HLS fallback is unavailable' : 'Stream is not ready yet')
      })
  }, [hlsUrl, icecastUnavailable, info.genre, info.icecast_listen_url, info.logo_url, info.name, startListenerSession, stopListenerSession, streamUrl])

  useEffect(() => {
    if (!info.is_live || autoPlayStartedRef.current || playing || connecting) return
    autoPlayStartedRef.current = true
    play().catch(() => {})
  }, [info.is_live, play, playing, connecting])

  const stop = useCallback(() => {
    hlsRef.current?.destroy()
    hlsRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    stopListenerSession(true)
    setPlaying(false)
    setConnecting(false)
    setPlayError('')
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'paused' } catch (e) {}
    }
  }, [stopListenerSession])

  const close = useCallback(() => {
    stop()
    setVisible(false)
    setTimeout(onClose, 280)
  }, [stop, onClose])

  const share = useCallback(async () => {
    const url = `${window.location.origin}/?station=${encodeURIComponent(info.slug)}`
    const title = info.name || 'Radio Station'
    const text = `Listen to ${title} live on Radio In One Stop`
    if (navigator.share) {
      try { await navigator.share({ title, text, url }) } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* clipboard unavailable */ }
    }
  }, [info.slug, info.name])

  // Click outside overlay
  const overlayClick = (e) => {
    if (e.target === e.currentTarget) close()
  }

  const isSpinning = playing && !muted && info.is_live

  return (
    <>
      <style>{`
        @keyframes vinyl-spin { to { transform: rotate(360deg); } }
        @keyframes modal-fade-in { from { opacity:0; transform:scale(0.96) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes overlay-in { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={overlayClick}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          animation: 'overlay-in 0.25s ease',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }}
      >
        {/* Modal card */}
        <div style={{
          background: '#0f0f1a',
          border: '1px solid #1e1e30',
          borderRadius: 20,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          animation: 'modal-fade-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}>
          {/* Top-right action buttons */}
          <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Share button */}
            <button
              onClick={share}
              title={copied ? 'Link copied!' : 'Share station'}
              style={{
                background: copied ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${copied ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8, color: copied ? '#a5b4fc' : '#9ca3af', cursor: 'pointer',
                height: 32, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                  Share
                </>
              )}
            </button>
            {/* Close button */}
            <button
              onClick={close}
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: '#9ca3af', cursor: 'pointer',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >✕</button>
          </div>

          {/* Live badge */}
          {info.is_live && (
            <div style={{
              position: 'absolute', top: 16, left: 16,
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                animation: 'overlay-in 1s ease infinite alternate' }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444',
                textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live</span>
            </div>
          )}

          {/* Top section: vinyl + info */}
          <div style={{
            display: 'flex', gap: 24, padding: '52px 28px 24px',
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            {/* Vinyl */}
            <VinylRecord isSpinning={isSpinning} logoUrl={info.logo_url} stationName={info.name} />

            {/* Station info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                {info.genre || 'Radio Station'}
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900,
                color: '#f1f5f9', lineHeight: 1.2 }}>{info.name}</h2>
              {info.description && (
                <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                  {info.description}
                </p>
              )}

              {/* Listener count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 18 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#4b5563">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  {info.listeners} listener{info.listeners !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Play / Stop */}
              <button
                onClick={playing ? stop : play}
                disabled={!info.is_live || connecting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 12,
                  background: !info.is_live
                    ? 'rgba(255,255,255,0.05)'
                    : playing
                      ? 'rgba(239,68,68,0.15)'
                      : 'linear-gradient(135deg,#6366f1,#10b981)',
                  border: !info.is_live
                    ? '1px solid rgba(255,255,255,0.08)'
                    : playing
                      ? '1px solid rgba(239,68,68,0.35)'
                      : 'none',
                  color: !info.is_live ? '#4b5563' : playing ? '#ef4444' : '#fff',
                  fontWeight: 700, fontSize: 13, cursor: info.is_live && !connecting ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  opacity: connecting ? 0.8 : 1,
                }}
              >
                {connecting ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5l4 2-.8 1.4L11 13V7h2z"/>
                    </svg>
                    Connecting...
                  </>
                ) : playing ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                    Stop Stream
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    {info.is_live ? 'Listen Live' : 'Off Air'}
                  </>
                )}
              </button>
              {playError && (
                <p style={{ margin: '8px 0 0', color: '#f87171', fontSize: 11, fontWeight: 600 }}>
                  {playError}
                </p>
              )}
            </div>
          </div>

          {/* Visualizer + volume controls */}
          <div style={{ padding: '0 28px 28px' }}>
            {/* Canvas */}
            <div style={{ background: '#080810', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <CanvasVisualizer analyser={analyser} isPlaying={playing} isLive={info.is_live} />
            </div>

            {/* Volume row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Mute toggle */}
              <button
                onClick={() => setMuted(m => !m)}
                style={{
                  background: muted ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                  border: muted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, color: muted ? '#ef4444' : '#6b7280',
                  cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center',
                }}
              >
                {muted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>

              {/* Volume slider */}
              <input
                type="range" min="0" max="100" value={muted ? 0 : volume}
                onChange={e => { setVolume(+e.target.value); setMuted(false) }}
                style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: '#4b5563', width: 28, textAlign: 'right' }}>
                {muted ? 0 : volume}%
              </span>
            </div>

            {/* Stream URL hint — hidden for now
            <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
              borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>
                Stream: {window.location.origin}/listen/{info.slug}
              </span>
            </div>
            */}
          </div>
        </div>
      </div>

      {/* Hidden audio element — playsInline keeps iOS from hijacking to fullscreen,
          x-webkit-airplay enables AirPlay on iOS Safari */}
      <audio ref={audioRef} crossOrigin="anonymous" preload="none" playsInline x-webkit-airplay="allow" />
    </>
  )
}
