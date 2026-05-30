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
import AdsManager from './components/AdsManager'
import LandingPage from './pages/LandingPage'
import PricingPage from './pages/PricingPage'
import RegisterPage from './pages/RegisterPage'
import PaymentPage from './pages/PaymentPage'
import ListenerLimitModal from './components/ListenerLimitModal'
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
  const [listenerStatus, setListenerStatus] = useState(null)
  const [showListenerModal, setShowListenerModal] = useState(false)
  
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

  // Check listener status on mount and periodically
  useEffect(() => {
    if (!token) return
    
    const checkListenerStatus = () => {
      fetch('/api/user/listener-status', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
        .then(r => r.json())
        .then(data => {
          setListenerStatus(data)
          // Show modal if warning or suspended
          if (data.status === 'warning' || data.status === 'suspended') {
            setShowListenerModal(true)
          }
        })
        .catch(() => {})
    }
    
    checkListenerStatus()
    const interval = setInterval(checkListenerStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
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
      {/* Listener limit modal */}
      {showListenerModal && listenerStatus && (listenerStatus.status === 'warning' || listenerStatus.status === 'suspended') && (
        <ListenerLimitModal
          status={listenerStatus.status}
          current={listenerStatus.current}
          limit={listenerStatus.limit}
          plan={listenerStatus.plan}
          onClose={() => setShowListenerModal(false)}
        />
      )}
      
      {reconnectNeeded && (
        <div className="fixed top-0 left-0 right-0 z-100 bg-amber-900/95 text-amber-100 text-sm py-2 px-4 flex items-center justify-between gap-2 border-b border-amber-700">
          <span>Your stream was interrupted. Reconnect to resume broadcasting.</span>
          <div className="flex gap-2 shrink-0">
            <button onClick={doReconnect} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors">Reconnect</button>
            <button onClick={dismissReconnect} className="text-amber-400 hover:text-amber-200 px-1 transition-colors">✕</button>
          </div>
        </div>
      )}
      
      {/* Suspension banner */}
      {listenerStatus?.status === 'suspended' && !showListenerModal && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-900/95 text-red-100 text-sm py-2 px-4 flex items-center justify-between gap-3 border-b border-red-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>Streaming suspended</strong> — You exceeded your listener limit ({listenerStatus.current}/{listenerStatus.limit}). 
              Upgrade to resume broadcasting.
            </span>
          </div>
          <button 
            onClick={() => setShowListenerModal(true)} 
            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors shrink-0"
          >
            Upgrade
          </button>
        </div>
      )}
      
      {/* Approaching limit banner */}
      {listenerStatus?.status === 'approaching' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-900/95 text-amber-100 text-sm py-2 px-4 flex items-center justify-between gap-3 border-b border-amber-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              You're using <strong>{listenerStatus.current}/{listenerStatus.limit} listeners</strong> ({listenerStatus.percentage}%) — Upgrade soon to avoid interruptions.
            </span>
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

        {/* Content — main is a pure scroll container; the inner div handles flex layout
              so flex items can grow naturally and trigger overflow-y scroll */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-4 p-4 lg:p-6 max-w-6xl mx-auto w-full min-h-full">
          {/* Keep StreamSetup mounted so an active broadcast isn't killed by tab navigation.
              Hidden via CSS — the WS + MediaRecorder stay alive. */}
          <div className={mode !== 'stream' ? 'hidden' : 'contents'}>
            <StreamSetup isSuspended={listenerStatus?.status === 'suspended'} />
          </div>
          {mode === 'mixer' && <Mixer config={config} onOpenConference={() => handleModeChange('conference')} />}
          {mode === 'conference' && (
            <ConferenceRoom roomId="studio" username={user?.stationName} onLeave={() => handleModeChange('radio')} />
          )}
          {mode === 'ads' && <AdsManager />}
          {mode === 'profile' && <ProfileSettings />}
          {mode === 'settings' && <SettingsPage />}

          {/* Player + NowPlaying + Chat — always mounted so audio elements survive
              mode switches. Hidden (display:none) when not in radio/video mode. */}
          <div className={`flex flex-col lg:flex-row gap-4 w-full${
            mode !== 'radio' && mode !== 'video' ? ' hidden' : ''
          }`}>
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              <Player mode={playerMode} config={config} trackA={trackA} trackB={trackB} queue={queue} onQueuePop={repeatPlaylist ? () => setQueue((q) => q.length > 0 ? [...q.slice(1), q[0]] : [...repeatBackupRef.current]) : () => setQueue((q) => q.slice(1))} onLoadTrackA={setTrackA} onLoadTrackB={setTrackB} repeatPlaylist={repeatPlaylist} onRepeatReload={onRepeatReload} isSuspended={listenerStatus?.status === 'suspended'} />
              <NowPlaying config={config} mode={mode} />
            </div>
            <div className="lg:w-80 xl:w-96 shrink-0 flex flex-col gap-3 min-h-0">
              <SocialLive />
              <div className="min-h-0 overflow-hidden" style={{ height: 530 }}>
                <TrackLibrary onTrackLoadA={setTrackA} onTrackLoadB={setTrackB} queue={queue} onQueueChange={setQueue} repeatPlaylist={repeatPlaylist} onRepeatChange={setRepeatPlaylist} nowPlayingA={trackA} nowPlayingB={trackB} />
              </div>
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
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/payment" element={<PaymentPage />} />
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
