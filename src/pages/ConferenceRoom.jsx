import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useParticipants,
  useIsSpeaking,
} from '@livekit/components-react'
import '@livekit/components-styles'

// Derive a display name from an email address
function nameFromEmail(email) {
  if (!email) return null
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Mute / unmute control ──────────────────────────────────────────────────────
function MuteButton() {
  const { localParticipant } = useLocalParticipant()
  const [muted, setMuted] = useState(false)

  const toggle = useCallback(async () => {
    if (!localParticipant) return
    await localParticipant.setMicrophoneEnabled(muted)
    setMuted(!muted)
  }, [localParticipant, muted])

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
        muted
          ? 'bg-red-600 hover:bg-red-500 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-white'
      }`}
    >
      {muted ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
          </svg>
          Unmute
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
          Mute
        </>
      )}
    </button>
  )
}

// ── Leave button ───────────────────────────────────────────────────────────────
function LeaveButton() {
  const room = useRoomContext()
  const handleLeave = useCallback(async () => {
    await room.disconnect()
    window.location.href = '/'
  }, [room])

  return (
    <button
      onClick={handleLeave}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-red-700 hover:bg-red-600 text-white transition-all"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
      </svg>
      Leave
    </button>
  )
}

// ── Settings tab — invite link ─────────────────────────────────────────────────
function SettingsPanel() {
  const [copied, setCopied] = useState(false)
  const url = window.location.href

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [url])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my conference call', url }) } catch {}
    } else {
      handleCopy()
    }
  }, [url, handleCopy])

  return (
    <div className="p-4 flex flex-col gap-6 max-w-md mx-auto w-full">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Invite link</p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-300 break-all font-mono select-all">
            {url}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                copied ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 text-gray-200 hover:bg-gray-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 text-center">
        Anyone with this link can join without signing in.
      </p>
    </div>
  )
}

// ── Single participant tile ──────────────────────────────────────────────────
function ParticipantTile({ participant, isLocal }) {
  const isSpeaking = useIsSpeaking(participant)
  const micEnabled = participant.isMicrophoneEnabled
  const name = participant.name || participant.identity || 'Guest'
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col items-center gap-2 p-3">
      <div
        className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center transition-all ${
          isSpeaking ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-gray-950' : 'ring-2 ring-gray-800'
        }`}
      >
        <span className="text-xl font-bold text-white select-none">{initials}</span>
        {!micEnabled && (
          <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border-2 border-gray-950">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white truncate max-w-[90px]">{name}</p>
        {isLocal && <p className="text-xs text-purple-400">You</p>}
        {isSpeaking && !isLocal && <p className="text-xs text-green-400">Speaking…</p>}
      </div>
    </div>
  )
}

// ── Participant grid ───────────────────────────────────────────────────────────
function GroupTab() {
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useParticipants()

  const tiles = [
    ...(localParticipant ? [{ p: localParticipant, isLocal: true }] : []),
    ...remoteParticipants
      .filter((p) => !localParticipant || p.identity !== localParticipant.identity)
      .map((p) => ({ p, isLocal: false })),
  ]

  if (tiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-600">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <p className="text-sm">No one else is here yet</p>
        <p className="text-xs text-gray-700">Share the link to invite others</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2">
      {tiles.map(({ p, isLocal }) => (
        <ParticipantTile key={p.identity} participant={p} isLocal={isLocal} />
      ))}
    </div>
  )
}

// ── Main room view ─────────────────────────────────────────────────────────────
function RoomView() {
  const [tab, setTab] = useState('group')
  const participants = useParticipants()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-sm font-semibold">Conference</span>
        </div>
        <div className="flex items-center gap-2">
          <MuteButton />
          <LeaveButton />
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 flex shrink-0">
        <button
          onClick={() => setTab('group')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'group'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Group
          {participants.length > 0 && (
            <span className="ml-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {participants.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'settings'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'group' && <GroupTab />}
        {tab === 'settings' && <SettingsPanel />}
      </main>

      {/* Pulls all remote audio tracks to speakers */}
      <RoomAudioRenderer />
    </div>
  )
}
function UsernameForm({ onSubmit }) {
  const [name, setName] = useState('')
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
        <div className="text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse inline-block mb-3" />
          <h2 className="text-lg font-bold">Join Conference</h2>
          <p className="text-sm text-gray-400 mt-1">Enter a name so others know who you are</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()) }}
          className="flex flex-col gap-3"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Your name…"
            className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Page entry point ───────────────────────────────────────────────────────────
export default function ConferenceRoom() {
  const { roomId } = useParams()
  const { user } = useAuth()
  // If logged in, skip the name form and use their account name
  const [username, setUsername] = useState(() => nameFromEmail(user?.email))
  const [token, setToken] = useState(null)
  const [livekitUrl, setLivekitUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!username) return
    fetch(`/api/conference/token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(username)}`)
      .then((r) => {
        if (!r.ok) return r.text().then((t) => { throw new Error(t) })
        return r.json()
      })
      .then(({ token, url }) => {
        setToken(token)
        setLivekitUrl(url)
      })
      .catch((e) => setError(e.message || 'Failed to connect'))
  }, [username, roomId])

  if (!username) return <UsernameForm onSubmit={setUsername} />

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-2">Could not join room</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={() => setError(null)} className="mt-4 px-4 py-2 rounded-lg bg-gray-800 text-sm hover:bg-gray-700">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Connecting…
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      audio={true}
      video={false}
      connect={true}
      onDisconnected={() => { window.location.href = '/' }}
    >
      <RoomView />
    </LiveKitRoom>
  )
}
