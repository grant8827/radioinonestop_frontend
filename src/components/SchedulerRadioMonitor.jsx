import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudioEngine } from '../context/AudioEngine'

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function formatCountdown(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
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
    .filter((schedule) => schedule.enabled && !schedule.triggered && new Date(schedule.trigger_time).getTime() >= now)
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
  }, [isPlaying, now, playback?.schedule?.id, schedules])

  const remaining = nextSchedule ? new Date(nextSchedule.trigger_time).getTime() - now : null
  const alerting = remaining !== null && remaining > 0 && remaining <= 30_000
  const progress = playback?.duration > 0
    ? Math.min(100, Math.max(0, playback.currentTime / playback.duration * 100))
    : 0
  const schedulerAnalyser = audioEngine?.getSchedulerAnalyser?.() || null

  function stopPlayback() {
    window.dispatchEvent(new CustomEvent('scheduler:stop'))
  }

  return (
    <section className={`rounded-xl border overflow-hidden transition-colors ${
      alerting
        ? 'border-red-500 bg-red-950/60 animate-pulse shadow-[0_0_24px_rgba(239,68,68,0.25)]'
        : 'border-gray-800 bg-gray-900'
    }`}>
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-gray-500">
            {isPlaying ? 'Now Playing' : 'Scheduler Monitor'}
          </p>
          <p className="text-xs text-gray-300 truncate">
            {isPlaying
              ? `${playback.schedule?.artist || 'Unknown'} — ${playback.schedule?.title || 'Scheduled song'}`
              : nextSchedule
                ? `Next: ${nextSchedule.title}`
                : 'No upcoming song scheduled'}
          </p>
          {isPlaying && (
            <p className="text-[11px] text-amber-300 truncate mt-1">
              {upcomingWhilePlaying
                ? `Coming next: ${upcomingWhilePlaying.artist || 'Unknown'} — ${upcomingWhilePlaying.title || 'Scheduled song'}`
                : 'Coming next: no upcoming schedule'}
            </p>
          )}
        </div>
        {isPlaying ? (
          <button
            type="button"
            onClick={stopPlayback}
            className="shrink-0 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white"
          >
            ■ Stop
          </button>
        ) : (
          <div className={`shrink-0 text-right ${alerting ? 'text-red-300' : 'text-amber-400'}`}>
            <p className="text-[9px] uppercase font-bold tracking-wider">{alerting ? 'Starting soon' : 'Countdown'}</p>
            <p className="text-lg leading-none font-black tabular-nums">
              {remaining === null ? '--:--' : formatCountdown(remaining)}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <EncoderLevelMeter analyser={schedulerAnalyser} active={isPlaying} />
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-gray-600">Scheduled playback</p>
            <p className="text-xs font-semibold text-white truncate">
              {isPlaying ? playback.schedule?.title : nextSchedule ? `Waiting for ${nextSchedule.title}` : 'Idle'}
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
      </div>
    </section>
  )
}
