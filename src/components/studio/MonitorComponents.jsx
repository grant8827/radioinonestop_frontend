import React, { useEffect, useRef, useState } from 'react'
import { useAudioEngine } from '../../context/AudioEngine'
import { useStream } from '../../context/StreamContext'
import { useStudio } from './StudioContext'

function drawCover(ctx, source, x, y, w, h) {
  const sw = source.videoWidth || source.naturalWidth || 0
  const sh = source.videoHeight || source.naturalHeight || 0
  if (!sw || !sh) return
  const scale = Math.max(w / sw, h / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.drawImage(source, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function paintBackground(ctx, theme, w, h) {
  if (theme.backgroundId === 'gradient-1') {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#2f0909')
    g.addColorStop(0.5, '#0a0a0f')
    g.addColorStop(1, '#2c1b05')
    ctx.fillStyle = g
  } else if (theme.backgroundId === 'gradient-2') {
    const g = ctx.createLinearGradient(w, 0, 0, h)
    g.addColorStop(0, '#35110a')
    g.addColorStop(0.55, '#111827')
    g.addColorStop(1, '#5f3907')
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = '#030305'
  }
  ctx.fillRect(0, 0, w, h)
}

function drawTicker(ctx, ticker, frame, w, h) {
  if (!ticker.visible) return
  const barH = 62
  const y = h - barH
  ctx.fillStyle = 'rgba(0,0,0,0.82)'
  ctx.fillRect(0, y, w, barH)
  ctx.fillStyle = '#e00012'
  ctx.fillRect(0, y, 180, barH)
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 24px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText((ticker.label || 'LIVE').toUpperCase(), 26, y + barH / 2)

  const text = ticker.text || ''
  ctx.font = '700 25px Inter, system-ui, sans-serif'
  const textW = ctx.measureText(text).width
  const speed = Math.max(1, Number(ticker.speed || 50))
  const x = 200 + ((w - ((frame * speed * 0.8) % (w + textW + 240))))
  ctx.fillText(text, x, y + barH / 2)
}

export function StreamMonitor({ videoKey, isSuspended = false }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const logoRef = useRef(null)
  const rafRef = useRef(null)
  const frameRef = useRef(0)
  const audioEngine = useAudioEngine()
  const { startVideo, stopVideo, videoStatus } = useStream()
  const { devices, setDevices, ticker, theme, broadcast, setBroadcast } = useStudio()
  const [videoDevices, setVideoDevices] = useState([])
  const [audioDevices, setAudioDevices] = useState([])
  const [mediaError, setMediaError] = useState('')

  useEffect(() => {
    setBroadcast((prev) => ({
      ...prev,
      isLive: videoStatus === 'live',
      webrtcStatus: videoStatus === 'stopped' ? 'idle' : videoStatus,
    }))
  }, [setBroadcast, videoStatus])

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.()
      .then((devs) => {
        setVideoDevices(devs.filter((d) => d.kind === 'videoinput'))
        setAudioDevices(devs.filter((d) => d.kind === 'audioinput'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!theme.logoUrl) {
      logoRef.current = null
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { logoRef.current = img }
    img.onerror = () => { logoRef.current = null }
    img.src = theme.logoUrl
  }, [theme.logoUrl])

  useEffect(() => {
    let canceled = false
    const oldStream = streamRef.current
    if (oldStream) oldStream.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null

    if (!devices.cameraEnabled && !devices.micEnabled) return undefined

    navigator.mediaDevices.getUserMedia({
      video: devices.cameraEnabled
        ? (devices.videoDeviceId ? { deviceId: { exact: devices.videoDeviceId } } : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } })
        : false,
      audio: devices.micEnabled
        ? (devices.audioDeviceId ? { deviceId: { exact: devices.audioDeviceId } } : true)
        : false,
    }).then((stream) => {
      if (canceled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      setMediaError('')
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    }).catch((err) => {
      setMediaError(err?.name === 'NotAllowedError' ? 'Camera or microphone access denied' : 'Could not open selected devices')
    })

    return () => {
      canceled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [devices.audioDeviceId, devices.cameraEnabled, devices.micEnabled, devices.videoDeviceId])

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const w = canvas.width
      const h = canvas.height
      frameRef.current += 1

      paintBackground(ctx, theme, w, h)

      const video = videoRef.current
      if (video?.readyState >= 2 && devices.cameraEnabled) {
        const stageW = Math.round(w * 0.78)
        const stageH = Math.round(stageW * 9 / 16)
        const x = Math.round((w - stageW) / 2)
        const y = Math.round((h - stageH) / 2) - 22
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(x - 8, y - 8, stageW + 16, stageH + 16)
        ctx.translate(x + stageW, y)
        ctx.scale(-1, 1)
        drawCover(ctx, video, 0, 0, stageW, stageH)
        ctx.restore()
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.42)'
        ctx.fillRect(Math.round(w * 0.12), Math.round(h * 0.18), Math.round(w * 0.76), Math.round(h * 0.54))
        ctx.fillStyle = '#64748b'
        ctx.font = '700 26px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(mediaError || 'Camera is off', w / 2, h / 2)
        ctx.textAlign = 'left'
      }

      if (theme.logoVisible && logoRef.current) {
        const img = logoRef.current
        const maxW = 170
        const maxH = 92
        const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
        const iw = img.naturalWidth * scale
        const ih = img.naturalHeight * scale
        ctx.globalAlpha = 0.88
        ctx.drawImage(img, w - iw - 34, 30, iw, ih)
        ctx.globalAlpha = 1
      }

      drawTicker(ctx, ticker, frameRef.current, w, h)
      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [devices.cameraEnabled, mediaError, theme, ticker])

  function createCompositeStream() {
    const canvas = canvasRef.current
    if (!canvas) return null
    const composite = canvas.captureStream(30)
    const localAudio = streamRef.current?.getAudioTracks?.()[0]
    const mixerAudio = audioEngine?.getStreamTrack?.()?.getAudioTracks?.()?.[0]
    const audioTrack = mixerAudio || localAudio
    if (audioTrack) composite.addTrack(audioTrack)
    return composite
  }

  function handleGoLive() {
    const stream = createCompositeStream()
    if (!stream) return
    startVideo(videoKey, stream)
  }

  function handleStop() {
    stopVideo()
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Stream Monitor</h2>
        <div className="flex gap-2">
          {broadcast.isLive && <span className="bg-red-600 animate-pulse text-white text-xs font-bold px-2 py-1 rounded">LIVE</span>}
          <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">{String(broadcast.webrtcStatus || 'idle').toUpperCase()}</span>
        </div>
      </div>

      <video ref={videoRef} muted playsInline className="hidden" />
      <div className="relative bg-black border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={1280} height={720} className="block w-full aspect-video bg-black" />
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-800 p-3 rounded-xl mt-4">
        <button
          onClick={() => setDevices((p) => ({ ...p, cameraEnabled: !p.cameraEnabled }))}
          className={`px-3 py-2 rounded-lg text-xs font-bold ${devices.cameraEnabled ? 'bg-gray-800 text-white' : 'bg-red-900/50 text-red-400'}`}
        >
          {devices.cameraEnabled ? 'Camera On' : 'Camera Off'}
        </button>
        <button
          onClick={() => setDevices((p) => ({ ...p, micEnabled: !p.micEnabled }))}
          className={`px-3 py-2 rounded-lg text-xs font-bold ${devices.micEnabled ? 'bg-gray-800 text-white' : 'bg-red-900/50 text-red-400'}`}
        >
          {devices.micEnabled ? 'Mic On' : 'Mic Off'}
        </button>

        <div className="h-6 w-px bg-gray-800" />

        <select
          className="bg-gray-950 border border-gray-800 text-white text-xs p-2 rounded-lg max-w-[180px]"
          value={devices.videoDeviceId}
          onChange={(e) => setDevices((p) => ({ ...p, videoDeviceId: e.target.value }))}
        >
          <option value="">Default Camera</option>
          {videoDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>)}
        </select>
        <select
          className="bg-gray-950 border border-gray-800 text-white text-xs p-2 rounded-lg max-w-[180px]"
          value={devices.audioDeviceId}
          onChange={(e) => setDevices((p) => ({ ...p, audioDeviceId: e.target.value }))}
        >
          <option value="">Default Mic</option>
          {audioDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>)}
        </select>

        <div className="ml-auto">
          {broadcast.isLive ? (
            <button onClick={handleStop} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-red-900/20 transition-all">
              End Broadcast
            </button>
          ) : (
            <button
              onClick={handleGoLive}
              disabled={broadcast.webrtcStatus === 'connecting' || isSuspended}
              className="rio-logo-gradient disabled:bg-none disabled:bg-gray-700 disabled:opacity-60 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-red-900/20 transition-all"
            >
              {broadcast.webrtcStatus === 'connecting' ? 'Connecting...' : isSuspended ? 'Suspended' : 'Start Multicast'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
