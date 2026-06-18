import { useRef } from 'react'

export default function RotaryKnob({ value, onChange, size = 36, color = '#ff2a1f', label, title }) {
  const dragRef = useRef(null)
  const onPointerDown = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startY: event.clientY, startVal: value }
  }
  const onPointerMove = (event) => {
    if (!dragRef.current) return
    const delta = (dragRef.current.startY - event.clientY) / 100
    onChange(Math.max(0, Math.min(1, dragRef.current.startVal + delta)))
  }
  const onPointerUp = () => { dragRef.current = null }
  const onDoubleClick = () => onChange(0.5)

  const cx = size / 2
  const cy = size / 2
  const leds = 11
  const ledDot = 2.2
  const ringR = size * 0.43
  const capR = size * 0.28
  const startDeg = -225
  const sweep = 270
  const toRad = (degrees) => degrees * Math.PI / 180
  const litCount = Math.round(value * (leds - 1))
  const tickAngle = toRad(startDeg + sweep * value - 90)
  const mx1 = cx + capR * 0.28 * Math.cos(tickAngle)
  const my1 = cy + capR * 0.28 * Math.sin(tickAngle)
  const mx2 = cx + capR * 0.88 * Math.cos(tickAngle)
  const my2 = cy + capR * 0.88 * Math.sin(tickAngle)

  return (
    <div className="flex flex-col items-center select-none" style={{ gap: 3 }} title={title || label}>
      {label && <span className="text-[7px] font-bold uppercase tracking-wide leading-none" style={{ color: '#64748b' }}>{label}</span>}
      <svg
        width={size}
        height={size}
        style={{ touchAction: 'none', cursor: 'ns-resize', overflow: 'visible' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <circle cx={cx} cy={cy + 2.5} r={capR + 2} fill="#00000077" />
        {Array.from({ length: leds }).map((_, index) => {
          const deg = startDeg - 90 + (sweep / (leds - 1)) * index
          const lx = cx + ringR * Math.cos(toRad(deg))
          const ly = cy + ringR * Math.sin(toRad(deg))
          return <circle key={index} cx={lx} cy={ly} r={ledDot} fill="#0e1420" stroke="#1e2840" strokeWidth="0.5" />
        })}
        {Array.from({ length: leds }).map((_, index) => {
          if (index > litCount) return null
          const deg = startDeg - 90 + (sweep / (leds - 1)) * index
          const lx = cx + ringR * Math.cos(toRad(deg))
          const ly = cy + ringR * Math.sin(toRad(deg))
          return <circle key={index} cx={lx} cy={ly} r={ledDot} fill={color} style={{ filter: `drop-shadow(0 0 ${ledDot * 2}px ${color})` }} />
        })}
        <circle cx={cx} cy={cy} r={capR} fill="#0d1520" />
        <ellipse cx={cx - capR * 0.18} cy={cy - capR * 0.28} rx={capR * 0.55} ry={capR * 0.28} fill="#ffffff0a" />
        <circle cx={cx} cy={cy} r={capR} fill="none" stroke="#ffffff10" strokeWidth="1" />
        <line x1={mx1} y1={my1} x2={mx2} y2={my2} stroke={color} strokeWidth="2" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      </svg>
    </div>
  )
}
