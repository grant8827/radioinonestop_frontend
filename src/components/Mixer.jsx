import { useRef, useState, useCallback, useEffect } from 'react'
import { useAudioEngine } from '../context/AudioEngine'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      '#0d1117',
  surface: '#161c26',
  raised:  '#1c2333',
  border:  '#232d3f',
  borderFaint: '#1a2030',
  text:    '#e2e8f0',
  muted:   '#64748b',
  faint:   '#2d3748',
}

// ─── Arc-track Knob ──────────────────────────────────────────────────────────
function Knob({ value, onChange, size = 44, color = '#38bdf8', label }) {
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
  const LEDS     = 13
  const ledDot   = 2.6
  const ringR    = size * 0.43
  const capR     = size * 0.28
  const startDeg = -225, sweep = 270
  const toRad    = d => d * Math.PI / 180
  const litCount = Math.round(value * (LEDS - 1))
  const tickAngle = toRad(startDeg + sweep * value - 90)
  const [mx1, my1] = [cx + capR * 0.28 * Math.cos(tickAngle), cy + capR * 0.28 * Math.sin(tickAngle)]
  const [mx2, my2] = [cx + capR * 0.88 * Math.cos(tickAngle), cy + capR * 0.88 * Math.sin(tickAngle)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, userSelect: 'none' }}>
      {label && (
        <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      )}
      <svg width={size} height={size} style={{ touchAction: 'none', cursor: 'ns-resize', overflow: 'visible' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}>
        {/* Cap drop-shadow */}
        <circle cx={cx} cy={cy + 2.5} r={capR + 2} fill="#00000077" />
        {/* LED ring — unlit slots */}
        {Array.from({ length: LEDS }).map((_, i) => {
          const deg = startDeg - 90 + (sweep / (LEDS - 1)) * i
          const lx = cx + ringR * Math.cos(toRad(deg))
          const ly = cy + ringR * Math.sin(toRad(deg))
          return <circle key={i} cx={lx} cy={ly} r={ledDot} fill="#0e1420" stroke="#1e2840" strokeWidth="0.5" />
        })}
        {/* LED ring — lit segments */}
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
        {/* Cap */}
        <circle cx={cx} cy={cy} r={capR} fill="#0d1520" />
        <ellipse cx={cx - capR * 0.18} cy={cy - capR * 0.28} rx={capR * 0.55} ry={capR * 0.28} fill="#ffffff0a" />
        <circle cx={cx} cy={cy} r={capR} fill="none" stroke="#ffffff10" strokeWidth="1" />
        {/* Marker */}
        <line x1={mx1} y1={my1} x2={mx2} y2={my2}
          stroke={color} strokeWidth="2" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      </svg>
      <span style={{ fontSize: 9, color: T.muted, fontFamily: '"SF Mono", "Fira Code", monospace', lineHeight: 1 }}>
        {Math.round(value * 100)}
      </span>
    </div>
  )
}

// ─── Vertical fader ───────────────────────────────────────────────────────────
function VFader({ value, onChange, height = 140, color = '#e2e8f0', label }) {
  const trackRef = useRef(null)
  const dragRef  = useRef(null)
  const getVal = (clientY) => {
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, 1 - (clientY - rect.top - 8) / (rect.height - 16)))
  }
  const onPointerDown = (e) => {
    e.preventDefault()
    trackRef.current.setPointerCapture(e.pointerId)
    dragRef.current = true
    onChange(getVal(e.clientY))
  }
  const onPointerMove = (e) => { if (dragRef.current) onChange(getVal(e.clientY)) }
  const onPointerUp   = () => { dragRef.current = null }

  const travel    = height - 16
  const capH      = 20
  const capBottom = 8 + value * travel - capH / 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, userSelect: 'none' }}>
      {label && (
        <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      )}
      <span style={{ fontSize: 9, color: T.muted, fontFamily: '"SF Mono", monospace' }}>
        {Math.round(value * 100)}
      </span>
      <div ref={trackRef}
        style={{ height, width: 34, position: 'relative', cursor: 'pointer', touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {/* Track groove */}
        <div style={{
          position: 'absolute', left: '50%', top: 8, bottom: 8,
          width: 6, transform: 'translateX(-50%)',
          background: '#080b10', borderRadius: 3,
          boxShadow: 'inset 0 0 6px #000000cc, inset 0 1px 2px #000000aa',
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute', left: '50%', bottom: 8,
          width: 6, height: `${value * travel}px`,
          transform: 'translateX(-50%)',
          background: `linear-gradient(to top, ${color}55, ${color}22)`,
          borderRadius: '0 0 3px 3px',
        }} />
        {/* Cap shadow */}
        <div style={{
          position: 'absolute', left: '50%', bottom: `${capBottom - 2}px`,
          width: 28, height: capH, borderRadius: 4,
          transform: 'translateX(-50%)',
          background: '#00000066', pointerEvents: 'none',
        }} />
        {/* Cap body */}
        <div style={{
          position: 'absolute', left: '50%', bottom: `${capBottom}px`,
          width: 28, height: capH, borderRadius: 4,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #3f4e6a 0%, #232f46 50%, #151c2e 100%)',
          border: `1px solid ${color}33`,
          boxShadow: `0 4px 10px #00000099, inset 0 1px 0 #ffffff18`,
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '15%', right: '15%',
            height: 1, background: `${color}55`, transform: 'translateY(-2px)', borderRadius: 1,
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

// ─── LED VU meter ─────────────────────────────────────────────────────────────
function VuMeter({ level = 0, segments = 22, width = 7, active = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2 }}>
      {Array.from({ length: segments }, (_, i) => {
        const t = i / (segments - 1)
        const lit = active && level > t
        let on, off
        if (t < 0.6)      { on = '#22d45a'; off = '#0f2018' }
        else if (t < 0.78){ on = '#facc15'; off = '#1e1b06' }
        else if (t < 0.9) { on = '#f97316'; off = '#1e0f06' }
        else               { on = '#ef4444'; off = '#1e0808' }
        return (
          <div key={i} style={{
            width, height: 5, borderRadius: 1,
            background: lit ? on : off,
            boxShadow: lit ? `0 0 4px ${on}99` : 'none',
            transition: 'background 0.04s',
          }} />
        )
      })}
    </div>
  )
}

// ─── Stereo VU pair ───────────────────────────────────────────────────────────
function StereoVu({ levelL = 0, levelR = 0, active = true, segments = 26, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', gap: 4 }}>
        <VuMeter level={levelL} segments={segments} active={active} width={8} />
        <VuMeter level={levelR} segments={segments} active={active} width={8} />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {['L', 'R'].map(ch => (
          <span key={ch} style={{ fontSize: 8, color: T.faint, width: 8, textAlign: 'center', fontWeight: 700 }}>{ch}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Pill toggle button ───────────────────────────────────────────────────────
function Pill({ on, onToggle, label, color = '#22c55e', width = '100%' }) {
  return (
    <button onClick={onToggle} style={{
      width,
      padding: '4px 0',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.09em',
      textTransform: 'uppercase',
      borderRadius: 20,
      border: `1px solid ${on ? color + '70' : T.border}`,
      background: on ? `linear-gradient(135deg, ${color}30, ${color}18)` : T.raised,
      color: on ? color : T.muted,
      boxShadow: on ? `0 0 8px ${color}33, inset 0 1px 0 ${color}22` : 'inset 0 1px 0 #ffffff08',
      cursor: 'pointer',
      transition: 'all 0.12s ease',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

// ─── Segment selector ─────────────────────────────────────────────────────────
function SegSel({ value, options, onChange, color = '#38bdf8' }) {
  return (
    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.surface }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{
          flex: 1, padding: '3px 6px',
          fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: value === o ? `${color}28` : 'transparent',
          color: value === o ? color : T.muted,
          border: 'none', cursor: 'pointer',
          borderRight: `1px solid ${T.border}`,
          transition: 'all 0.1s',
        }}>
          {o}
        </button>
      ))}
    </div>
  )
}

// ─── Section divider ─────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, color = T.muted }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <div style={{ flex: 1, height: 1, background: T.borderFaint }} />
      <span style={{ fontSize: 8, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: T.borderFaint }} />
    </div>
  )
}

// ─── Device type helpers ─────────────────────────────────────────────────────
function deviceType(label) {
  const l = (label || '').toLowerCase()
  if (l.includes('bluetooth') || l.includes(' bt ') || l.includes('airpod') || l.includes('headset')) return 'bluetooth'
  if (l.includes('usb'))       return 'usb'
  if (l.includes('line') || l.includes('external') || l.includes('aux') || l.includes('xlr') || l.includes('interface')) return 'linein'
  if (l.includes('built-in') || l.includes('internal') || l.includes('macbook') || l.includes('imac')) return 'builtin'
  return 'other'
}
const DEVICE_GROUPS = [
  { key: 'bluetooth', label: 'Bluetooth',     icon: '⬡' },
  { key: 'usb',       label: 'USB',            icon: '⚡' },
  { key: 'linein',    label: 'Line In / XLR',  icon: '⬤' },
  { key: 'builtin',   label: 'Built-in',       icon: '◈' },
  { key: 'other',     label: 'Other',          icon: '◇' },
]
function groupDevices(devices) {
  const groups = {}
  DEVICE_GROUPS.forEach(g => { groups[g.key] = [] })
  devices.forEach(d => {
    const t = deviceType(d.label)
    groups[t].push(d)
  })
  return groups
}

// ─── Channel settings popup ─────────────────────────────────────────────────
function ChannelSettings({ anchorRef, ch, onUpdate, onClose }) {
  const popupRef = useRef(null)
  const [devices, setDevices] = useState([])
  const [permNeeded, setPermNeeded] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const color = ch.isMic ? '#e879a0' : '#38bdf8'

  // Position below the gear button
  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left + r.width / 2 })
    }
  }, [])

  // Enumerate & keep up-to-date (also fires when USB/BT devices connect)
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const inputs = all.filter(d => d.kind === 'audioinput')
      // If no labeled devices found, permission hasn't been granted yet
      const hasLabels = inputs.some(d => d.label)
      if (!hasLabels) {
        setPermNeeded(true)
        setDevices([])
      } else {
        setPermNeeded(false)
        setDevices(inputs.filter(d => d.deviceId)) // drop phantom entries with no id
      }
    } catch { setPermNeeded(true) }
  }, [])

  useEffect(() => {
    refreshDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices)
  }, [refreshDevices])

  // Click-outside to close
  useEffect(() => {
    function handler(e) {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  async function requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      await refreshDevices()
    } catch {}
  }

  const row = { marginBottom: 10 }
  const lbl = { fontSize: 8, fontWeight: 800, color: T.muted, textTransform: 'uppercase',
    letterSpacing: '0.1em', display: 'block', marginBottom: 5 }
  const inputStyle = { width: '100%', padding: '5px 8px', borderRadius: 6, background: T.bg,
    border: `1px solid ${T.border}`, color: T.text, fontSize: 10, outline: 'none',
    boxSizing: 'border-box' }

  return (
    <div ref={popupRef} style={{
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 240,
      background: T.raised,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: '14px',
      boxShadow: '0 20px 60px #000000cc, 0 0 0 1px #ffffff08',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {ch.label}
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.muted, padding: '2px 4px', lineHeight: 1, fontSize: 13, borderRadius: 4,
        }}>✕</button>
      </div>

      {/* Audio Input Device (mic channels) */}
      {ch.isMic && (
        <div style={row}>
          <label style={lbl}>Input Device</label>
          {permNeeded ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <p style={{ fontSize: 8, color: T.muted, margin: 0 }}>Grant mic permission to list devices</p>
              <button onClick={requestPermission} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                background: `${color}22`, border: `1px solid ${color}50`, color,
                cursor: 'pointer',
              }}>Allow Microphone</button>
            </div>
          ) : (
            <>
              <select
                value={ch.deviceId || ''}
                onChange={(e) => {
                  const sel = devices.find(d => d.deviceId === e.target.value)
                  onUpdate('deviceId', e.target.value)
                  onUpdate('deviceLabel', sel?.label || '')
                }}
                style={inputStyle}
              >
                <option value="">— Select device —</option>
                {DEVICE_GROUPS.map(g => {
                  const grouped = groupDevices(devices)
                  if (!grouped[g.key].length) return null
                  return (
                    <optgroup key={g.key} label={`${g.icon} ${g.label}`}>
                      {grouped[g.key].map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
              {ch.deviceId && ch.deviceLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                  {(() => {
                    const t = deviceType(ch.deviceLabel)
                    const g = DEVICE_GROUPS.find(x => x.key === t) || DEVICE_GROUPS[4]
                    const typeColors = { bluetooth: '#38bdf8', usb: '#34d399', linein: '#fb923c', builtin: '#a78bfa', other: T.muted }
                    return (
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: `${typeColors[t]}22`, color: typeColors[t], border: `1px solid ${typeColors[t]}44`,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>{g.icon} {g.label}</span>
                    )
                  })()}
                  <span style={{ fontSize: 8, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {ch.deviceLabel}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Source selector (line channels) */}
      {!ch.isMic && (
        <div style={row}>
          <label style={lbl}>Source</label>
          <select
            value={ch.sourceType || 'none'}
            onChange={(e) => onUpdate('sourceType', e.target.value)}
            style={inputStyle}
          >
            <option value="none">— No source —</option>
            <option value="dj">DJ Player</option>
            <option value="podcast">Podcast / Video</option>
            <option value="line-in">External Line In / USB</option>
            <option value="conference">Conference Room</option>
          </select>
          {(ch.sourceType === 'dj') && (
            <p style={{ fontSize: 8, color: '#38bdf8', margin: '4px 0 0', fontStyle: 'italic' }}>
              Audio routed from DJ Player
            </p>
          )}
          {(ch.sourceType === 'podcast') && (
            <p style={{ fontSize: 8, color: '#a78bfa', margin: '4px 0 0', fontStyle: 'italic' }}>
              Audio routed from Podcast / Video
            </p>
          )}
          {(ch.sourceType === 'conference') && (
            <p style={{ fontSize: 8, color: '#a78bfa', margin: '4px 0 0', fontStyle: 'italic' }}>
              Conference audio routed to this channel
            </p>
          )}
          {ch.sourceType === 'line-in' && (
            <div style={{ marginTop: 8 }}>
              <label style={lbl}>Input Device</label>
              {permNeeded ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <p style={{ fontSize: 8, color: T.muted, margin: 0 }}>Grant permission to list devices</p>
                  <button onClick={requestPermission} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                    background: `${color}22`, border: `1px solid ${color}50`, color,
                    cursor: 'pointer',
                  }}>Allow Access</button>
                </div>
              ) : (
                <>
                  <select
                    value={ch.deviceId || ''}
                    onChange={(e) => {
                      const sel = devices.find(d => d.deviceId === e.target.value)
                      onUpdate('deviceId', e.target.value)
                      onUpdate('deviceLabel', sel?.label || '')
                    }}
                    style={inputStyle}
                  >
                    <option value="">— Select device —</option>
                    {DEVICE_GROUPS.map(g => {
                      const grouped = groupDevices(devices)
                      if (!grouped[g.key].length) return null
                      return (
                        <optgroup key={g.key} label={`${g.icon} ${g.label}`}>
                          {grouped[g.key].map(d => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                            </option>
                          ))}
                        </optgroup>
                      )
                    })}
                  </select>
                  {ch.deviceId && ch.deviceLabel && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                      {(() => {
                        const t = deviceType(ch.deviceLabel)
                        const g = DEVICE_GROUPS.find(x => x.key === t) || DEVICE_GROUPS[4]
                        const typeColors = { bluetooth: '#38bdf8', usb: '#34d399', linein: '#fb923c', builtin: '#a78bfa', other: T.muted }
                        return (
                          <span style={{
                            fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: `${typeColors[t]}22`, color: typeColors[t], border: `1px solid ${typeColors[t]}44`,
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                          }}>{g.icon} {g.label}</span>
                        )
                      })()}
                      <span style={{ fontSize: 8, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {ch.deviceLabel}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: T.borderFaint, margin: '10px 0' }} />

      {/* Mic-specific */}
      {ch.isMic && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Pill on={ch.phantom} onToggle={() => onUpdate('phantom', !ch.phantom)}
            label="+48V Phantom Power" color="#a78bfa" />
          <div>
            <label style={lbl}>PAD</label>
            <SegSel value={ch.pad} options={['0 dB', '-20 dB']}
              onChange={(v) => onUpdate('pad', v)} color={color} />
          </div>
        </div>
      )}

      <div style={{ height: 1, background: T.borderFaint, margin: '10px 0' }} />

      {/* Rename */}
      <div>
        <label style={lbl}>Channel Name</label>
        <input
          type="text"
          value={ch.label}
          maxLength={10}
          onChange={(e) => onUpdate('label', e.target.value.toUpperCase())}
          style={{ ...inputStyle, color, fontWeight: 700 }}
        />
      </div>
    </div>
  )
}

// ─── Channel strip ────────────────────────────────────────────────────────────
function ChannelStrip({ ch, onUpdate, level = 0 }) {
  const color  = ch.isMic ? '#e879a0' : '#38bdf8'
  const [settingsOpen, setSettingsOpen] = useState(false)
  const gearRef = useRef(null)

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${ch.on && !ch.mute ? color : T.faint}`,
      borderRadius: '0 0 12px 12px',
      padding: '12px 10px 14px',
      flex: 1, minWidth: 90, maxWidth: 130,
      boxShadow: ch.on && !ch.mute ? `0 0 20px ${color}0d` : 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      {/* Label */}
      <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {ch.label}
        </div>
        <div style={{ fontSize: 8, color: T.muted, marginTop: 2 }}>{ch.type}</div>
      </div>

      {/* Gear button + selected device name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%' }}>
        <button
          ref={gearRef}
          onClick={() => setSettingsOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            width: '100%', padding: '4px 0', borderRadius: 6,
            background: settingsOpen ? `${color}22` : T.bg,
            border: `1px solid ${settingsOpen ? color + '60' : T.border}`,
            color: settingsOpen ? color : T.muted,
            cursor: 'pointer', fontSize: 8, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            transition: 'all 0.12s',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Input
        </button>
        {(() => {
          if (ch.isMic) {
            return ch.deviceLabel
              ? <div style={{ fontSize: 7, color: T.muted, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', padding: '2px 4px', background: T.bg, borderRadius: 4, border: `1px solid ${T.borderFaint}` }}>{ch.deviceLabel}</div>
              : <div style={{ fontSize: 7, color: T.faint, fontStyle: 'italic' }}>no input set</div>
          }
          const srcLabel = ch.sourceType === 'dj' ? 'DJ Player'
            : ch.sourceType === 'podcast' ? 'Podcast'
            : ch.sourceType === 'line-in' ? (ch.deviceLabel || 'Line In')
            : ch.sourceType === 'conference' ? 'Conference'
            : null
          return srcLabel
            ? <div style={{ fontSize: 7, color: T.muted, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', padding: '2px 4px', background: T.bg, borderRadius: 4, border: `1px solid ${T.borderFaint}` }}>{srcLabel}</div>
            : <div style={{ fontSize: 7, color: T.faint, fontStyle: 'italic' }}>no source</div>
        })()}
      </div>

      {/* Settings popup */}
      {settingsOpen && (
        <ChannelSettings
          anchorRef={gearRef}
          ch={ch}
          onUpdate={onUpdate}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <Knob value={ch.gain} onChange={(v) => onUpdate('gain', v)} size={32} color={color} label="Gain" />

      {/* EQ section */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
        background: T.bg, borderRadius: 10, padding: '8px 6px', width: '100%',
        border: `1px solid ${T.borderFaint}`,
      }}>
        <SectionLabel color={T.faint}>EQ</SectionLabel>
        <Knob value={ch.hi}  onChange={(v) => onUpdate('hi', v)}  size={28} color="#fbbf24" label="Hi"  />
        <Knob value={ch.mid} onChange={(v) => onUpdate('mid', v)} size={28} color="#c084fc" label="Mid" />
        <Knob value={ch.lo}  onChange={(v) => onUpdate('lo', v)}  size={28} color="#34d399" label="Lo"  />
      </div>

      <Knob value={ch.aux} onChange={(v) => onUpdate('aux', v)} size={26} color="#fb923c" label="Aux" />
      <Knob value={ch.pan} onChange={(v) => onUpdate('pan', v)} size={26} color="#94a3b8" label="Pan" />

      {/* VU */}
      <VuMeter level={level} segments={22} width={8} active={ch.on && !ch.mute} />

      {/* Fader */}
      <VFader value={ch.fader} onChange={(v) => onUpdate('fader', v)} height={130} color={color} />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
        <Pill on={ch.pfl}  onToggle={() => onUpdate('pfl', !ch.pfl)}   label="PFL"  color="#f59e0b" width="33%" />
        <Pill on={ch.mute} onToggle={() => onUpdate('mute', !ch.mute)} label="M"    color="#ef4444" width="33%" />
        <Pill on={ch.on}   onToggle={() => onUpdate('on', !ch.on)}     label="ON"   color="#22c55e" width="33%" />
      </div>
    </div>
  )
}

// ─── Master section ───────────────────────────────────────────────────────────
function MasterSection({ master, onUpdate, vuL = 0, vuR = 0, onRecToggle, recording, recDirName }) {
  const clipping = vuL > 0.92 || vuR > 0.92

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      background: T.bg,
      padding: '16px 18px',
      width: 160, flexShrink: 0,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#e2e8f0' }} />
        <span style={{ fontSize: 11, fontWeight: 900, color: T.text, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Master
        </span>
      </div>

      {/* Stereo VU */}
      <StereoVu levelL={vuL} levelR={vuR} active={true} segments={26} label="Output" />

      {/* Clip badge */}
      <div style={{
        padding: '3px 12px', borderRadius: 20, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
        background: clipping ? '#ef444420' : T.raised,
        color: clipping ? '#ef4444' : T.faint,
        border: `1px solid ${clipping ? '#ef444460' : T.border}`,
        boxShadow: clipping ? '0 0 12px #ef444433' : 'none',
        transition: 'all 0.15s',
      }}>
        CLIP
      </div>

      {/* Master fader */}
      <VFader value={master.fader} onChange={(v) => onUpdate('fader', v)}
        height={150} color="#e2e8f0" label="Master" />

      <Divider />

      {/* Monitor / headphone knobs */}
      <SectionLabel>Monitor</SectionLabel>
      <Knob value={master.monitor} onChange={(v) => onUpdate('monitor', v)} size={36} color="#d1d5db" label="Mon"   />
      <Knob value={master.booth}   onChange={(v) => onUpdate('booth', v)}   size={30} color="#818cf8" label="HDPH"  />
      <Knob value={master.phones}  onChange={(v) => onUpdate('phones', v)}  size={30} color="#f97316" label="CUE"   />

      <Divider />

      {/* AUX returns */}
      <SectionLabel>AUX Ret</SectionLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        <Knob value={master.aux1} onChange={(v) => onUpdate('aux1', v)} size={28} color="#fb923c" label="A1" />
        <Knob value={master.aux2} onChange={(v) => onUpdate('aux2', v)} size={28} color="#fb923c" label="A2" />
      </div>

      <Divider />

      {/* FX */}
      <SectionLabel>FX</SectionLabel>
      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
        {['FX 1', 'FX 2', 'FX 3'].map((lbl) => (
          <Pill key={lbl}
            on={master.fx.includes(lbl)}
            onToggle={() => onUpdate('fx', master.fx.includes(lbl)
              ? master.fx.filter(x => x !== lbl)
              : [...master.fx, lbl])}
            label={lbl} color="#38bdf8" width="33%"
          />
        ))}
      </div>

      <Divider />

      {/* REC + ON AIR */}
      <Pill on={recording} onToggle={onRecToggle} label="● Rec" color="#ef4444" />
      {!recDirName && !recording && (
        <div style={{ fontSize: 8, color: '#f59e0b', textAlign: 'center', lineHeight: 1.4, padding: '0 2px' }}>
          No save location —{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#fbbf24' }}
            onClick={() => document.dispatchEvent(new CustomEvent('open-settings-record'))}>
            Settings → Record
          </span>
        </div>
      )}
      <button onClick={() => onUpdate('onAir', !master.onAir)} style={{
        width: '100%', padding: '8px 0', borderRadius: 10, fontSize: 11,
        fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
        background: master.onAir
          ? 'linear-gradient(135deg, #ef444430, #ef444415)'
          : T.raised,
        color: master.onAir ? '#ef4444' : T.muted,
        border: `1px solid ${master.onAir ? '#ef444460' : T.border}`,
        boxShadow: master.onAir ? '0 0 20px #ef444430' : 'inset 0 1px 0 #ffffff08',
        cursor: 'pointer', transition: 'all 0.15s',
        animation: master.onAir ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }}>
        {master.onAir ? '● ON AIR' : '○ Off Air'}
      </button>
    </div>
  )
}

// ─── Channel group header ─────────────────────────────────────────────────────
function GroupHeader({ label, color, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
    }}>
      <div style={{ width: 3, height: 12, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <span style={{ fontSize: 8, color: T.muted }}>({count}ch)</span>
    </div>
  )
}

// ─── Main factories ───────────────────────────────────────────────────────────
function mkMic(id, label, type) {
  return { id, label, type, isMic: true, phantom: false, pad: '0',
    gain: 0.5, hi: 0.5, mid: 0.5, lo: 0.5, aux: 0.0, pan: 0.5,
    fader: 0.0, pfl: false, mute: false, on: false,
    deviceId: null, deviceLabel: '' }
}
function mkLine(id, label, type) {
  return { id, label, type, isMic: false, input: 'LINE', sourceType: 'none',
    gain: 0.5, hi: 0.5, mid: 0.5, lo: 0.5, aux: 0.0, pan: 0.5,
    fader: 0.8, pfl: false, mute: false, on: true,
    deviceId: null, deviceLabel: '' }
}

const SAVED_CH_KEYS = ['gain','hi','mid','lo','aux','pan','fader','pfl','mute','on','phantom','pad','deviceId','deviceLabel','sourceType']

function loadSavedChannels() {
  const defaults = [
    mkMic(1, 'MIC 1', 'XLR'),
    mkMic(2, 'MIC 2', 'XLR'),
    mkMic(3, 'MIC 3', 'XLR'),
    mkLine(4, 'LINE 1', 'RCA'),
    mkLine(5, 'LINE 2', 'RCA'),
    mkLine(6, 'LINE 3', 'AUX'),
    mkLine(7, 'PHONE',  'TEL'),
  ]
  try {
    const saved = JSON.parse(localStorage.getItem('mixer_channels') || '{}')
    const channels = defaults.map(ch => {
      const s = saved[ch.id]
      if (!s) return ch
      const merged = { ...ch }
      SAVED_CH_KEYS.forEach(k => { if (s[k] !== undefined) merged[k] = s[k] })
      return merged
    })
    const hasConferenceReturn = channels.some(ch => !ch.isMic && ch.sourceType === 'conference')
    const phone = channels.find(ch => ch.id === 7)
    if (!hasConferenceReturn && phone?.sourceType === 'none') {
      phone.sourceType = 'conference'
      phone.on = true
      phone.mute = false
      // Persist so AudioEngine init (which reads localStorage before Mixer mounts) finds it
      try {
        const raw = JSON.parse(localStorage.getItem('mixer_channels') || '{}')
        raw[7] = { ...(raw[7] || {}), sourceType: 'conference', on: true, mute: false }
        localStorage.setItem('mixer_channels', JSON.stringify(raw))
      } catch { /* ignore */ }
    }

    // Only one line channel can own the conference return. Keep the highest
    // channel ID to match AudioEngine's restore behavior and clear stale UI
    // assignments left by older builds.
    const conferenceChannels = channels.filter(ch => !ch.isMic && ch.sourceType === 'conference')
    if (conferenceChannels.length > 1) {
      const keepId = Math.max(...conferenceChannels.map(ch => ch.id))
      channels.forEach(ch => {
        if (!ch.isMic && ch.sourceType === 'conference' && ch.id !== keepId) ch.sourceType = 'none'
      })
    }
    return channels
  } catch {
    defaults[6].sourceType = 'conference'
    return defaults
  }
}

function loadSavedMaster() {
  const defaults = { fader: 0.8, monitor: 0.75, booth: 0.6, phones: 0.7, aux1: 0.0, aux2: 0.0, fx: [], rec: false, onAir: false }
  try {
    const saved = JSON.parse(localStorage.getItem('mixer_master') || 'null')
    if (!saved) return defaults
    return { ...defaults, ...saved }
  } catch { return defaults }
}

// ─── Conference channel strip ─────────────────────────────────────────────────
function ConferenceStrip({ conf, onUpdate, onOpenConference, level = 0 }) {
  const color = '#a78bfa'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${conf.on && !conf.mute ? color : T.faint}`,
      borderRadius: '0 0 12px 12px',
      padding: '12px 10px 14px',
      width: 110,
      boxShadow: conf.on && !conf.mute ? `0 0 20px ${color}0d` : 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>CONF</div>
        <div style={{ fontSize: 8, color: T.muted, marginTop: 2 }}>Conference</div>
      </div>

      {/* Open button */}
      <button onClick={() => onOpenConference?.()}
        style={{
          width: '100%', padding: '4px 0', borderRadius: 6, fontSize: 8, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: `${color}22`, border: `1px solid ${color}60`, color,
          cursor: 'pointer',
        }}>
        Open
      </button>

      <Knob value={conf.gain} onChange={(v) => onUpdate('gain', v)} size={32} color={color} label="Gain" />
      <VuMeter level={level} segments={22} width={8} active={conf.on && !conf.mute} />
      <VFader value={conf.fader} onChange={(v) => onUpdate('fader', v)} height={130} color={color} />

      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
        <Pill on={conf.mute} onToggle={() => onUpdate('mute', !conf.mute)} label="M" color="#ef4444" width="50%" />
        <Pill on={conf.on}   onToggle={() => onUpdate('on',   !conf.on)}   label="ON" color="#22c55e" width="50%" />
      </div>
    </div>
  )
}

// ─── Mixer page ───────────────────────────────────────────────────────────────
function loadSavedConference() {
  const defaults = { gain: 0.5, fader: 0.8, mute: false, on: true }
  try {
    const saved = JSON.parse(localStorage.getItem('mixer_conference') || 'null')
    if (!saved) return defaults
    return { ...defaults, ...saved }
  } catch { return defaults }
}

export default function Mixer({ config, onOpenConference }) {
  const audioEngine = useAudioEngine()
  const [channels, setChannels] = useState(loadSavedChannels)
  const [master, setMaster] = useState(loadSavedMaster)
  const [confState, setConfState] = useState(loadSavedConference)

  const updateConf = useCallback((k, v) => {
    setConfState(prev => {
      const next = { ...prev, [k]: v }
      try { localStorage.setItem('mixer_conference', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // ── Sync conference state → AudioEngine ──────────────────────────────────
  useEffect(() => {
    audioEngine?.setupConferenceChannel?.()
  }, [audioEngine])

  useEffect(() => {
    audioEngine?.setConferenceActive?.(confState.on, confState.mute, confState.fader)
  }, [audioEngine, confState.on, confState.mute, confState.fader])

  useEffect(() => {
    audioEngine?.updateConferenceGain?.(confState.gain)
  }, [audioEngine, confState.gain])

  // Set up AudioEngine channel nodes once on mount, then restore saved sources
  useEffect(() => {
    if (!audioEngine) return
    channels.forEach(ch => {
      audioEngine.setupChannelNodes(ch.id, ch)
      // Reconnect saved audio sources
      if (ch.isMic && ch.deviceId) {
        audioEngine.connectMicToChannel(ch.id, ch.deviceId)
      } else if (!ch.isMic) {
        if (ch.sourceType === 'dj' || ch.sourceType === 'podcast') {
          audioEngine.connectSourceToChannel(ch.sourceType, ch.id)
        } else if (ch.sourceType === 'conference') {
          audioEngine.connectSourceToChannel('conference', ch.id)
        } else if (ch.sourceType === 'line-in' && ch.deviceId) {
          audioEngine.connectLineInToChannel(ch.id, ch.deviceId)
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateChannel = useCallback((id, key, value) => {
    setChannels(prev => {
      const displacedConferenceIds = key === 'sourceType' && value === 'conference'
        ? prev.filter(ch => ch.id !== id && !ch.isMic && ch.sourceType === 'conference').map(ch => ch.id)
        : []
      if (audioEngine) {
        displacedConferenceIds.forEach(channelId => audioEngine.disconnectConferenceFromChannel?.(channelId))
      }

      const updated = prev.map(ch => {
        if (ch.id !== id) {
          if (displacedConferenceIds.includes(ch.id)) return { ...ch, sourceType: 'none' }
          return ch
        }
        const next = { ...ch, [key]: value }
        if (audioEngine) {
          // Smooth param updates
          if (['gain', 'hi', 'mid', 'lo', 'pan'].includes(key)) {
            audioEngine.updateChannelParam(id, key, value)
          }
          // Gate/fader changes
          if (['on', 'mute', 'fader'].includes(key)) {
            audioEngine.setChannelActive(id, next.on, next.mute, next.fader)
          }
          // Sync mic on/off state with NowPlaying via shared micOnAirMap
          if (key === 'on' && next.isMic) {
            audioEngine.setMicOnAir(id, value)
          }
          // Source type change (line channels)
          if (key === 'sourceType' && !next.isMic) {
            // Disconnect conference if switching away from it
            if (ch.sourceType === 'conference' && value !== 'conference') {
              audioEngine.disconnectConferenceFromChannel?.(id)
            }
            if (value === 'dj' || value === 'podcast') {
              audioEngine.connectSourceToChannel(value, id)
            } else if (value === 'conference') {
              audioEngine.connectSourceToChannel('conference', id)
            } else {
              // If no other line channel has DJ/podcast source, clear djConnected
              const anyOtherDj = prev.some(ch => ch.id !== id && !ch.isMic && (ch.sourceType === 'dj' || ch.sourceType === 'podcast'))
              if (!anyOtherDj) audioEngine.setDjActive(false)
            }
            // 'line-in' is wired when deviceId is set
          }
          // Device selection
          if (key === 'deviceId') {
            if (next.isMic) {
              audioEngine.connectMicToChannel(id, value)
            } else if (next.sourceType === 'line-in') {
              audioEngine.connectLineInToChannel(id, value)
            }
          }
        }
        return next
      })
      // Persist all channel settings
      try {
        const toSave = {}
        updated.forEach(ch => {
          toSave[ch.id] = {}
          SAVED_CH_KEYS.forEach(k => { toSave[ch.id][k] = ch[k] })
        })
        localStorage.setItem('mixer_channels', JSON.stringify(toSave))
      } catch { /* ignore */ }
      return updated
    })
  }, [audioEngine])

  // Sync mic channel visual on/off state when NowPlaying button changes micOnAirMap
  // (AudioEngine already fired setChannelActive directly, so we only update UI state here)
  useEffect(() => {
    if (!audioEngine?.micOnAirMap) return
    const map = audioEngine.micOnAirMap
    setChannels(prev => {
      let changed = false
      const next = prev.map(ch => {
        if (!ch.isMic || map[ch.id] === undefined || map[ch.id] === ch.on) return ch
        changed = true
        return { ...ch, on: map[ch.id] }
      })
      return changed ? next : prev
    })
  }, [audioEngine, audioEngine?.micOnAirMap]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateMaster = useCallback((key, value) => {
    setMaster(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem('mixer_master', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    if (key === 'fader'  && audioEngine) audioEngine.updateMasterFader(value)
    if (key === 'booth'  && audioEngine) audioEngine.updatePhonesVol?.(value)
    if (key === 'phones' && audioEngine) audioEngine.updateCueVol?.(value)
  }, [audioEngine])

  // ── Rec pill handler ─────────────────────────────────────────────────────
  const handleRecToggle = useCallback(() => {
    if (!audioEngine) return
    const { recording, startRec, stopRec, recDirName } = audioEngine
    if (recording) {
      stopRec()
      return
    }
    // If no folder set, still allow recording — will fall back to download
    const format = localStorage.getItem('recFormat') || 'webm'
    const result = startRec(format)
    if (result === 'no-stream') {
      // Show error in mixer header — dispatch event Settings page can also pick up
      document.dispatchEvent(new CustomEvent('rec-error', { detail: 'No audio stream — load a track first.' }))
    }
  }, [audioEngine])

  const micChs  = channels.filter(ch => ch.isMic)
  const lineChs = channels.filter(ch => !ch.isMic)

  // ─── Real-time VU meters via AnalyserNode RAF loop ───────────────────────
  const [levels, setLevels] = useState({})
  const [masterLevels, setMasterLevels] = useState({ L: 0, R: 0 })
  const analyserBufsRef = useRef({})
  const vuRafRef = useRef(null)

  useEffect(() => {
    if (!audioEngine) return

    const readRms = (analyser, bufKey) => {
      if (!analyser) return 0
      let buf = analyserBufsRef.current[bufKey]
      if (!buf || buf.length !== analyser.frequencyBinCount) {
        buf = new Uint8Array(analyser.frequencyBinCount)
        analyserBufsRef.current[bufKey] = buf
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
      const newLevels = {}
      for (let id = 1; id <= 7; id++) {
        newLevels[id] = readRms(audioEngine.getAnalyser?.(id), `ch${id}`)
      }
      setLevels(newLevels)

      const mRms = readRms(audioEngine.getMasterAnalyser?.(), 'master')
      setMasterLevels({ L: mRms, R: mRms * 0.97 })

      vuRafRef.current = requestAnimationFrame(tick)
    }
    vuRafRef.current = requestAnimationFrame(tick)
    return () => { if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current) }
  }, [audioEngine])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text, letterSpacing: '-0.03em' }}>
            Mixing Board
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: T.muted }}>
            {config?.stationName ?? 'Radio In One Stop'} — {channels.length}-channel console
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {audioEngine?.recording && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 20, fontSize: 9, fontWeight: 800,
              color: '#ef4444', border: '1px solid #ef444440', background: '#ef444414',
              animation: 'pulse 0.9s ease-in-out infinite',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              REC
            </div>
          )}
          <div style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 10, fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            background: master.onAir ? '#ef444420' : T.surface,
            color: master.onAir ? '#ef4444' : T.muted,
            border: `1px solid ${master.onAir ? '#ef444460' : T.border}`,
            boxShadow: master.onAir ? '0 0 20px #ef444430' : 'none',
            cursor: 'pointer',
            animation: master.onAir ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }} onClick={() => updateMaster('onAir', !master.onAir)}>
            {master.onAir ? '● ON AIR' : '○ OFF AIR'}
          </div>
        </div>
      </div>

      {/* ── Console body ── */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 64px #00000055',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: `1px solid ${T.border}`,
          background: T.bg,
        }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#e879a0', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e879a0', display: 'inline-block' }} />
              Mic Inputs
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
              Line Inputs
            </span>
          </div>
          <span style={{ fontSize: 8, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {config?.stationName ?? 'Radio In One Stop'} · Console v2
          </span>
        </div>

        {/* Strips + master */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>

          {/* Scrollable channels */}
          <div style={{ flex: 1, overflowX: 'auto', padding: '20px 16px', display: 'flex', gap: 0, alignItems: 'flex-start' }}>

            {/* Mic group */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <GroupHeader label="Mic Inputs" color="#e879a0" count={micChs.length} />
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                {micChs.map(ch => (
                  <ChannelStrip key={ch.id} ch={ch} onUpdate={(k, v) => updateChannel(ch.id, k, v)} level={levels[ch.id] ?? 0} />
                ))}
              </div>
            </div>

            {/* Group divider */}
            <div style={{
              flexShrink: 0, width: 1, alignSelf: 'stretch', margin: '0 16px',
              background: `linear-gradient(to bottom, transparent, ${T.border} 15%, ${T.border} 85%, transparent)`,
            }} />

            {/* Line group */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <GroupHeader label="Line Inputs" color="#38bdf8" count={lineChs.length} />
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                {lineChs.map(ch => (
                  <ChannelStrip key={ch.id} ch={ch} onUpdate={(k, v) => updateChannel(ch.id, k, v)} level={levels[ch.id] ?? 0} />
                ))}
              </div>
            </div>
          </div>

          {/* Master — pinned right */}
          <div style={{
            flexShrink: 0,
            borderLeft: `1px solid ${T.border}`,
            background: T.bg,
          }}>
            <MasterSection master={master} onUpdate={updateMaster} vuL={masterLevels.L} vuR={masterLevels.R}
              onRecToggle={handleRecToggle}
              recording={audioEngine?.recording ?? false}
              recDirName={audioEngine?.recDirName ?? ''}
            />
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px',
          borderTop: `1px solid ${T.border}`,
          background: T.bg,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {channels.map(ch => {
              const active = ch.on && !ch.mute
              return (
                <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: active ? (ch.isMic ? '#e879a0' : '#38bdf8') : T.faint,
                    boxShadow: active ? `0 0 6px ${ch.isMic ? '#e879a0' : '#38bdf8'}` : 'none',
                    transition: 'all 0.2s',
                  }} />
                  <span style={{ fontSize: 8, color: active ? '#94a3b8' : T.faint, fontWeight: 600 }}>
                    {ch.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: T.faint, fontFamily: 'monospace' }}>
              MASTER {Math.round(master.fader * 100)}
            </span>
            <span style={{ fontSize: 8, color: T.faint, fontFamily: 'monospace' }}>
              MON {Math.round(master.monitor * 100)}
            </span>
            <span style={{ fontSize: 8, color: master.rec ? '#ef4444' : T.faint, fontFamily: 'monospace' }}>
              {master.rec ? '● REC' : '○ STBY'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
