import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudioEngine } from '../context/AudioEngine'

const DB_NAME = 'radio-track-library'
const STORE_NAME = 'tracks'
const LOCAL_KEY = 'radio_scheduler_demo'

function loadTrackLibrary() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'name' })
    }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const getAll = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
      getAll.onerror = () => { db.close(); reject(getAll.error) }
      getAll.onsuccess = () => {
        db.close()
        resolve(getAll.result || [])
      }
    }
  })
}

function saveTrack(track) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'name' })
    }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(track)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  })
}

function trackInfoFromFile(file) {
  const base = file.name.replace(/\.[^/.]+$/, '')
  const split = base.indexOf(' - ')
  return {
    name: file.name,
    title: split > 0 ? base.slice(split + 3).trim() : base,
    artist: split > 0 ? base.slice(0, split).trim() : 'Unknown',
    duration: '--',
    blob: file,
  }
}

function localDateTimeValue(date = new Date(Date.now() + 60_000)) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function localDateValue(date = new Date(Date.now() + 60_000)) {
  return localDateTimeValue(date).slice(0, 10)
}

function localTimeValue(date = new Date(Date.now() + 60_000)) {
  return localDateTimeValue(date).slice(11)
}

function combineLocalDateTime(date, time) {
  const value = new Date(`${date}T${time}`)
  if (value.getTime() <= Date.now()) value.setFullYear(value.getFullYear() + 1)
  return value.toISOString()
}

function CalendarPopup({ dates, onChange }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const first = dates[0] ? new Date(`${dates[0]}T12:00:00`) : new Date()
    return new Date(first.getFullYear(), first.getMonth(), 1)
  })
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(1 - monthStart.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
  const isoDate = (date) => localDateValue(date)
  const toggleDate = (value) => {
    onChange(dates.includes(value) ? dates.filter((date) => date !== value) : [...dates, value].sort())
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full flex items-center justify-between bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-left text-white">
        <span className="truncate">{dates.length ? `${dates.length} date${dates.length === 1 ? '' : 's'} selected` : 'Choose dates'}</span>
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14H3V6a2 2 0 012-2z" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-[300px] max-w-[85vw] bg-[#151821] border border-gray-700 rounded-xl shadow-2xl p-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="w-8 h-8 rounded hover:bg-gray-800">‹</button>
            <p className="text-sm font-bold">{month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</p>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="w-8 h-8 rounded hover:bg-gray-800">›</button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] text-gray-600 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const value = isoDate(day)
              const selected = dates.includes(value)
              const inMonth = day.getMonth() === month.getMonth()
              return (
                <button key={value} type="button" onClick={() => toggleDate(value)} className={`h-8 rounded text-xs ${selected ? 'bg-red-600 text-white font-bold' : inMonth ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-900'}`}>
                  {day.getDate()}
                </button>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
            <button type="button" onClick={() => onChange([])} className="text-xs text-gray-500 hover:text-white">Clear</button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded bg-amber-500 text-black text-xs font-bold">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

function TimePopup({ value, onChange }) {
  const inputRef = useRef(null)
  return (
    <button type="button" onClick={() => inputRef.current?.showPicker?.()} className="relative w-full flex items-center justify-between bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-left text-white">
      <span>{value || 'Choose time'}</span>
      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <input ref={inputRef} type="time" step="1" value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 opacity-0 pointer-events-none" />
    </button>
  )
}

function relativeTime(value, now) {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000)
  if (seconds < 0) return `${Math.abs(seconds)}s ago`
  if (seconds < 60) return `in ${seconds}s`
  if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  return `in ${hours}h ${Math.floor((seconds % 3600) / 60)}m`
}

export default function Scheduler() {
  const { token } = useAuth()
  const audioEngine = useAudioEngine()
  const eventSourceRef = useRef(null)
  const audioRef = useRef(null)
  const playbackRunRef = useRef(0)
  const [tracks, setTracks] = useState([])
  const [schedules, setSchedules] = useState([])
  const [mode, setMode] = useState('backend')
  const [connection, setConnection] = useState('connecting')
  const [showAddModal, setShowAddModal] = useState(false)
  const [sourceTab, setSourceTab] = useState('single')
  const [songID, setSongID] = useState('')
  const [multiTracks, setMultiTracks] = useState([])
  const [urlValue, setURLValue] = useState('')
  const [urlTitle, setURLTitle] = useState('')
  const [urlArtist, setURLArtist] = useState('')
  const [scheduleDates, setScheduleDates] = useState(() => [localDateValue()])
  const [scheduleTime, setScheduleTime] = useState(localTimeValue)
  const [recurring, setRecurring] = useState('none')
  const [logs, setLogs] = useState([])
  const [playing, setPlaying] = useState(null)
  const [now, setNow] = useState(0)

  const addLog = useCallback((message, level = 'info') => {
    setLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), message, level }, ...prev].slice(0, 80))
  }, [])

  const playSchedule = useCallback(async (schedule) => {
    const scheduledTracks = schedule.source_type === 'playlist'
      ? schedule.playlist || []
      : [{ song_id: schedule.song_id, title: schedule.title, artist: schedule.artist, source_url: schedule.source_url }]
    const audio = audioRef.current
    if (!audio) return
    const runID = playbackRunRef.current + 1
    playbackRunRef.current = runID
    await audioEngine?.resume?.()

    for (let index = 0; index < scheduledTracks.length; index += 1) {
      if (playbackRunRef.current !== runID) return
      const item = scheduledTracks[index]
      const isURL = schedule.source_type === 'url'
      const localTrack = isURL ? null : tracks.find((track) => track.name === item.song_id)
      if (!isURL && !localTrack?.blob) {
        addLog(`Track unavailable in this browser: ${item.title}`, 'error')
        continue
      }
      const url = isURL
        ? `/api/scheduler/url-stream?url=${encodeURIComponent(schedule.source_url || '')}`
        : URL.createObjectURL(localTrack.blob)
      const activeSchedule = {
        ...schedule,
        title: item.title,
        artist: item.artist,
        playlist_position: index + 1,
        playlist_total: scheduledTracks.length,
      }
      audio.src = url
      audio.load()
      const publish = () => {
        window.dispatchEvent(new CustomEvent('scheduler:playback', {
          detail: {
            schedule: activeSchedule,
            playing: !audio.paused && !audio.ended,
            currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
          },
        }))
      }
      audio.addEventListener('timeupdate', publish)
      audio.addEventListener('loadedmetadata', publish)
      try {
        await audio.play()
        setPlaying(activeSchedule)
        addLog(`Scheduler Monitor playing “${item.title}”`, 'live')
        publish()
        await new Promise((resolve) => {
          audio.addEventListener('ended', resolve, { once: true })
          audio.addEventListener('error', resolve, { once: true })
        })
      } catch (err) {
        addLog(`Scheduler Monitor could not play “${item.title}”${err?.message ? ` (${err.message})` : ''}`, 'error')
      } finally {
        audio.removeEventListener('timeupdate', publish)
        audio.removeEventListener('loadedmetadata', publish)
        if (!isURL) URL.revokeObjectURL(url)
      }
    }
    if (playbackRunRef.current !== runID) return
    setPlaying(null)
    window.dispatchEvent(new CustomEvent('scheduler:playback', {
      detail: { schedule, playing: false, currentTime: 0, duration: 0 },
    }))
  }, [addLog, audioEngine, tracks])

  const loadBackendSchedules = useCallback(async () => {
    const response = await fetch('/api/schedules', { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error(await response.text())
    const data = await response.json()
    setSchedules(data.schedules || [])
  }, [token])

  useEffect(() => {
    loadTrackLibrary()
      .then((items) => {
        setTracks(items)
        if (items[0]) setSongID(items[0].name)
        addLog(`Loaded ${items.length} Track Library song${items.length === 1 ? '' : 's'}`)
      })
      .catch(() => addLog('Could not open the Track Library', 'error'))
  }, [addLog])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    eventSourceRef.current?.close()
    if (mode === 'demo') {
      return
    }
    if (!token) return
    const events = new EventSource(`/api/events?token=${encodeURIComponent(token)}`)
    eventSourceRef.current = events
    events.onopen = () => {
      setConnection('connected')
      addLog('Connected to Go scheduler')
      loadBackendSchedules().catch((error) => addLog(error.message || 'Schedule sync failed', 'error'))
    }
    events.onerror = () => { setConnection('disconnected'); addLog('Scheduler connection interrupted; reconnecting…', 'error') }
    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type !== 'trigger') return
        playSchedule(payload.schedule)
        setSchedules((prev) => prev.map((item) => item.id === payload.schedule.id ? payload.schedule : item))
      } catch { addLog('Received an invalid scheduler event', 'error') }
    }
    return () => events.close()
  }, [addLog, loadBackendSchedules, mode, playSchedule, token])

  useEffect(() => {
    if (mode !== 'demo') return
    localStorage.setItem(LOCAL_KEY, JSON.stringify(schedules))
  }, [mode, schedules])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('scheduler:schedules', { detail: schedules }))
  }, [schedules])

  useEffect(() => {
    if (audioRef.current) audioEngine?.registerSchedulerMediaElement?.(audioRef.current)
  }, [audioEngine])

  useEffect(() => {
    const stopScheduledPlayback = () => {
      const stoppedSchedule = playing
      playbackRunRef.current += 1
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.dispatchEvent(new Event('error'))
      }
      setPlaying(null)
      window.dispatchEvent(new CustomEvent('scheduler:playback', {
        detail: { schedule: stoppedSchedule, playing: false, currentTime: 0, duration: 0 },
      }))
      addLog(`Stopped “${stoppedSchedule?.title || 'scheduled playback'}”`)
    }
    window.addEventListener('scheduler:stop', stopScheduledPlayback)
    return () => window.removeEventListener('scheduler:stop', stopScheduledPlayback)
  }, [addLog, playing])

  useEffect(() => {
    if (mode !== 'demo') return
    const due = schedules.filter((item) => item.enabled && !item.triggered && new Date(item.trigger_time).getTime() <= now && new Date(item.trigger_time).getTime() >= now - 60_000)
    due.forEach((item) => {
      playSchedule(item)
      setSchedules((prev) => prev.map((schedule) => {
        if (schedule.id !== item.id) return schedule
        if (schedule.recurring === 'none') return { ...schedule, triggered: true }
        const current = new Date(schedule.trigger_time)
        const next = schedule.recurring === 'yearly'
          ? new Date(current.getFullYear() + 1, current.getMonth(), current.getDate(), current.getHours(), current.getMinutes(), current.getSeconds())
          : schedule.recurring === 'monthly'
            ? new Date(current.getFullYear(), current.getMonth() + 1, current.getDate(), current.getHours(), current.getMinutes(), current.getSeconds())
            : new Date(current.getTime() + (schedule.recurring === 'daily' ? 86_400_000 : 604_800_000))
        return { ...schedule, trigger_time: next.toISOString(), triggered: false }
      }))
    })
  }, [mode, now, playSchedule, schedules])

  const selectedTrack = useMemo(() => tracks.find((track) => track.name === songID), [songID, tracks])

  async function importTracks(event, multiple = false) {
    const audioFiles = Array.from(event.target.files || []).filter((file) => file.type.startsWith('audio/') || /\.(mp3|wav|m4a|flac|ogg|aac|opus|wma)$/i.test(file.name))
    if (!audioFiles.length) {
      addLog('No supported audio files were found in that folder', 'error')
      return
    }
    const imported = audioFiles.map(trackInfoFromFile)
    await Promise.all(imported.map(saveTrack))
    setTracks((previous) => {
      const byName = new Map(previous.map((track) => [track.name, track]))
      imported.forEach((track) => byName.set(track.name, track))
      return [...byName.values()]
    })
    setSongID(imported[0].name)
    setMultiTracks(multiple ? imported : [])
    addLog(`Imported ${imported.length} song${imported.length === 1 ? '' : 's'} from computer`)
    event.target.value = ''
  }

  function decodeAudioURL(value) {
    setURLValue(value)
    try {
      const parsed = new URL(value)
      const filename = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '')
      if (!filename) return
      const decoded = trackInfoFromFile({ name: filename })
      setURLTitle(decoded.title)
      setURLArtist(decoded.artist === 'Unknown' ? '' : decoded.artist)
    } catch {
      // Keep the URL editable until it becomes complete.
    }
  }

  function switchMode(value) {
    setMode(value)
    if (value === 'demo') {
      setConnection('local')
      try { setSchedules(JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')) } catch { setSchedules([]) }
      addLog('Switched to in-browser demo mode')
    } else {
      setConnection('connecting')
    }
  }

  async function createSchedule(event) {
    event.preventDefault()
    if (scheduleDates.length === 0 || !scheduleTime) return
    const isURL = sourceTab === 'url'
    const isMulti = sourceTab === 'multi'
    if (!isURL && !isMulti && !selectedTrack) return
    if (isMulti && multiTracks.length === 0) return
    if (isURL) {
      try {
        const parsed = new URL(urlValue)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      } catch {
        addLog('Enter a valid http:// or https:// audio URL', 'error')
        return
      }
      if (!urlTitle.trim()) {
        addLog('Enter a title for the URL schedule', 'error')
        return
      }
    }
    const scheduleBase = {
      song_id: isURL ? urlValue.trim() : selectedTrack.name,
      title: isURL ? urlTitle.trim() : selectedTrack.title || selectedTrack.name,
      artist: isURL ? urlArtist.trim() || 'URL Stream' : selectedTrack.artist || 'Unknown',
      source_type: isURL ? 'url' : 'library',
      source_url: isURL ? urlValue.trim() : '',
      enabled: true,
      recurring,
      triggered: false,
    }
    const batch = isMulti
      ? scheduleDates.map((date) => ({
            id: mode === 'demo' ? crypto.randomUUID() : undefined,
            song_id: `playlist-${crypto.randomUUID()}`,
            title: `${multiTracks.length} Track Playlist`,
            artist: 'Scheduled Playlist',
            source_type: 'playlist',
            source_url: '',
            playlist: multiTracks.map((track) => ({
              song_id: track.name,
              title: track.title || track.name,
              artist: track.artist || 'Unknown',
            })),
            trigger_time: combineLocalDateTime(date, scheduleTime),
            enabled: true,
            recurring,
            triggered: false,
          }))
      : scheduleDates.map((date) => ({
          ...scheduleBase,
          id: mode === 'demo' ? crypto.randomUUID() : undefined,
          trigger_time: combineLocalDateTime(date, scheduleTime),
        }))

    if (mode === 'demo') {
      setSchedules((prev) => [...prev, ...batch].sort((a, b) => new Date(a.trigger_time) - new Date(b.trigger_time)))
    } else {
      const createdBatch = []
      for (const item of batch) {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(item),
      })
      if (!response.ok) { addLog(await response.text(), 'error'); return }
        createdBatch.push(await response.json())
      }
      setSchedules((prev) => [...prev, ...createdBatch].sort((a, b) => new Date(a.trigger_time) - new Date(b.trigger_time)))
    }
    addLog(isMulti
      ? `Scheduled ${batch.length} songs`
      : `Scheduled “${scheduleBase.title}” on ${batch.length} date${batch.length === 1 ? '' : 's'}`)
    setScheduleDates([localDateValue()])
    setScheduleTime(localTimeValue())
    setRecurring('none')
    setURLValue('')
    setURLTitle('')
    setURLArtist('')
    setMultiTracks([])
    setShowAddModal(false)
  }

  async function toggleSchedule(schedule) {
    const next = { ...schedule, enabled: !schedule.enabled }
    if (mode === 'demo') setSchedules((prev) => prev.map((item) => item.id === schedule.id ? next : item))
    else {
      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      })
      if (response.ok) setSchedules((prev) => prev.map((item) => item.id === schedule.id ? next : item))
    }
  }

  async function deleteSchedule(schedule) {
    if (mode === 'demo') setSchedules((prev) => prev.filter((item) => item.id !== schedule.id))
    else {
      const response = await fetch(`/api/schedules/${schedule.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) setSchedules((prev) => prev.filter((item) => item.id !== schedule.id))
    }
  }

  async function triggerNow(schedule) {
    if (mode === 'demo') { playSchedule(schedule); return }
    const response = await fetch(`/api/schedules/${schedule.id}/trigger`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) addLog(await response.text(), 'error')
  }

  return (
    <div className="w-full space-y-5">
      <audio ref={audioRef} className="hidden" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Song Scheduler</h2>
          <p className="text-sm text-gray-500">Auto-start Track Library songs using your local timezone.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {['demo', 'backend'].map((value) => (
            <button key={value} onClick={() => switchMode(value)} className={`px-3 py-2 rounded-lg text-xs font-bold ${mode === value ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-white'}`}>
              {value === 'demo' ? 'In-Browser Demo' : 'Go Backend'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div>
          <p className="font-semibold text-white">Program your next song</p>
          <p className="text-xs text-gray-500">Schedule audio from your computer or a direct URL.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden sm:inline text-[10px] uppercase font-bold px-2 py-1 rounded-full ${connection === 'connected' ? 'bg-green-900/40 text-green-400' : connection === 'local' ? 'bg-amber-900/40 text-amber-400' : 'bg-red-900/40 text-red-400'}`}>{connection}</span>
          <button onClick={() => setShowAddModal(true)} className="shrink-0 bg-red-600 hover:bg-red-500 rounded-xl px-4 py-2.5 text-sm font-bold">
            + Add Schedule
          </button>
        </div>
      </div>

      <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">Upcoming schedules</h3>
              <span className="text-xs text-gray-500">{schedules.length} programmed</span>
            </div>
            <div className="divide-y divide-gray-800">
              {schedules.length === 0 && <p className="p-8 text-center text-sm text-gray-600">No songs scheduled yet.</p>}
              {schedules.map((schedule) => (
                <div key={schedule.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${schedule.enabled && !schedule.triggered ? 'bg-green-400' : 'bg-gray-600'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{schedule.title}</p>
                    {schedule.source_type === 'playlist' && (
                      <p className="text-[10px] text-amber-400 truncate">
                        {(schedule.playlist || []).map((track) => track.title).join(' → ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 truncate">
                      {schedule.artist} · {schedule.source_type === 'url' ? 'URL' : schedule.source_type === 'playlist' ? 'Multi Playlist' : 'Computer'} · {new Date(schedule.trigger_time).toLocaleString()} · {relativeTime(schedule.trigger_time, now)}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase text-amber-400">{schedule.recurring === 'none' ? 'One Time' : schedule.recurring}</span>
                  <div className="flex gap-2">
                    <button onClick={() => triggerNow(schedule)} className="px-2.5 py-1.5 rounded bg-amber-500/15 text-amber-400 text-xs font-bold">Trigger</button>
                    <button onClick={() => toggleSchedule(schedule)} className="px-2.5 py-1.5 rounded bg-gray-800 text-gray-400 text-xs">{schedule.enabled ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => deleteSchedule(schedule)} className="px-2.5 py-1.5 rounded bg-red-900/20 text-red-400 text-xs">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 text-xs font-bold uppercase tracking-widest text-gray-500">Scheduler console</div>
            <div className="h-48 overflow-y-auto p-4 font-mono text-xs space-y-1">
              {logs.map((entry) => <p key={entry.id} className={entry.level === 'error' ? 'text-red-400' : entry.level === 'live' ? 'text-green-400' : 'text-gray-500'}><span className="text-gray-700">[{entry.time}]</span> {entry.message}</p>)}
            </div>
          </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={(event) => event.target === event.currentTarget && setShowAddModal(false)}>
          <form onSubmit={createSchedule} className="w-full max-w-lg bg-[#101218] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Add Schedule</h3>
                <p className="text-xs text-gray-500">Choose the audio source, then set its play time.</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-2 bg-black/30 rounded-xl p-1">
                <button type="button" onClick={() => setSourceTab('single')} className={`rounded-lg py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold ${sourceTab === 'single' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-white'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H2v16h20V6H12l-2-2z" /></svg>
                  Single
                </button>
                <button type="button" onClick={() => setSourceTab('multi')} className={`rounded-lg py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold ${sourceTab === 'multi' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-white'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H2v16h20V6H12l-2-2z" /></svg>
                  Multi
                </button>
                <button type="button" onClick={() => setSourceTab('url')} className={`rounded-lg py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold ${sourceTab === 'url' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-white'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H15a4.5 4.5 0 010 9h-1.5m-3 3H9a4.5 4.5 0 010-9h1.5m-3 3h9" /></svg>
                  URL
                </button>
              </div>

              {sourceTab === 'single' && (
                <div className="space-y-3">
                  <label className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-700 hover:border-amber-500 rounded-xl p-5 cursor-pointer text-sm text-gray-400 hover:text-amber-400">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H2v16h20V6H12l-2-2z" /></svg>
                    Select one audio track
                    <input type="file" accept="audio/*" onChange={(event) => importTracks(event, false)} className="hidden" />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Track
                    <select value={songID} onChange={(event) => setSongID(event.target.value)} required className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-white">
                      {tracks.length === 0 && <option value="">Select a folder containing audio</option>}
                      {tracks.map((track) => <option key={track.name} value={track.name}>{track.artist} — {track.title}</option>)}
                    </select>
                  </label>
                </div>
              )}

              {sourceTab === 'multi' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3 bg-gray-950 border border-gray-800 rounded-xl p-3">
                    <label className="block text-xs text-gray-400">
                      Calendar dates
                      <div className="mt-1.5"><CalendarPopup dates={scheduleDates} onChange={setScheduleDates} /></div>
                    </label>
                    <label className="block text-xs text-gray-400">
                      Play time
                      <div className="mt-1.5"><TimePopup value={scheduleTime} onChange={setScheduleTime} /></div>
                    </label>
                    <label className="block text-xs text-gray-400">
                      Repeat
                      <select value={recurring} onChange={(event) => setRecurring(event.target.value)} className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-white">
                        <option value="none">One Time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                  </div>
                  <label className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-700 hover:border-amber-500 rounded-xl p-5 cursor-pointer text-sm text-gray-400 hover:text-amber-400">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H2v16h20V6H12l-2-2z" /></svg>
                    Select multiple audio tracks
                    <input type="file" accept="audio/*" multiple onChange={(event) => importTracks(event, true)} className="hidden" />
                  </label>
                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {multiTracks.length === 0 && <p className="text-xs text-center text-gray-600 py-3">Select multiple tracks to batch schedule.</p>}
                    {multiTracks.map((track, index) => (
                      <div key={track.name} className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">{index + 1}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-gray-600 truncate">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-400/80">All tracks play sequentially as one playlist using the date, time, and repeat settings above.</p>
                </div>
              )}

              {sourceTab === 'url' && (
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400">
                    Direct audio URL
                    <input type="url" value={urlValue} onChange={(event) => decodeAudioURL(event.target.value)} placeholder="https://example.com/Artist%20-%20Song.mp3" required className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-white" />
                    <span className="block mt-1 text-[10px] text-gray-600">Encoded filenames are decoded automatically into artist and title.</span>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block text-xs text-gray-400">
                      Song title
                      <input value={urlTitle} onChange={(event) => setURLTitle(event.target.value)} placeholder="Song title" required className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-white" />
                    </label>
                    <label className="block text-xs text-gray-400">
                      Artist
                      <input value={urlArtist} onChange={(event) => setURLArtist(event.target.value)} placeholder="Optional" className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-white" />
                    </label>
                  </div>
                </div>
              )}

              {sourceTab !== 'multi' && <div className="grid sm:grid-cols-3 gap-3">
                <label className="block text-xs text-gray-400">
                  Calendar dates
                  <div className="mt-1.5"><CalendarPopup dates={scheduleDates} onChange={setScheduleDates} /></div>
                </label>
                <label className="block text-xs text-gray-400">
                  Play time
                  <div className="mt-1.5"><TimePopup value={scheduleTime} onChange={setScheduleTime} /></div>
                </label>
                <label className="block text-xs text-gray-400">
                  Repeat
                  <select value={recurring} onChange={(event) => setRecurring(event.target.value)} className="mt-1.5 w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-white">
                    <option value="none">One Time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                <p className="sm:col-span-3 text-[10px] text-amber-400/80">Select one or more start dates, a time, and how often the schedule repeats.</p>
              </div>}
            </div>

            <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button
                type="submit"
                disabled={
                  sourceTab === 'single'
                    ? !selectedTrack || scheduleDates.length === 0
                    : sourceTab === 'multi'
                      ? multiTracks.length === 0 || scheduleDates.length === 0 || !scheduleTime
                      : !urlValue || !urlTitle || scheduleDates.length === 0
                }
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-sm font-bold"
              >
                {sourceTab === 'multi' ? `Save Playlist (${multiTracks.length || 0} tracks)` : 'Save Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
