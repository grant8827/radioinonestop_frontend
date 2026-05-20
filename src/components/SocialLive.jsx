import { useState, useRef, useEffect } from 'react'

function CameraOffIcon({ large }) {
  return (
    <svg
      className={large ? 'w-8 h-8' : 'w-3.5 h-3.5'}
      fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 8h7m4 0a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1M3 3l18 18" />
    </svg>
  )
}

export default function SocialLive() {
  const [active, setActive] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      setActive(true)
    } catch {
      // permission denied or no camera
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  // Assign srcObject after video element is visible so autoPlay fires reliably
  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [active])

  useEffect(() => () => { stopCamera() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-300 shrink-0">Social Preview</h2>
        <button
          onClick={active ? stopCamera : startCamera}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shrink-0 ${
            active
              ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-purple-400 border border-gray-700 hover:border-purple-500'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
          {active ? '● Live Preview' : 'Go Live'}
        </button>
      </div>

      {/* Video area — 16:9 */}
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${active ? '' : 'hidden'}`}
        />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <CameraOffIcon large />
            <p className="text-gray-600 text-xs">Camera off</p>
          </div>
        )}
      </div>
    </div>
  )
}
