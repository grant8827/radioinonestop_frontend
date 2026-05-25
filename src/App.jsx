import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Player from './components/Player'
import ViewerCount from './components/ViewerCount'
import AdminPanel from './components/AdminPanel'
import NowPlaying from './components/NowPlaying'
import Sidebar from './components/Sidebar'
import StreamSetup from './components/StreamSetup'
import Mixer from './components/Mixer'
import SocialLive from './components/SocialLive'
import TrackLibrary from './components/TrackLibrary'
import ConferenceRoom from './pages/ConferenceRoom'
import SettingsPage from './components/SettingsPage'
import ProfileSettings from './components/ProfileSettings'
import LandingPage from './pages/LandingPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AudioEngineProvider } from './context/AudioEngine'
import { StreamProvider, useStream } from './context/StreamContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/" replace />
}

function MainApp() {
  const { user, token } = useAuth()
  const { reconnectNeeded, doReconnect, dismissReconnect } = useStream()
  const [mode, setMode] = useState('radio')
  const [playerMode, setPlayerMode] = useState('radio')  // sticky: only updates on radio/video
  const [config, setConfig] = useState(null)
  const [stationName, setStationName] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [trackA, setTrackA] = useState(null)
  const [trackB, setTrackB] = useState(null)
  const [queue,          setQueue]          = useState([])
  const [repeatPlaylist, setRepeatPlaylist] = useState(false)
  const repeatBackupRef = useRef([])
  useEffect(() => {
    if (queue.length > 0) repeatBackupRef.current = [...queue]
  }, [queue])
  const onRepeatReload = useCallback(() => {
    const backup = [...repeatBackupRef.current]
    setQueue(backup)
    return backup
  }, [])
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() =>
        setConfig({
          radioUrl: '',
          videoUrl: '',
          stationName: 'Radio In One Stop',
        })
      )
  }, [])

  // Always fetch station name from DB — don't rely on potentially stale JWT
  useEffect(() => {
    if (!token) return
    fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.station_name) setStationName(d.station_name) })
      .catch(() => {})
  }, [token])

  const handleModeChange = (m) => {
    setMode(m)
    if (m === 'radio' || m === 'video') setPlayerMode(m)
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 text-lg">Loading…</span>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-950 text-white flex">
      {reconnectNeeded && (
        <div className="fixed top-0 left-0 right-0 z-100 bg-amber-900/95 text-amber-100 text-sm py-2 px-4 flex items-center justify-between gap-2 border-b border-amber-700">
          <span>Your stream was interrupted. Reconnect to resume broadcasting.</span>
          <div className="flex gap-2 shrink-0">
            <button onClick={doReconnect} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors">Reconnect</button>
            <button onClick={dismissReconnect} className="text-amber-400 hover:text-amber-200 px-1 transition-colors">✕</button>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <Sidebar
        stationName={stationName || user?.stationName || config.stationName}
        mode={mode}
        onModeChange={handleModeChange}
        onSettingsClick={() => handleModeChange('settings')}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-6 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight truncate">{stationName || user?.stationName || config.stationName}</h1>
          <ViewerCount />
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col lg:flex-row gap-4 p-4 lg:p-6 max-w-6xl mx-auto w-full">
          {/* Keep StreamSetup mounted so an active broadcast isn't killed by tab navigation.
              Hidden via CSS — the WS + MediaRecorder stay alive. */}
          <div className={mode !== 'stream' ? 'hidden' : 'contents'}>
            <StreamSetup />
          </div>
          {mode === 'mixer' && <Mixer config={config} onOpenConference={() => handleModeChange('conference')} />}
          {mode === 'conference' && (
            <ConferenceRoom roomId="studio" username={user?.stationName} onLeave={() => handleModeChange('radio')} />
          )}
          {mode === 'profile' && <ProfileSettings />}
          {mode === 'settings' && <SettingsPage />}

          {/* Player + NowPlaying + Chat — always mounted so audio elements survive
              mode switches. Hidden (display:none) when not in radio/video mode. */}
          <div className={`flex-1 flex flex-col lg:flex-row gap-4 w-full${
            mode !== 'radio' && mode !== 'video' ? ' hidden' : ''
          }`}>
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <Player mode={playerMode} config={config} trackA={trackA} trackB={trackB} queue={queue} onQueuePop={repeatPlaylist ? () => setQueue((q) => q.length > 0 ? [...q.slice(1), q[0]] : [...repeatBackupRef.current]) : () => setQueue((q) => q.slice(1))} onLoadTrackA={setTrackA} onLoadTrackB={setTrackB} repeatPlaylist={repeatPlaylist} onRepeatReload={onRepeatReload} />
              <NowPlaying config={config} mode={mode} />
            </div>
            <div className="lg:w-80 xl:w-96 shrink-0 flex flex-col gap-3 min-h-0">
              <SocialLive />
              <div className="min-h-0 overflow-hidden" style={{ height: 400 }}>
                <TrackLibrary onTrackLoadA={setTrackA} onTrackLoadB={setTrackB} queue={queue} onQueueChange={setQueue} repeatPlaylist={repeatPlaylist} onRepeatChange={setRepeatPlaylist} nowPlayingA={trackA} nowPlayingB={trackB} />
              </div>
            </div>
          </div>
        </main>
      </div>

      {showAdmin && (
        <AdminPanel config={config} onSave={setConfig} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/conference/:roomId" element={<ConferenceRoom />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AudioEngineProvider>
                  <StreamProvider>
                    <MainApp />
                  </StreamProvider>
                </AudioEngineProvider>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
