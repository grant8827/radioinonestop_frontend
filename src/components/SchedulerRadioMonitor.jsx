import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudioEngine } from '../context/AudioEngine'
import Knob from './RotaryKnob'

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

// Always M:SS so the display doesn't jump in width as it counts down
function formatCountdown(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function EncoderLevelMeter({ analyser, active }) {
  const [level, setLevel] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!analyser || !active) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    const draw = () => {
      analyser.getByteFrequencyData(data)
      const average = data.reduce((sum, value) => sum + value, 0) / data.length
      setLevel(Math.min(100, (average / 128) * 100))
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [active, analyser])

  const barCount = 24
  const activeCount = active ? Math.round(level / 100 * barCount) : 0
  return (
    <div className="flex gap-0.5 h-5 my-2" aria-label="DJ Player audio level">
      {Array.from({ length: barCount }, (_, index) => {
        const enabled = index < activeCount
        const isHot = index >= barCount * 0.85
        const isMid = index >= barCount * 0.65
        return (
          <div
            key={index}
            className={`flex-1 rounded-sm transition-all duration-75 ${
              enabled
                ? isHot ? 'bg-red-500' : isMid ? 'bg-yellow-500' : 'bg-green-500'
                : 'bg-gray-800'
            }`}
          />
        )
      })}
    </div>
  )
}

export default function SchedulerRadioMonitor() {
  const { token } = useAuth()
  const audioEngine = useAudioEngine()
  const [schedules, setSchedules] = useState([])
  const [playback, setPlayback] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [volume, setVolume] = useState(1)
  const [eq, setEq] = useState({ low: 0.5, mid: 0.5, high: 0.5 })

  useEffect(() => {
    if (!token) return
    fetch('/api/schedules', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.schedules) setSchedules(data.schedules) })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    const onSchedules = (event) => setSchedules(event.detail || [])
    const onPlayback = (event) => setPlayback(event.detail || null)
    window.addEventListener('scheduler:schedules', onSchedules)
    window.addEventListener('scheduler:playback', onPlayback)
    return () => {
      window.removeEventListener('scheduler:schedules', onSchedules)
      window.removeEventListener('scheduler:playback', onPlayback)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])

  const nextSchedule = useMemo(() => schedules
    .filter((schedule) => schedule.enabled && !schedule.triggered && new Date(schedule.trigger_time).getTime() >= now - 30_000)
    .sort((a, b) => new Date(a.trigger_time) - new Date(b.trigger_time))[0] || null, [now, schedules])

  const isPlaying = !!playback?.playing

  const upcomingWhilePlaying = useMemo(() => {
    if (!isPlaying) return null
    return schedules
      .filter((schedule) => {
        if (!schedule.enabled || schedule.triggered) return false
        if (playback?.schedule?.id && schedule.id === playback.schedule.id) return false
        return new Date(schedule.trigger_time).getTime() >= now
      })
      .sort((a, b) => new Date(a.trigger_time) - new Date(b.trigger_time))[0] || null
  }, [isPlaying, now, playback, schedules])

  // Clamp to 0 — never go negative, never show "ago"
  const remaining = nextSchedule ? Math.max(0, new Date(nextSchedule.trigger_time).getTime() - now) : null

  // Within 60 s (or at 0, waiting for playback to start) — show large countdown
  const countingDown = !isPlaying && remaining !== null && remaining <= 60_000
  // Within 30 s (or at 0) — red flash
  const alerting = !isPlaying && remaining !== null && remaining <= 30_000

  const progress = playback?.duration > 0
    ? Math.min(100, Math.max(0, playback.currentTime / playback.duration * 100))
    : 0
  const schedulerAnalyser = audioEngine?.getSchedulerAnalyser?.() || null

  const nextLabel = nextSchedule ? (nextSchedule.name || nextSchedule.title) : null

  function stopPlayback() {
    window.dispatchEvent(new CustomEvent('scheduler:stop'))
  }

  function changeVolume(value) {
    setVolume(value)
    audioEngine?.updateSchedulerVolume?.(value)
  }

  function changeEq(band, value) {
    setEq((previous) => ({ ...previous, [band]: value }))
    audioEngine?.updateSchedulerEq?.(band, value)
  }

  return (
    <section className={`rounded-xl border overflow-hidden transition-colors duration-300 ${
      alerting
        ? 'border-red-500 bg-red-950/60 shadow-[0_0_28px_rgba(239,68,68,0.3)]'
        : countingDown
          ? 'border-amber-500/70 bg-amber-950/20 shadow-[0_0_18px_rgba(245,158,11,0.15)]'
          : 'border-gray-800 bg-gray-900'
    }`}>

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-gray-500">
            {isPlaying ? 'Now Playing' : 'Scheduler Monitor'}
          </p>
          <p className="text-xs text-gray-300 truncate">
            {isPlaying
              ? `${playback.schedule?.artist || 'Unknown'} — ${playback.schedule?.title || 'Scheduled song'}`
              : nextLabel
                ? `Next: ${nextLabel}`
                : 'No upcoming song scheduled'}
          </p>
          {isPlaying && (
            <p className="text-[11px] text-amber-300 truncate mt-1">
              {upcomingWhilePlaying
                ? `Coming next: ${upcomingWhilePlaying.name || upcomingWhilePlaying.artist || 'Unknown'} — ${upcomingWhilePlaying.title || 'Scheduled song'}`
                : 'Coming next: no upcoming schedule'}
            </p>
          )}
        </div>

        {isPlaying ? (
          <span className="shrink-0 rounded-full bg-red-900/40 border border-red-700/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-300 animate-pulse">On Air</span>
        ) : countingDown ? (
          /* Large countdown badge — shown only within 60 s */
          <div className={`shrink-0 text-right ${alerting ? 'text-red-300' : 'text-amber-300'}`}>
            <p className={`text-[9px] uppercase font-black tracking-widest mb-0.5 ${alerting ? 'animate-pulse' : ''}`}>
              {alerting ? '⚡ On air soon' : 'Starting in'}
            </p>
            <p className={`text-4xl leading-none font-black tabular-nums tracking-tighter ${alerting ? 'animate-pulse' : ''}`}>
              {formatCountdown(remaining)}
            </p>
          </div>
        ) : (
          /* Normal idle state */
          <div className="shrink-0 text-right text-gray-500">
            <p className="text-[9px] uppercase font-bold tracking-wider">Next in</p>
            <p className="text-base leading-none font-bold tabular-nums">
              {remaining === null ? '--:--' : formatCountdown(remaining)}
            </p>
          </div>
        )}
      </div>

      {/* Countdown banner — full-width bar during the final 60 s */}
      {countingDown && !isPlaying && (
        <div className={`relative overflow-hidden px-4 py-2 flex items-center gap-3 border-b border-white/5 ${alerting ? 'bg-red-900/30' : 'bg-amber-900/20'}`}>
          {/* Shrinking progress bar underneath */}
          <div
            className={`absolute inset-0 origin-left transition-[transform] duration-500 ${alerting ? 'bg-red-500/15' : 'bg-amber-500/10'}`}
            style={{ transform: `scaleX(${remaining / 60_000})` }}
          />
          <span className={`relative shrink-0 w-2 h-2 rounded-full ${alerting ? 'bg-red-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
          <p className={`relative text-xs font-bold truncate ${alerting ? 'text-red-300' : 'text-amber-300'}`}>
            {alerting
              ? `AUTO-PLAY IN ${formatCountdown(remaining)} — "${nextLabel}"`
              : `Scheduled in ${formatCountdown(remaining)} — "${nextLabel}"`}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-3">
        <EncoderLevelMeter analyser={schedulerAnalyser} active={isPlaying} />
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-gray-600">Scheduled playback</p>
            <p className="text-xs font-semibold text-white truncate">
              {isPlaying ? playback.schedule?.title : nextLabel ? `Waiting for "${nextLabel}"` : 'Idle'}
            </p>
          </div>
          <span className="text-[11px] font-mono text-gray-400 tabular-nums shrink-0">
            {formatClock(playback?.currentTime)} / {formatClock(playback?.duration)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-black/60 overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={stopPlayback}
            disabled={!isPlaying}
            className="h-9 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 px-3 text-[10px] font-black uppercase tracking-wider text-white"
          >
            ■ Stop
          </button>
          <div className="flex items-end justify-end gap-2">
            <Knob value={volume} onChange={changeVolume} size={34} color="#fff4cf" label="VOL" title="Scheduler Volume" />
            <Knob value={eq.high} onChange={(value) => changeEq('high', value)} size={30} color="#fbbf24" label="HI" title="Scheduler High EQ" />
            <Knob value={eq.mid} onChange={(value) => changeEq('mid', value)} size={30} color="#f97316" label="MID" title="Scheduler Mid EQ" />
            <Knob value={eq.low} onChange={(value) => changeEq('low', value)} size={30} color="#ff2a1f" label="LO" title="Scheduler Low EQ" />
          </div>
        </div>
      </div>
    </section>
  )
}
