import { useState, useEffect, useRef, useCallback } from 'react'
import { useAudioEngine } from '../context/AudioEngine'
import { useStream } from '../context/StreamContext'

export default function StudioCompositor({ isLive, videoKey, isSuspended }) {
  const canvasRef = useRef(null)
  const audioCanvasRef = useRef(null)
  const requestRef = useRef()
  const audioRafRef = useRef(null)
  const sourcesRef = useRef({}) // id -> { element, type, stream? }
  const fileInputRef = useRef(null)
  const audioEngine = useAudioEngine()
  const { startVideo, stopVideo, videoStatus } = useStream()

  const [layers, setLayers] = useState([
    { id: 'background', type: 'color', color: '#050505', opacity: 1, z: 0, visible: true },
  ])
  const [selectedId, setSelectedId] = useState('background')

  // --- New state for scene transitions ---
  const [transitioning, setTransitioning] = useState(false)
  const [transitionStartTime, setTransitionStartTime] = useState(0)
  const [transitionDuration, setTransitionDuration] = useState(500) // milliseconds
  const [oldSceneLayers, setOldSceneLayers] = useState(null)
  const [newSceneLayers, setNewSceneLayers] = useState(null)
  // --- End new state ---

  // Setup source for a layer
  const initLayerSource = async (layer) => {
    if (sourcesRef.current[layer.id]) return

    if (layer.type === 'camera') {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      video.play().catch(e => console.error('Camera play error:', e))
      sourcesRef.current[layer.id] = { element: video, type: 'video', stream }
    } else if (layer.type === 'screen') {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      video.play().catch(e => console.error('Screen play error:', e))
      sourcesRef.current[layer.id] = { element: video, type: 'video', stream }
    }
  }

  const addLayer = async (type) => {
    const id = `${type}_${Date.now()}`
    const newLayer = {
      id,
      type,
      x: 0,
      y: 0,
      scale: 0.5,
      opacity: 1,
      visible: true,
      z: layers.length,
      ...(type === 'text' ? { text: 'New Overlay', color: '#ffffff', fontSize: 40 } : {})
    }
    
    if (type !== 'text') {
      try {
        await initLayerSource(newLayer)
      } catch (err) {
        console.error('Failed to init source:', err)
        return
      }
    }

    setLayers(prev => [...prev, newLayer])
    setSelectedId(id)
  }

  const removeLayer = (id) => {
    if (id === 'background') return
    const source = sourcesRef.current[id]
    if (source?.stream) {
      source.stream.getTracks().forEach(t => t.stop())
    }
    if (source?.type === 'image' && source.element) {
      URL.revokeObjectURL(source.element.src) // Prevent memory leaks from old objects
    }
    delete sourcesRef.current[id]
    setLayers(prev => prev.filter(l => l.id !== id))
    setSelectedId('background')
  }

  const moveLayer = (direction) => {
    const idx = layers.findIndex(l => l.id === selectedId)
    if (idx === -1) return
    const next = [...layers]
    const targetIdx = direction === 'up' ? idx + 1 : idx - 1
    if (targetIdx < 0 || targetIdx >= layers.length) return
    
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
    setLayers(next)
  }

  const updateLayer = (patch) => {
    setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, ...patch } : l))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const id = `image_${Date.now()}`
      sourcesRef.current[id] = { element: img, type: 'image' }
      setLayers(prev => [...prev, {
        id, type: 'image',
        x: 0, y: 0, scale: 1, opacity: 1, visible: true, z: prev.length
      }])
      setSelectedId(id)
    }
    img.src = url
    e.target.value = ''
  }

  // --- New function to draw a set of layers with a given global opacity ---
  const drawLayers = useCallback((ctx, layerSet, globalOpacity) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas

    layerSet.forEach(layer => {
      if (!layer.visible) return
      ctx.globalAlpha = layer.opacity * globalOpacity

      if (layer.type === 'color') {
        ctx.fillStyle = layer.color
        ctx.fillRect(0, 0, width, height)
      } else if (layer.type === 'camera' || layer.type === 'screen') {
        const source = sourcesRef.current[layer.id]
        if (source?.element?.readyState >= 2) {
          const sw = source.element.videoWidth
          const sh = source.element.videoHeight
          ctx.drawImage(source.element, layer.x, layer.y, sw * layer.scale, sh * layer.scale)
        }
      } else if (layer.type === 'image') {
        const source = sourcesRef.current[layer.id]
        if (source?.element) {
          ctx.drawImage(source.element, layer.x, layer.y, source.element.width * layer.scale, source.element.height * layer.scale)
        }
      } else if (layer.type === 'text') {
        ctx.font = `bold ${layer.fontSize * layer.scale}px Inter, sans-serif`
        ctx.fillStyle = layer.color || '#ffffff'
        ctx.textBaseline = 'top'
        ctx.fillText(layer.text, layer.x, layer.y)
      }
    })
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas

    ctx.clearRect(0, 0, width, height)

    if (transitioning && oldSceneLayers && newSceneLayers) {
      const elapsed = performance.now() - transitionStartTime
      let progress = elapsed / transitionDuration
      
      if (progress >= 1) {
        // Transition finished
        setTransitioning(false)
        setLayers(newSceneLayers) // Set the new layers as current
        setOldSceneLayers(null)
        setNewSceneLayers(null)
        // Re-render immediately with new layers
        requestRef.current = requestAnimationFrame(render)
        return
      }

      // Draw old layers fading out
      drawLayers(ctx, oldSceneLayers, 1 - progress)
      // Draw new layers fading in
      drawLayers(ctx, newSceneLayers, progress)

    } else {
      // No transition, draw current layers
      drawLayers(ctx, layers, 1)
    }

    requestRef.current = requestAnimationFrame(render)
  }, [layers])

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(requestRef.current)
  }, [render])

  // --- Audio Signal Meter ---
  useEffect(() => {
    const drawSpectrum = () => {
      audioRafRef.current = requestAnimationFrame(drawSpectrum)
      const canvas = audioCanvasRef.current
      const analyser = audioEngine?.getMasterAnalyser?.()
      
      if (!canvas || !analyser) {
        if (canvas) {
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        return
      }
      
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
    }
    audioRafRef.current = requestAnimationFrame(drawSpectrum)
    return () => {
      if (audioRafRef.current) cancelAnimationFrame(audioRafRef.current)
    }
  }, [audioEngine])

  const handleGoLive = () => {
    if (!canvasRef.current) return
    const stream = canvasRef.current.captureStream(30)
    startVideo(videoKey, stream)
  }

  // --- New function to initiate a scene transition ---
  const startSceneTransition = (targetLayers) => {
    setTransitioning(true)
    setTransitionStartTime(performance.now())
    setOldSceneLayers(layers) // Capture current layers
    setNewSceneLayers(targetLayers) // Set target layers
    // The render loop will handle the animation and final state update
  }

  // --- Example: A simple button to load a "preset" with a fade ---
  const loadExamplePreset = () => {
    const examplePresetLayers = [{ id: 'background', type: 'color', color: '#1a1a1a', opacity: 1, z: 0, visible: true }, { id: 'text_preset', type: 'text', text: 'Live Broadcast!', color: '#ffcc00', fontSize: 60, x: 100, y: 100, scale: 1, opacity: 1, visible: true, z: 1 }]
    startSceneTransition(examplePresetLayers)
  }

  const activeLayer = layers.find(l => l.id === selectedId)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left: Preview & Global Controls */}
      <div className="xl:col-span-2 space-y-4">
        <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative group">
          <canvas 
            ref={canvasRef} 
            width={1280} 
            height={720} 
            className="w-full aspect-video bg-[#050505] cursor-crosshair"
          />
          
          {videoStatus === 'live' && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE STUDIO
            </div>
          )}
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Master Audio Signal</p>
          <canvas ref={audioCanvasRef} width={560} height={56} className="w-full rounded-lg bg-gray-950 block" />
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
          <button
            onClick={() => addLayer('camera')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Add Camera
          </button>
          <button
            onClick={() => addLayer('screen')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-2 1h10l-2-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Share Screen
          </button>
          <button
            onClick={() => addLayer('text')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" /></svg>
            Add Text Overlay
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Add Image
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          {/* --- New button to trigger a preset transition --- */}
          <button
            onClick={loadExamplePreset}
            className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-xl text-xs font-bold transition-all"
            disabled={transitioning}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.5 9.5V4m0 0h5M7.5 18.5v.5m0 0h.5m-.5 0a8.001 8.001 0 0015.356-2A8.001 8.001 0 0018.5 13H13m-1.5 0v5m0 0h5" /></svg>
            Load Preset (Fade)
          </button>
          {/* --- End new button --- */}

          <div className="ml-auto flex items-center gap-2">
            {videoStatus === 'live' ? (
              <button
                onClick={stopVideo}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-900/40"
              >
                Stop Studio
              </button>
            ) : (
              <button
                onClick={handleGoLive}
                disabled={isSuspended || transitioning} // Disable during transition
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-900/40"
              >
                Go Live Studio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Layer Stack & Properties */}
      <div className="space-y-6">
        {/* Layer Stack */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 bg-gray-950/40">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scene Layers</p>
          </div>
          <div className="p-2 space-y-1">
            {[...layers].reverse().map(layer => (
              <div
                key={layer.id}
                onClick={() => setSelectedId(layer.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                  selectedId === layer.id ? 'bg-purple-600 text-white' : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800'
                }`}
              >
                <span className="text-xs font-bold truncate flex-1">{layer.id}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); updateLayer({ visible: !layer.visible }) }}
                  className="p-1 hover:text-white"
                >
                  {layer.visible ? '👁️' : 'hidden'}
                </button>
                {layer.id !== 'background' && (
                  <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id) }} className="hover:text-red-400">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-800 flex justify-center gap-4">
            <button onClick={() => moveLayer('down')} className="text-xs text-gray-500 hover:text-white">↓ Lower</button>
            <button onClick={() => moveLayer('up')} className="text-xs text-gray-500 hover:text-white">↑ Raise</button>
          </div>
        </div>

        {/* Properties Panel */}
        {activeLayer && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 bg-gray-950/40">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Layer Properties</p>
            </div>
            <div className="p-5 space-y-5">
              {activeLayer.type === 'text' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Overlay Text</label>
                  <input
                    type="text"
                    value={activeLayer.text}
                    onChange={(e) => updateLayer({ text: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {activeLayer.type !== 'color' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">PosX</label>
                      <input
                        type="range" min="0" max="1280"
                        value={activeLayer.x}
                        onChange={(e) => updateLayer({ x: parseInt(e.target.value) })}
                        className="w-full accent-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">PosY</label>
                      <input
                        type="range" min="0" max="720"
                        value={activeLayer.y}
                        onChange={(e) => updateLayer({ y: parseInt(e.target.value) })}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Scale ({activeLayer.scale})</label>
                    <input
                      type="range" min="0.1" max="5" step="0.05"
                      value={activeLayer.scale}
                      onChange={(e) => updateLayer({ scale: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Opacity ({Math.round(activeLayer.opacity * 100)}%)</label>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={activeLayer.opacity}
                  onChange={(e) => updateLayer({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </div>

              {(activeLayer.type === 'color' || activeLayer.type === 'text') && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">
                    {activeLayer.type === 'text' ? 'Text Color' : 'Hex Color'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={activeLayer.color || '#ffffff'}
                      onChange={(e) => updateLayer({ color: e.target.value })}
                      className="w-10 h-10 rounded bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activeLayer.color || '#ffffff'}
                      onChange={(e) => updateLayer({ color: e.target.value })}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}