import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  LiveKitRoom,
  AudioConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react'
import '@livekit/components-styles'

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

// ── Share button ───────────────────────────────────────────────────────────────
function ShareButton() {
  const [copied, setCopied] = useState(false)
  const url = window.location.href

  const handle = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my conference call', url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [url])

  return (
    <button
      onClick={handle}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
        copied ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Invite
        </>
      )}
    </button>
  )
}

// ── Username prompt ────────────────────────────────────────────────────────────
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

// ── Main room view ─────────────────────────────────────────────────────────────
function RoomView() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-sm font-semibold">Conference</span>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton />
          <MuteButton />
          <LeaveButton />
        </div>
      </header>

      {/* Participant grid (AudioConference renders avatars + active speaker) */}
      <main className="flex-1 p-4">
        <AudioConference />
      </main>

      {/* Pulls all remote audio tracks to speakers */}
      <RoomAudioRenderer />
    </div>
  )
}

// ── Page entry point ───────────────────────────────────────────────────────────
export default function ConferenceRoom() {
  const { roomId } = useParams()
  const [username, setUsername] = useState(null)
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
