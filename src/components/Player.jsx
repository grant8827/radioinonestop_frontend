import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { useAudioEngine } from '../context/AudioEngine'
import { useStream } from '../context/StreamContext'

// ── LL-HLS config ──────────────────────────────────────────────────────────────
const HLS_CONFIG = {
  lowLatencyMode: true,
  liveSyncDurationCount: 1,
  liveMaxLatencyDurationCount: 3,
  liveDurationInfinity: true,
  targetLatency: 2,
  backBufferLength: 15,
  maxBufferLength: 8,
  maxMaxBufferLength: 15,
  maxLoadingDelay: 4,
  maxBufferHole: 0.5,
  manifestLoadingMaxRetry: Infinity,
  manifestLoadingRetryDelay: 1000,
  manifestLoadingMaxRetryTimeout: 8000,
  levelLoadingMaxRetry: 6,
  levelLoadingRetryDelay: 1000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 500,
  enableWorker: true,
}

function streamKeyFromUrl(url) {
  if (!url) return null
  const parts = url.split('/')
  const idx = parts.indexOf('index.m3u8')
  return idx > 0 ? parts[idx - 1] : null
}

// Loop size labels
const LOOP_SIZES = ['1/8', '1/4', '1/2', '1', '2', '4', '8', '16']

// Pre-generate waveform shape — deterministic so it looks like audio
const mkWave = (seed) =>
  Array.from({ length: 52 }, (_, i) => {
    const v =
      0.35 +
      Math.sin(i * 0.31 + seed) * 0.28 +
      Math.sin(i * 0.77 + seed * 2) * 0.18 +
      (i % (3 + (seed | 0)) === 0 ? 0.18 : 0)
    return Math.max(0.07, Math.min(1, v))
  })
const WAVE_A = mkWave(0)
const WAVE_B = mkWave(1.4)

// ── Rotary Knob ────────────────────────────────────────────────────────────────
function Knob({ value, onChange, size = 36, color = '#38bdf8', label }) {
  const dragRef = useRef(null)
  const onPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startVal: value }
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const delta = (dragRef.current.startY - e.clientY) / 100
    onChange(Math.max(0, Math.min(1, dragRef.current.startVal + delta)))
  }
  const onPointerUp   = () => { dragRef.current = null }
  const onDoubleClick = () => onChange(0.5)

  const cx = size / 2, cy = size / 2
  const LEDS     = 11
  const ledDot   = 2.2
  const ringR    = size * 0.43
  const capR     = size * 0.28
  const startDeg = -225, sweep = 270
  const toRad    = d => d * Math.PI / 180
  const litCount = Math.round(value * (LEDS - 1))
  const tickAngle = toRad(startDeg + sweep * value - 90)
  const [mx1, my1] = [cx + capR * 0.28 * Math.cos(tickAngle), cy + capR * 0.28 * Math.sin(tickAngle)]
  const [mx2, my2] = [cx + capR * 0.88 * Math.cos(tickAngle), cy + capR * 0.88 * Math.sin(tickAngle)]

  return (
    <div className="flex flex-col items-center select-none" style={{ gap: 3 }}>
      {label && (
        <span className="text-[7px] font-bold uppercase tracking-wide leading-none" style={{ color: '#64748b' }}>
          {label}
        </span>
      )}
      <svg width={size} height={size}
        style={{ touchAction: 'none', cursor: 'ns-resize', overflow: 'visible' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}>
        <circle cx={cx} cy={cy + 2.5} r={capR + 2} fill="#00000077" />
        {/* Unlit LED slots */}
        {Array.from({ length: LEDS }).map((_, i) => {
          const deg = startDeg - 90 + (sweep / (LEDS - 1)) * i
          const lx = cx + ringR * Math.cos(toRad(deg))
          const ly = cy + ringR * Math.sin(toRad(deg))
          return <circle key={i} cx={lx} cy={ly} r={ledDot} fill="#0e1420" stroke="#1e2840" strokeWidth="0.5" />
        })}
        {/* Lit LED segments */}
        {Array.from({ length: LEDS }).map((_, i) => {
          if (i > litCount) return null
          const deg = startDeg - 90 + (sweep / (LEDS - 1)) * i
          const lx = cx + ringR * Math.cos(toRad(deg))
          const ly = cy + ringR * Math.sin(toRad(deg))
          return (
            <circle key={i} cx={lx} cy={ly} r={ledDot}
              fill={color}
              style={{ filter: `drop-shadow(0 0 ${ledDot * 2}px ${color})` }}
            />
          )
        })}
        <circle cx={cx} cy={cy} r={capR} fill="#0d1520" />
        <ellipse cx={cx - capR * 0.18} cy={cy - capR * 0.28} rx={capR * 0.55} ry={capR * 0.28} fill="#ffffff0a" />
        <circle cx={cx} cy={cy} r={capR} fill="none" stroke="#ffffff10" strokeWidth="1" />
        <line x1={mx1} y1={my1} x2={mx2} y2={my2}
          stroke={color} strokeWidth="2" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      </svg>
    </div>
  )
}

// ── Vertical channel fader ─────────────────────────────────────────────────────
function VFader({ value, onChange, height = 100, color = '#d1d5db' }) {
  const trackRef = useRef(null)
  const dragRef  = useRef(null)
  const getVal = (clientY) => {
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, 1 - (clientY - rect.top - 6) / (rect.height - 12)))
  }
  const onPointerDown = (e) => {
    e.preventDefault()
    trackRef.current.setPointerCapture(e.pointerId)
    dragRef.current = true
    onChange(getVal(e.clientY))
  }
  const onPointerMove = (e) => { if (dragRef.current) onChange(getVal(e.clientY)) }
  const onPointerUp   = () => { dragRef.current = null }

  const travel    = height - 12
  const capH      = 18
  const capBottom = 6 + value * travel - capH / 2

  return (
    <div className="flex flex-col items-center" style={{ userSelect: 'none', gap: 2 }}>
      <span className="text-[7px] font-mono" style={{ color: '#64748b' }}>{Math.round(value * 100)}</span>
      <div ref={trackRef}
        style={{ height, width: 30, position: 'relative', cursor: 'pointer', touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {/* Track groove */}
        <div style={{
          position: 'absolute', left: '50%', top: 6, bottom: 6,
          width: 6, transform: 'translateX(-50%)',
          background: '#080b10', borderRadius: 3,
          boxShadow: 'inset 0 0 6px #000000cc',
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute', left: '50%', bottom: 6,
          width: 6, height: `${value * travel}px`,
          transform: 'translateX(-50%)',
          background: `linear-gradient(to top, ${color}55, ${color}22)`,
          borderRadius: '0 0 3px 3px',
        }} />
        {/* Cap shadow */}
        <div style={{
          position: 'absolute', left: '50%', bottom: `${capBottom - 2}px`,
          width: 26, height: capH, borderRadius: 3,
          transform: 'translateX(-50%)',
          background: '#00000066', pointerEvents: 'none',
        }} />
        {/* Cap body */}
        <div style={{
          position: 'absolute', left: '50%', bottom: `${capBottom}px`,
          width: 26, height: capH, borderRadius: 3,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #3f4e6a 0%, #232f46 50%, #151c2e 100%)',
          border: `1px solid ${color}33`,
          boxShadow: `0 4px 10px #00000099, inset 0 1px 0 #ffffff18`,
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '15%', right: '15%',
            height: 1, background: `${color}55`, transform: 'translateY(-1px)', borderRadius: 1,
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '15%', right: '15%',
            height: 1, background: `${color}33`, transform: 'translateY(2px)', borderRadius: 1,
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Horizontal shadow fader (crossfader) ──────────────────────────────────────
function HFader({ value, onChange }) {
  const trackRef = useRef(null)
  const dragRef  = useRef(null)
  const getVal = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left - 8) / (rect.width - 16)))
  }
  const onPointerDown = (e) => {
    e.preventDefault()
    trackRef.current.setPointerCapture(e.pointerId)
    dragRef.current = true
    onChange(getVal(e.clientX))
  }
  const onPointerMove = (e) => { if (dragRef.current) onChange(getVal(e.clientX)) }
  const onPointerUp   = () => { dragRef.current = null }
  const capW = 26
  return (
    <div ref={trackRef}
      style={{ width: '100%', height: 30, position: 'relative', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {/* Track groove */}
      <div style={{
        position: 'absolute', left: 8, right: 8, top: '50%',
        height: 6, transform: 'translateY(-50%)',
        background: '#080b10', borderRadius: 3,
        boxShadow: 'inset 0 0 6px #000000cc',
      }} />
      {/* Fill left of cap */}
      <div style={{
        position: 'absolute', left: 8, top: '50%',
        width: `calc(${value} * (100% - 16px))`,
        height: 6, transform: 'translateY(-50%)',
        background: 'linear-gradient(to right, #38bdf822, #d1d5db33)',
        borderRadius: '3px 0 0 3px',
      }} />
      {/* Cap shadow */}
      <div style={{
        position: 'absolute',
        left: `calc(${value} * (100% - 16px) + 8px - ${capW / 2}px)`,
        top: '50%', transform: 'translateY(calc(-50% + 2px))',
        width: capW, height: 18, borderRadius: 3,
        background: '#00000066', pointerEvents: 'none',
      }} />
      {/* Cap body */}
      <div style={{
        position: 'absolute',
        left: `calc(${value} * (100% - 16px) + 8px - ${capW / 2}px)`,
        top: '50%', transform: 'translateY(-50%)',
        width: capW, height: 18, borderRadius: 3,
        background: 'linear-gradient(180deg, #3f4e6a 0%, #232f46 50%, #151c2e 100%)',
        border: '1px solid #d1d5db33',
        boxShadow: '0 4px 10px #00000099, inset 0 1px 0 #ffffff18',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: '15%', bottom: '15%',
          width: 1, background: '#d1d5db55', transform: 'translateX(-50%)', borderRadius: 1,
        }} />
      </div>
    </div>
  )
}

// ── Vertical VU strip ──────────────────────────────────────────────────────────
function VuStrip({ active = true, level = 0, segments = 14 }) {
  const colors = [
    '#22c55e', '#22c55e', '#22c55e', '#22c55e',
    '#22c55e', '#22c55e', '#22c55e', '#84cc16',
    '#eab308', '#eab308', '#f97316', '#ef4444', '#ef4444', '#ef4444',
  ]
  return (
    <div className="flex flex-col-reverse gap-px">
      {colors.slice(0, segments).map((c, i) => {
        const threshold = (i + 0.5) / segments
        const lit = active && level > threshold
        return (
          <div
            key={i}
            style={{
              width: '6px',
              height: '4px',
              borderRadius: '1px',
              backgroundColor: lit ? c : '#252830',
              boxShadow: lit ? `0 0 3px ${c}99` : 'none',
              transition: 'background-color 0.05s',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Waveform display ───────────────────────────────────────────────────────────
function WaveformDisplay({ playing, color, waveData, progress = 0 }) {
  return (
    <div
      className="relative rounded overflow-hidden border border-[#1e2128]"
      style={{ height: 40, background: '#060810' }}
    >
      <div className="flex items-end h-full px-0.5 pt-1 gap-px">
        {waveData.map((h, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: `${h * 100}%`,
              backgroundColor: playing ? color : '#2d3340',
              borderRadius: '1px 1px 0 0',
              opacity: playing ? 0.85 : 0.4,
              animation: playing
                ? `barPulse ${0.38 + i * 0.018}s ease-in-out ${i * 0.012}s infinite alternate`
                : 'none',
              transformOrigin: 'bottom',
              transition: 'background-color 0.3s',
            }}
          />
        ))}
      </div>
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: `${Math.min(100, Math.max(0, progress * 100))}%`,
          width: '2px',
          backgroundColor: 'rgba(255,255,255,0.6)',
          boxShadow: `0 0 4px ${color}`,
          transition: 'left 0.25s linear',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />
    </div>
  )
}

// ── Jog Wheel ──────────────────────────────────────────────────────────────────
function JogWheel({ spinning, size = 160, color, label }) {
  const rotRef = useRef(0)
  const rafRef = useRef(null)
  const lastRef = useRef(null)
  const [rot, setRot] = useState(0)

  useEffect(() => {
    if (!spinning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastRef.current = null
      return
    }
    const step = (ts) => {
      if (lastRef.current !== null) {
        rotRef.current = (rotRef.current + (ts - lastRef.current) * 0.055) % 360
        setRot(rotRef.current)
      }
      lastRef.current = ts
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [spinning])

  const cx = size / 2, cy = size / 2
  const outerR = size * 0.47
  const vinylR = size * 0.37
  const innerR = size * 0.15

  return (
    <div className="relative select-none flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={outerR} fill="#191c22" stroke="#3d4350" strokeWidth="2" />
        {Array.from({ length: 72 }).map((_, i) => {
          const big = i % 6 === 0
          const a = (i * 5 - 90) * (Math.PI / 180)
          const r1 = outerR - (big ? 7 : 3)
          const r2 = outerR - 1
          return (
            <line
              key={i}
              x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)}
              x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)}
              stroke={big ? '#5a6270' : '#2d3340'}
              strokeWidth={big ? 1.5 : 0.8}
            />
          )
        })}
        <g transform={`rotate(${rot}, ${cx}, ${cy})`}>
          <circle cx={cx} cy={cy} r={vinylR} fill="#0c0e13" />
          {[0.9, 0.78, 0.66, 0.54, 0.42, 0.3].map((f, i) => (
            <circle
              key={i}
              cx={cx} cy={cy}
              r={vinylR * f}
              fill="none"
              stroke="#1a1d24"
              strokeWidth="1.2"
            />
          ))}
          <line
            x1={cx} y1={cy - innerR - 4}
            x2={cx} y2={cy - vinylR + 3}
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx={cx} cy={cy} r={innerR + 4} fill="#191c22" />
          <circle cx={cx} cy={cy} r={innerR} fill="#111318" stroke="#252830" strokeWidth="1" />
          <text
            x={cx} y={cy + 3}
            textAnchor="middle"
            fontSize={innerR * 0.8}
            fontWeight="900"
            fontFamily="monospace"
            fill={color}
            opacity="0.7"
          >
            {label}
          </text>
          <circle cx={cx} cy={cy} r={3.5} fill={color} />
        </g>
        <circle cx={cx} cy={cy} r={2.5} fill="#0a0c10" />
      </svg>
    </div>
  )
}

// ── Pitch fader (vertical) ─────────────────────────────────────────────────────
function PitchFader({ value, onChange, height = 80 }) {
  const norm = (value + 1) / 2
  const pct = (value * 8).toFixed(1)
  const clr = value === 0 ? '#6b7280' : value > 0 ? '#22c55e' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[8px] font-mono font-bold" style={{ color: clr }}>
        {value > 0 ? '+' : ''}{pct}%
      </span>
      <div
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        <input
          type="range" min="0" max="1" step="0.001"
          value={norm}
          onChange={(e) => onChange(parseFloat(e.target.value) * 2 - 1)}
          style={{
            transform: 'rotate(-90deg)',
            width: `${height}px`,
            accentColor: clr,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      </div>
      <span className="text-[7px] font-bold text-gray-700 uppercase tracking-wider">PITCH</span>
    </div>
  )
}

// ── Hot cue buttons ────────────────────────────────────────────────────────────
const HC_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899']

function HotCues({ cues, onSet, onClear }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {['A', 'B', 'C', 'D'].map((lbl, i) => (
        <button
          key={i}
          onClick={() => (cues[i] ? onClear(i) : onSet(i))}
          onContextMenu={(e) => { e.preventDefault(); onClear(i) }}
          className="h-7 rounded text-[8px] font-black tracking-wider transition-all active:scale-95"
          style={{
            backgroundColor: cues[i] ? HC_COLORS[i] : '#1a1d24',
            color: cues[i] ? '#000' : '#4b5563',
            border: `1px solid ${cues[i] ? HC_COLORS[i] : '#2d3340'}`,
            boxShadow: cues[i] ? `0 0 6px ${HC_COLORS[i]}55` : 'none',
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
  )
}

// ── Loop controls ──────────────────────────────────────────────────────────────
function LoopControls({ active, sizeIdx, onToggle, onResize }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          onClick={() => onResize(-1)}
          className="flex-1 h-6 rounded bg-[#1a1d24] hover:bg-[#252830] text-[9px] font-bold text-gray-500 border border-[#2d3340] transition-colors"
        >
          &#9668;
        </button>
        <button
          onClick={onToggle}
          className="flex-1 h-6 rounded text-[8px] font-black tracking-wider transition-all active:scale-95"
          style={{
            backgroundColor: active ? '#22c55e' : '#1a1d24',
            color: active ? '#000' : '#4b5563',
            border: `1px solid ${active ? '#22c55e' : '#2d3340'}`,
            boxShadow: active ? '0 0 6px #22c55e55' : 'none',
          }}
        >
          LOOP
        </button>
        <button
          onClick={() => onResize(1)}
          className="flex-1 h-6 rounded bg-[#1a1d24] hover:bg-[#252830] text-[9px] font-bold text-gray-500 border border-[#2d3340] transition-colors"
        >
          &#9658;
        </button>
      </div>
      <div className="text-center">
        <span className="text-[9px] font-mono text-gray-700">{LOOP_SIZES[sizeIdx]} bars</span>
      </div>
    </div>
  )
}

// ── Deck unit ──────────────────────────────────────────────────────────────────
function DeckUnit({
  side, color, active, playing, onTogglePlay,
  streamLive, stationName, waveData, progress,
  pitch, onPitchChange,
  hotCues, onHotCueSet, onHotCueClear,
  loopActive, loopSizeIdx, onLoopToggle, onLoopResize,
  synced, onSyncToggle,
  keyLock, onKeyLockToggle,
}) {
  const bpm = side === 'A' ? 128.0 : 125.0
  const adjBpm = (bpm * (1 + pitch * 0.08)).toFixed(1)

  return (
    <div
      className="flex-1 min-w-0 flex flex-col gap-2 p-3"
      style={{ background: '#0d0f14', borderBottom: `2px solid ${color}22` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[9px] font-black tracking-widest uppercase" style={{ color }}>
            DECK {side}
          </span>
        </div>
        {active && streamLive && (
          <span className="text-[8px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">
            LIVE
          </span>
        )}
        {active && !streamLive && (
          <span className="text-[8px] font-bold bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded">
            OFFLINE
          </span>
        )}
        {!active && (
          <span className="text-[8px] font-bold bg-gray-800 text-gray-700 px-1.5 py-0.5 rounded">
            NO SIGNAL
          </span>
        )}
      </div>

      <div className="rounded-lg border border-[#1e2128] px-2.5 py-2" style={{ background: '#06080b' }}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[8px] text-gray-700 uppercase tracking-wide">TRACK</span>
          <span className="text-[8px] font-mono text-gray-700">&#8734;:&#8734;&#8734;</span>
        </div>
        <p className="text-xs font-bold text-white truncate leading-tight">
          {stationName ?? (active ? 'Radio In One Stop' : '\u2500\u2500\u2500\u2500 NO TRACK \u2500\u2500\u2500\u2500')}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] font-mono font-bold" style={{ color }}>
            {adjBpm} BPM
          </span>
          <span className="text-[8px] text-gray-700">
            {active ? 'LL-HLS' : '\u2500\u2500\u2500\u2500'}
          </span>
        </div>
      </div>

      <WaveformDisplay playing={playing && active} color={color} waveData={waveData} progress={progress} />

      <div className="flex justify-center py-1">
        <JogWheel spinning={playing && active} size={158} color={color} label={side} />
      </div>

      <div>
        <p className="text-[7px] font-bold text-gray-700 uppercase tracking-widest mb-1">Hot Cues</p>
        <HotCues cues={hotCues} onSet={onHotCueSet} onClear={onHotCueClear} />
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-[7px] font-bold text-gray-700 uppercase tracking-widest mb-1">Loop</p>
          <LoopControls
            active={loopActive}
            sizeIdx={loopSizeIdx}
            onToggle={onLoopToggle}
            onResize={onLoopResize}
          />
        </div>
        <PitchFader value={pitch} onChange={onPitchChange} height={72} />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onKeyLockToggle}
          className="flex-1 h-8 rounded text-[7px] font-black tracking-wide transition-all active:scale-95"
          style={{
            backgroundColor: keyLock ? '#7c3aed22' : '#1a1d24',
            color: keyLock ? '#a78bfa' : '#4b5563',
            border: `1px solid ${keyLock ? '#7c3aed60' : '#2d3340'}`,
          }}
        >
          KEY
        </button>

        <button
          className="flex-1 h-9 rounded-lg text-[8px] font-black tracking-wider transition-all active:scale-95"
          style={{ backgroundColor: '#1a1d24', color: '#ef4444', border: '1px solid #ef444440' }}
        >
          CUE
        </button>

        <button
          onClick={active ? onTogglePlay : undefined}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: active ? (playing ? '#1e2128' : color) : '#1a1d24',
            border: `2px solid ${active ? color : '#2d3340'}`,
            boxShadow: active && playing ? `0 0 18px ${color}50` : 'none',
            cursor: active ? 'pointer' : 'not-allowed',
          }}
        >
          {playing && active ? (
            <svg className="w-6 h-6" fill="currentColor" style={{ color: '#fff' }} viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" fill="currentColor" style={{ color: active ? '#fff' : '#374151' }} viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={onSyncToggle}
          className="flex-1 h-9 rounded-lg text-[8px] font-black tracking-wider transition-all active:scale-95"
          style={{
            backgroundColor: synced ? '#f59e0b15' : '#1a1d24',
            color: synced ? '#fbbf24' : '#4b5563',
            border: `1px solid ${synced ? '#f59e0b50' : '#2d3340'}`,
          }}
        >
          SYNC
        </button>

        <button
          className="flex-1 h-8 rounded text-[7px] font-black tracking-wide transition-all active:scale-95"
          style={{ backgroundColor: '#1a1d24', color: '#4b5563', border: '1px solid #2d3340' }}
        >
          REV
        </button>
      </div>
    </div>
  )
}

// ── Center Mixer ───────────────────────────────────────────────────────────────
function CenterMixer({
  eqA, onEqAChange, gainA, onGainAChange, faderA, onFaderAChange, pflA, onPflAToggle,
  eqB, onEqBChange, gainB, onGainBChange, faderB, onFaderBChange, pflB, onPflBToggle,
  crossfader, onCrossfaderChange,
  masterVol, onMasterVolChange,
  boothVol, onBoothVolChange,
  playing, playingB = false,
  levelA = 0, levelB = 0, levelMasterL = 0, levelMasterR = 0,
  autoDJ = false, onAutoDJToggle, autoDJToast = '',
}) {
  return (
    <div
      className="flex flex-col gap-2 p-3 border-l border-r border-[#1e2128]"
      style={{ background: '#0a0c10', minWidth: 190 }}
    >
      <div className="text-center border-b border-[#1e2128] pb-1.5">
        <span className="text-[8px] font-black tracking-widest uppercase text-gray-600">Mixer</span>
      </div>

      <div className="flex justify-center items-end gap-2">
        <div className="flex flex-col items-center gap-0.5">
          <VuStrip level={levelMasterL} segments={14} />
          <span className="text-[6px] text-gray-700 uppercase">L</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <VuStrip level={levelMasterR} segments={14} />
          <span className="text-[6px] text-gray-700 uppercase">R</span>
        </div>
        <div className="flex flex-col items-center justify-start gap-1 self-start pt-0.5">
          <div
            className="text-[6px] font-bold px-1 py-0.5 rounded"
            style={{ background: '#1a1d24', color: '#4b5563', border: '1px solid #2d3340' }}
          >
            CLIP
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#38bdf8' }}>
            CH A
          </span>
          <Knob value={eqA.hi}  onChange={(v) => onEqAChange('hi', v)}  size={26} color="#38bdf8" label="HI" />
          <Knob value={eqA.mid} onChange={(v) => onEqAChange('mid', v)} size={26} color="#38bdf8" label="MID" />
          <Knob value={eqA.lo}  onChange={(v) => onEqAChange('lo', v)}  size={26} color="#38bdf8" label="LO" />
          <Knob value={gainA}   onChange={onGainAChange}                size={22} color="#38bdf8" label="GAIN" />
          <VuStrip active={playing} level={levelA} segments={10} />
          <VFader value={faderA} onChange={onFaderAChange} height={90} color="#38bdf8" />
          <button
            onClick={onPflAToggle}
            className="w-full h-6 rounded text-[7px] font-black transition-colors"
            style={{
              backgroundColor: pflA ? '#38bdf820' : '#1a1d24',
              color: pflA ? '#38bdf8' : '#4b5563',
              border: `1px solid ${pflA ? '#38bdf860' : '#2d3340'}`,
            }}
          >
            PFL
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#fbbf24' }}>
            CH B
          </span>
          <Knob value={eqB.hi}  onChange={(v) => onEqBChange('hi', v)}  size={26} color="#fbbf24" label="HI" />
          <Knob value={eqB.mid} onChange={(v) => onEqBChange('mid', v)} size={26} color="#fbbf24" label="MID" />
          <Knob value={eqB.lo}  onChange={(v) => onEqBChange('lo', v)}  size={26} color="#fbbf24" label="LO" />
          <Knob value={gainB}   onChange={onGainBChange}                size={22} color="#fbbf24" label="GAIN" />
          <VuStrip active={playingB} level={levelB} segments={10} />
          <VFader value={faderB} onChange={onFaderBChange} height={90} color="#fbbf24" />
          <button
            onClick={onPflBToggle}
            className="w-full h-6 rounded text-[7px] font-black transition-colors"
            style={{
              backgroundColor: pflB ? '#fbbf2420' : '#1a1d24',
              color: pflB ? '#fbbf24' : '#4b5563',
              border: `1px solid ${pflB ? '#fbbf2460' : '#2d3340'}`,
            }}
          >
            PFL
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-1">
        <div className="flex justify-between text-[7px] text-gray-700 font-bold uppercase px-0.5">
          <span>A</span>
          <span>X-FADER</span>
          <span>B</span>
        </div>
        <HFader value={crossfader} onChange={onCrossfaderChange} />
        <div className="text-center">
          <span className="text-[7px] font-mono text-gray-700">
            {crossfader < 0.45 ? '&#9668; A' : crossfader > 0.55 ? 'B &#9658;' : '\u2500 CTR \u2500'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 justify-center mt-1">
        <Knob value={masterVol} onChange={onMasterVolChange} size={30} color="#d1d5db" label="MASTER" />
        <Knob value={boothVol}  onChange={onBoothVolChange}  size={30} color="#9ca3af" label="BOOTH" />
      </div>

      {/* Auto DJ toggle */}
      <div className="flex flex-col gap-1 mt-1">
        <button
          onClick={onAutoDJToggle}
          className="w-full h-7 rounded text-[7px] font-black tracking-wider transition-all"
          style={{
            backgroundColor: autoDJ ? '#6d28d922' : '#1a1d24',
            color:            autoDJ ? '#a78bfa'   : '#4b5563',
            border:           `1px solid ${autoDJ ? '#6d28d960' : '#2d3340'}`,
            boxShadow:        autoDJ ? '0 0 8px #6d28d930' : 'none',
          }}
        >
          ⚡ AUTO DJ {autoDJ ? 'ON' : 'OFF'}
        </button>
        {autoDJToast && (
          <p className="text-[8px] text-orange-400 text-center font-bold leading-tight px-1">
            {autoDJToast}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Go Live Video button (video mode) ─────────────────────────────────────────
function VideoGoLiveButton({ streamKey }) {
  const { videoStatus, startVideo, stopVideo } = useStream()
  const videoLive = videoStatus === 'live'
  const videoConnecting = videoStatus === 'connecting'
  return (
    <button
      onClick={videoLive ? stopVideo : () => startVideo(streamKey)}
      disabled={videoConnecting}
      title={videoLive ? 'Stop video broadcast' : 'Go Live Video — share your screen'}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-150 shrink-0 ${
        videoLive
          ? 'bg-purple-600 text-white shadow-[0_0_14px_#7c3aed55] animate-pulse'
          : videoConnecting
          ? 'bg-gray-700 text-gray-400 cursor-wait border border-gray-600'
          : videoStatus === 'error'
          ? 'bg-red-900 text-red-300 border border-red-700 hover:border-red-500 hover:text-white'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-purple-500 hover:text-purple-400'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
      </svg>
      {videoLive ? '● LIVE VIDEO' : videoConnecting ? 'CONNECTING…' : videoStatus === 'error' ? 'RETRY VIDEO' : 'GO LIVE VIDEO'}
    </button>
  )
}

// ── Main Player ────────────────────────────────────────────────────────────────
export default function Player({ mode, config, trackA, trackB, queue = [], onQueuePop, onLoadTrackA, onLoadTrackB }) {
  const mediaRef = useRef(null)
  const mediaRefB = useRef(null)
  const hlsRef   = useRef(null)
  const retryTimer = useRef(null)
  const prevLocalUrlRef = useRef(null)
  const prevLocalUrlRefB = useRef(null)

  const audioEngine = useAudioEngine()
  const djConnected = audioEngine?.djConnected ?? false

  // Register audio elements with AudioEngine once they are mounted
  useEffect(() => {
    if (!audioEngine) return
    if (mediaRef.current)  audioEngine.registerMediaElement('dj-a', mediaRef.current)
    if (mediaRefB.current) audioEngine.registerMediaElement('dj-b', mediaRefB.current)
  }) // runs every render; registerMediaElement is a no-op if same element

  const [playing,    setPlaying]    = useState(false)
  const [playingB,   setPlayingB]   = useState(false)
  const [volume,     setVolume]     = useState(1)
  const [muted,      setMuted]      = useState(false)
  const [error,      setError]      = useState(null)
  const [streamLive, setStreamLive] = useState(false)
  const [latency,    setLatency]    = useState(null)

  const [pitchA, setPitchA] = useState(0)
  const [pitchB, setPitchB] = useState(0)
  const [hotCuesA, setHotCuesA] = useState([false, false, false, false])
  const [hotCuesB, setHotCuesB] = useState([false, false, false, false])
  const [loopActA, setLoopActA] = useState(false)
  const [loopActB, setLoopActB] = useState(false)
  const [loopIdxA, setLoopIdxA] = useState(3)
  const [loopIdxB, setLoopIdxB] = useState(3)
  const [syncA, setSyncA] = useState(false)
  const [syncB, setSyncB] = useState(false)
  const [keyA,  setKeyA]  = useState(false)
  const [keyB,  setKeyB]  = useState(false)

  const [progressA, setProgressA] = useState(0)
  const [progressB, setProgressB] = useState(0)

  // Track playhead position for Deck A + stop when track ends
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    const onTime = () => {
      if (!isFinite(media.duration) || media.duration === 0) return
      setProgressA(media.currentTime / media.duration)
    }
    const onEnded = async () => {
      setPlaying(false)
      setProgressA(0)
      if (!autoDJRef.current) return

      if (preloadedDeckRef.current === 'B') {
        // Standby Deck B is pre-loaded — wait for ready state then play
        preloadedDeckRef.current = null
        const mb = mediaRefB.current
        if (mb) {
          if (mb.readyState < 2) {
            await new Promise((r) => {
              const h = () => { mb.removeEventListener('canplay', h); r() }
              mb.addEventListener('canplay', h)
              setTimeout(r, 5000)
            })
          }
          try { await audioEngineRef.current?.resume(); await mb.play(); setPlayingB(true) } catch { /**/ }
        }
      } else {
        // Load from queue
        const q = queueRef.current
        if (!q.length) {
          setAutoDJToast('Queue empty \u2014 Auto DJ paused')
          setAutoDJ(false); autoDJRef.current = false
          return
        }
        const next = q[0]
        onQueuePopRef.current?.()
        const mb = mediaRefB.current
        if (mb) {
          // Register canplay before triggering load so we don't miss the event
          const readyPromise = new Promise((r) => {
            const h = () => { mb.removeEventListener('canplay', h); r() }
            mb.addEventListener('canplay', h)
            setTimeout(r, 4000)
          })
          onLoadTrackBRef.current?.({ ...next })  // updates UI + triggers audio load via useEffect
          setPlayingB(false); setProgressB(0)
          await readyPromise
          try { await audioEngineRef.current?.resume(); await mb.play(); setPlayingB(true) } catch { /**/ }
        }
      }

      // Sweep crossfader toward B (1.0) over 3 s
      const x0 = crossfaderRef.current
      if (sweepRAFRef.current) cancelAnimationFrame(sweepRAFRef.current)
      const t0 = performance.now()
      const sweep = (now) => {
        const p = Math.min(1, (now - t0) / 3000)
        const v = x0 + (1 - x0) * p
        crossfaderRef.current = v; setCrossfader(v)
        if (p < 1) {
          sweepRAFRef.current = requestAnimationFrame(sweep)
        } else {
          sweepRAFRef.current = null
          const ma = mediaRef.current
          if (ma) { ma.pause(); ma.currentTime = 0 }
          setPlaying(false); setProgressA(0)
          // Daisy-chain: pre-load the next queued track onto freed Deck A
          if (autoDJRef.current && queueRef.current.length) {
            const upcoming = queueRef.current[0]
            onQueuePopRef.current?.()
            onLoadTrackARef.current?.({ ...upcoming })
            preloadedDeckRef.current = 'A'
          }
        }
      }
      sweepRAFRef.current = requestAnimationFrame(sweep)
    }
    media.addEventListener('timeupdate', onTime)
    media.addEventListener('ended', onEnded)
    return () => {
      media.removeEventListener('timeupdate', onTime)
      media.removeEventListener('ended', onEnded)
    }
  }, [playing])

  // Track playhead position for Deck B + stop when track ends
  useEffect(() => {
    const media = mediaRefB.current
    if (!media) return
    const onTime = () => {
      if (!isFinite(media.duration) || media.duration === 0) return
      setProgressB(media.currentTime / media.duration)
    }
    const onEnded = async () => {
      setPlayingB(false)
      setProgressB(0)
      if (!autoDJRef.current) return

      if (preloadedDeckRef.current === 'A') {
        // Standby Deck A is pre-loaded — wait for ready state then play
        preloadedDeckRef.current = null
        const ma = mediaRef.current
        if (ma) {
          if (ma.readyState < 2) {
            await new Promise((r) => {
              const h = () => { ma.removeEventListener('canplay', h); r() }
              ma.addEventListener('canplay', h)
              setTimeout(r, 5000)
            })
          }
          try { await audioEngineRef.current?.resume(); await ma.play(); setPlaying(true) } catch { /**/ }
        }
      } else {
        // Load from queue
        const q = queueRef.current
        if (!q.length) {
          setAutoDJToast('Queue empty \u2014 Auto DJ paused')
          setAutoDJ(false); autoDJRef.current = false
          return
        }
        const next = q[0]
        onQueuePopRef.current?.()
        const ma = mediaRef.current
        if (ma) {
          // Register canplay before triggering load so we don't miss the event
          const readyPromise = new Promise((r) => {
            const h = () => { ma.removeEventListener('canplay', h); r() }
            ma.addEventListener('canplay', h)
            setTimeout(r, 4000)
          })
          onLoadTrackARef.current?.({ ...next })  // updates UI + triggers audio load via useEffect
          setPlaying(false); setProgressA(0)
          await readyPromise
          try { await audioEngineRef.current?.resume(); await ma.play(); setPlaying(true) } catch { /**/ }
        }
      }

      // Sweep crossfader toward A (0.0) over 3 s
      const x0 = crossfaderRef.current
      if (sweepRAFRef.current) cancelAnimationFrame(sweepRAFRef.current)
      const t0 = performance.now()
      const sweep = (now) => {
        const p = Math.min(1, (now - t0) / 3000)
        const v = x0 * (1 - p)
        crossfaderRef.current = v; setCrossfader(v)
        if (p < 1) {
          sweepRAFRef.current = requestAnimationFrame(sweep)
        } else {
          sweepRAFRef.current = null
          const mb = mediaRefB.current
          if (mb) { mb.pause(); mb.currentTime = 0 }
          setPlayingB(false); setProgressB(0)
          // Daisy-chain: pre-load the next queued track onto freed Deck B
          if (autoDJRef.current && queueRef.current.length) {
            const upcoming = queueRef.current[0]
            onQueuePopRef.current?.()
            onLoadTrackBRef.current?.({ ...upcoming })
            preloadedDeckRef.current = 'B'
          }
        }
      }
      sweepRAFRef.current = requestAnimationFrame(sweep)
    }
    media.addEventListener('timeupdate', onTime)
    media.addEventListener('ended', onEnded)
    return () => {
      media.removeEventListener('timeupdate', onTime)
      media.removeEventListener('ended', onEnded)
    }
  }, [playingB])

  const [eqA, setEqA] = useState({ hi: 0.7,  mid: 0.65, lo: 0.65 })
  const [eqB, setEqB] = useState({ hi: 0.65, mid: 0.6,  lo: 0.6  })
  const [gainA, setGainA] = useState(0.7)
  const [gainB, setGainB] = useState(0.65)
  const [faderA, setFaderA] = useState(0.9)
  const [faderB, setFaderB] = useState(0.75)
  const [pflA, setPflA] = useState(false)
  const [pflB, setPflB] = useState(false)
  const [crossfader, setCrossfader] = useState(0.5)
  const crossfaderRef = useRef(0.5)
  const sweepRAFRef   = useRef(null)

  // ── Auto DJ ─────────────────────────────────────────────────────────────────
  const [autoDJ,      setAutoDJ]      = useState(false)
  const [autoDJToast, setAutoDJToast] = useState('')
  const autoDJRef        = useRef(false)
  const queueRef         = useRef([])
  const audioEngineRef   = useRef(null)
  const onQueuePopRef    = useRef(null)
  const onLoadTrackARef  = useRef(null)
  const onLoadTrackBRef  = useRef(null)
  const preloadedDeckRef = useRef(null) // 'A' | 'B' | null — standby deck pre-loaded for next transition

  const [masterVol,  setMasterVol]  = useState(0.85)
  const [boothVol,   setBoothVol]   = useState(0.7)

  // ── Sync deck faders + crossfader to media element volume ───────────────────
  useEffect(() => {
    if (!mediaRef.current) return
    const xA = crossfader <= 0.5 ? 1 : 1 - (crossfader - 0.5) * 2
    mediaRef.current.volume = Math.max(0, Math.min(1, faderA * xA))
  }, [faderA, crossfader])

  useEffect(() => {
    if (!mediaRefB.current) return
    const xB = crossfader >= 0.5 ? 1 : crossfader * 2
    mediaRefB.current.volume = Math.max(0, Math.min(1, faderB * xB))
  }, [faderB, crossfader])

  // ── Sync per-deck EQ knobs to AudioEngine ───────────────────────────────────
  useEffect(() => {
    if (!audioEngine?.updateDeckEq) return
    audioEngine.updateDeckEq('dj-a', 'hi',  eqA.hi)
    audioEngine.updateDeckEq('dj-a', 'mid', eqA.mid)
    audioEngine.updateDeckEq('dj-a', 'lo',  eqA.lo)
  }, [eqA, audioEngine])

  useEffect(() => {
    if (!audioEngine?.updateDeckEq) return
    audioEngine.updateDeckEq('dj-b', 'hi',  eqB.hi)
    audioEngine.updateDeckEq('dj-b', 'mid', eqB.mid)
    audioEngine.updateDeckEq('dj-b', 'lo',  eqB.lo)
  }, [eqB, audioEngine])

  // ── Sync Auto DJ refs with latest values ──────────────────────────────────────
  useEffect(() => { audioEngineRef.current  = audioEngine  }, [audioEngine])
  useEffect(() => { onQueuePopRef.current   = onQueuePop   }, [onQueuePop])
  useEffect(() => { onLoadTrackARef.current = onLoadTrackA }, [onLoadTrackA])
  useEffect(() => { onLoadTrackBRef.current = onLoadTrackB }, [onLoadTrackB])
  useEffect(() => { autoDJRef.current       = autoDJ       }, [autoDJ])
  useEffect(() => { queueRef.current        = queue        }, [queue])

  // ── Pitch → playbackRate ───────────────────────────────────────────────────────
  useEffect(() => {
    if (mediaRef.current)  mediaRef.current.playbackRate  = Math.max(0.5, Math.min(2, 1 + pitchA * 0.08))
  }, [pitchA])

  useEffect(() => {
    if (mediaRefB.current) mediaRefB.current.playbackRate = Math.max(0.5, Math.min(2, 1 + pitchB * 0.08))
  }, [pitchB])

  // ── Cancel sweep RAF on unmount ────────────────────────────────────────────────
  useEffect(() => () => { if (sweepRAFRef.current) cancelAnimationFrame(sweepRAFRef.current) }, [])

  // ── Real-time VU levels for the Player CenterMixer strips ─────────────────
  const [deckLevels, setDeckLevels] = useState({ a: 0, b: 0, masterL: 0, masterR: 0 })
  const deckBufsRef = useRef({})
  const vuRafRef = useRef(null)

  useEffect(() => {
    if (!audioEngine) return
    const readRms = (analyser, key) => {
      if (!analyser) return 0
      let buf = deckBufsRef.current[key]
      if (!buf || buf.length !== analyser.frequencyBinCount) {
        buf = new Uint8Array(analyser.frequencyBinCount)
        deckBufsRef.current[key] = buf
      }
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      return Math.min(1, Math.sqrt(sum / buf.length) * 4.0)
    }
    const tick = () => {
      const rmsA = readRms(audioEngine.getDeckAnalyser?.('dj-a'), 'dj-a')
      const rmsB = readRms(audioEngine.getDeckAnalyser?.('dj-b'), 'dj-b')
      const rmsM = readRms(audioEngine.getMasterAnalyser?.(), 'master')
      setDeckLevels({ a: rmsA, b: rmsB, masterL: rmsM, masterR: rmsM * 0.97 })
      vuRafRef.current = requestAnimationFrame(tick)
    }
    vuRafRef.current = requestAnimationFrame(tick)
    return () => { if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current) }
  }, [audioEngine])

  const streamUrl = mode === 'radio' ? config?.radioUrl : config?.videoUrl
  const streamKey = streamKeyFromUrl(streamUrl) ?? (mode === 'radio' ? 'radio' : 'video')

  // Load local track into Deck A
  useEffect(() => {
    if (!trackA) return
    const media = mediaRef.current
    if (!media) return
    // Tear down HLS
    clearTimeout(retryTimer.current)
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    // Revoke previous object URL to free memory (skip if same URL — repeat mode reuses the same blob)
    if (prevLocalUrlRef.current && prevLocalUrlRef.current !== trackA.url) URL.revokeObjectURL(prevLocalUrlRef.current)
    prevLocalUrlRef.current = trackA.url
    media.pause()
    media.src = trackA.url
    media.load()
    setPlaying(false)
    setError(null)
    setStreamLive(false)
  }, [trackA])

  // Load local track into Deck B
  useEffect(() => {
    if (!trackB) return
    const media = mediaRefB.current
    if (!media) return
    if (prevLocalUrlRefB.current && prevLocalUrlRefB.current !== trackB.url) URL.revokeObjectURL(prevLocalUrlRefB.current)
    prevLocalUrlRefB.current = trackB.url
    media.pause()
    media.src = trackB.url
    media.load()
    setPlayingB(false)
  }, [trackB])

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch(`/api/streams/status?key=${streamKey}`)
        if (!r.ok) return
        const d = await r.json()
        if (alive) setStreamLive(!!d.live)
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [streamKey])

  const setupHls = useCallback(() => {
    const media = mediaRef.current
    if (!media || !streamUrl) return
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    if (Hls.isSupported()) {
      const hls = new Hls(HLS_CONFIG)
      hlsRef.current = hls
      hls.loadSource(streamUrl)
      hls.attachMedia(media)
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setError(null); setStreamLive(true) })
      hls.on(Hls.Events.FRAG_CHANGED, () => {
        if (hls.latency != null) setLatency(hls.latency.toFixed(1))
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return
        if (
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR
        ) {
          setStreamLive(false)
          retryTimer.current = setTimeout(setupHls, 3000)
        } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad()
        } else {
          setError('Stream error \u2014 reconnecting\u2026')
          retryTimer.current = setTimeout(setupHls, 3000)
        }
      })
    } else if (mediaRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      mediaRef.current.src = streamUrl
    } else {
      setError('HLS is not supported in this browser.')
    }
  }, [streamUrl])

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    media.pause()
    setPlaying(false)
    setError(null)
    setLatency(null)
    clearTimeout(retryTimer.current)
    if (!streamUrl) {
      setError('No stream URL configured \u2014 open Settings to add one.')
      return
    }
    setupHls()
    return () => {
      clearTimeout(retryTimer.current)
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
      media.pause()
    }
  }, [streamUrl, setupHls])

  // ── Crossfader change — cancels any in-progress sweep ─────────────────────────
  const handleCrossfaderChange = (v) => {
    if (sweepRAFRef.current) { cancelAnimationFrame(sweepRAFRef.current); sweepRAFRef.current = null }
    crossfaderRef.current = v
    setCrossfader(v)
  }

  // ── Auto DJ toggle — snaps crossfader + pre-loads standby deck on enable ──────
  const handleAutoDJToggle = () => {
    const next = !autoDJ
    setAutoDJ(next)
    autoDJRef.current = next
    setAutoDJToast('')

    if (!next) {
      if (sweepRAFRef.current) { cancelAnimationFrame(sweepRAFRef.current); sweepRAFRef.current = null }
      preloadedDeckRef.current = null
      return
    }

    // Snap crossfader fully to the side of the currently playing deck
    if (playing) {
      crossfaderRef.current = 0; setCrossfader(0)
    } else if (playingB) {
      crossfaderRef.current = 1; setCrossfader(1)
    }

    // Pre-load the first queued track onto the standby deck
    const q = queueRef.current
    if (!q.length) {
      setAutoDJToast('Queue empty \u2014 add tracks to Auto Playlist first')
      return
    }
    const nextTrack = q[0]
    onQueuePopRef.current?.()

    if (!playingB) {
      // Standby = Deck B — load via App state so the UI updates
      onLoadTrackBRef.current?.({ ...nextTrack })
      preloadedDeckRef.current = 'B'
    } else {
      // Standby = Deck A — load via App state so the UI updates
      onLoadTrackARef.current?.({ ...nextTrack })
      preloadedDeckRef.current = 'A'
    }
  }

  const togglePlay = async () => {
    const media = mediaRef.current
    if (!media) return
    if (!djConnected) {
      setError('Assign “DJ Player” to a Mixer channel first')
      return
    }
    try {
      if (playing) {
        media.pause()
        setPlaying(false)
      } else {
        await audioEngine?.resume()
        await media.play()
        setPlaying(true)
        setError(null)
      }
    } catch {
      setError('Playback blocked. Tap Play to try again.')
      setPlaying(false)
    }
  }

  const togglePlayB = async () => {
    const media = mediaRefB.current
    if (!media || !trackB) return
    if (!djConnected) return
    try {
      if (playingB) {
        media.pause()
        setPlayingB(false)
      } else {
        await audioEngine?.resume()
        await media.play()
        setPlayingB(true)
      }
    } catch {
      setPlayingB(false)
    }
  }

  const handleVolume = (v) => {
    setVolume(v)
    if (mediaRef.current) {
      mediaRef.current.volume = v
      mediaRef.current.muted = v === 0
      setMuted(v === 0)
    }
  }

  const toggleMute = () => {
    if (!mediaRef.current) return
    const next = !muted
    mediaRef.current.muted = next
    setMuted(next)
  }

  const handleFullscreen = () => mediaRef.current?.requestFullscreen?.()

  return (
    <div className="bg-[#0a0c10] rounded-2xl overflow-hidden border border-[#1e2128]">
      {mode === 'video' ? (
        <>
          <div className="relative bg-black aspect-video">
            <video ref={mediaRef} className="w-full h-full object-contain" playsInline />
            {!playing && !error && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 group"
              >
                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center group-hover:bg-red-500 transition-colors shadow-2xl">
                  <svg className="w-9 h-9 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <p className="text-red-400 text-sm text-center px-6">{error}</p>
              </div>
            )}
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors flex-shrink-0"
            >
              {playing ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
              {muted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range" min="0" max="1" step="0.02"
              value={muted ? 0 : volume}
              onChange={(e) => handleVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-red-500 cursor-pointer"
            />
            <button onClick={handleFullscreen} className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
            <VideoGoLiveButton streamKey={streamKey} />
            <span
              className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                streamLive ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-400'
              }`}
            >
              {streamLive ? 'LIVE' : 'OFFLINE'}
            </span>
            {latency !== null && playing && (
              <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">{latency}s</span>
            )}
          </div>
        </>
      ) : (
        <div className="select-none">
          <audio ref={mediaRef} />
          <audio ref={mediaRefB} />
            <div className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  streamLive ? 'bg-red-500 animate-pulse' : 'bg-gray-700'
                }`}
              />
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {config?.stationName ?? 'Radio In One Stop'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] text-gray-700 uppercase font-bold">VOL</span>
                <input
                  type="range" min="0" max="1" step="0.02"
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolume(parseFloat(e.target.value))}
                  className="w-16 cursor-pointer"
                  style={{ accentColor: '#ef4444' }}
                />
                <button onClick={toggleMute} className="text-gray-600 hover:text-white transition-colors">
                  {muted || volume === 0 ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <span className="text-[10px] text-red-400 truncate max-w-[180px]">{error}</span>
              )}
              {latency !== null && playing && (
                <span className="text-[9px] font-mono text-gray-600">{latency}s delay</span>
              )}
            </div>
          {!djConnected && (
            <div className="mx-4 mb-2 px-4 py-2.5 rounded-lg bg-amber-950/60 border border-amber-700/50 flex items-center gap-2.5">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <span className="text-[11px] text-amber-300 font-medium">
                Go to <strong>Mixer</strong> and assign <strong>DJ Player</strong> to a channel before playing
              </span>
            </div>
          )}
          <div className="flex flex-col lg:flex-row">
            <DeckUnit
              side="A" color="#38bdf8"
              active={true} playing={playing} onTogglePlay={togglePlay}
              streamLive={streamLive} stationName={trackA?.name ?? config?.stationName}
              waveData={WAVE_A} progress={progressA}
              pitch={pitchA} onPitchChange={setPitchA}
              hotCues={hotCuesA}
              onHotCueSet={(i) => setHotCuesA((c) => c.map((v, j) => (j === i ? true : v)))}
              onHotCueClear={(i) => setHotCuesA((c) => c.map((v, j) => (j === i ? false : v)))}
              loopActive={loopActA} loopSizeIdx={loopIdxA}
              onLoopToggle={() => setLoopActA((v) => !v)}
              onLoopResize={(d) => setLoopIdxA((v) => Math.max(0, Math.min(LOOP_SIZES.length - 1, v + d)))}
              synced={syncA} onSyncToggle={() => setSyncA((v) => !v)}
              keyLock={keyA} onKeyLockToggle={() => setKeyA((v) => !v)}
            />

            <CenterMixer
              eqA={eqA}    onEqAChange={(k, v) => setEqA((e) => ({ ...e, [k]: v }))}
              gainA={gainA} onGainAChange={setGainA}
              faderA={faderA} onFaderAChange={setFaderA}
              pflA={pflA} onPflAToggle={() => setPflA((v) => !v)}
              eqB={eqB}    onEqBChange={(k, v) => setEqB((e) => ({ ...e, [k]: v }))}
              gainB={gainB} onGainBChange={setGainB}
              faderB={faderB} onFaderBChange={setFaderB}
              pflB={pflB} onPflBToggle={() => setPflB((v) => !v)}
              crossfader={crossfader} onCrossfaderChange={handleCrossfaderChange}
              masterVol={masterVol} onMasterVolChange={setMasterVol}
              boothVol={boothVol}  onBoothVolChange={setBoothVol}
              playing={playing}
              playingB={playingB}
              levelA={deckLevels.a}
              levelB={deckLevels.b}
              levelMasterL={deckLevels.masterL}
              levelMasterR={deckLevels.masterR}
              autoDJ={autoDJ}
              onAutoDJToggle={handleAutoDJToggle}
              autoDJToast={autoDJToast}
            />

            <DeckUnit
              side="B" color="#fbbf24"
              active={!!trackB} playing={playingB} onTogglePlay={togglePlayB}
              streamLive={false} stationName={trackB?.name ?? config?.stationName}
              waveData={WAVE_B} progress={progressB}
              pitch={pitchB} onPitchChange={setPitchB}
              hotCues={hotCuesB}
              onHotCueSet={(i) => setHotCuesB((c) => c.map((v, j) => (j === i ? true : v)))}
              onHotCueClear={(i) => setHotCuesB((c) => c.map((v, j) => (j === i ? false : v)))}
              loopActive={loopActB} loopSizeIdx={loopIdxB}
              onLoopToggle={() => setLoopActB((v) => !v)}
              onLoopResize={(d) => setLoopIdxB((v) => Math.max(0, Math.min(LOOP_SIZES.length - 1, v + d)))}
              synced={syncB} onSyncToggle={() => setSyncB((v) => !v)}
              keyLock={keyB} onKeyLockToggle={() => setKeyB((v) => !v)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
