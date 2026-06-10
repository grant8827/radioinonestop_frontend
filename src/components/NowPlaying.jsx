import { useAudioEngine } from '../context/AudioEngine'
import { useStream } from '../context/StreamContext'

export default function NowPlaying({ config, mode }) {
  const audioEngine = useAudioEngine()
  const micOn = audioEngine?.micOnAirMap?.[1] ?? false
  const { radioStatus, startRadio, stopRadio,
          broadcastMode, icecastStatus, icecastStartRef, icecastStopRef } = useStream()

  // Which status and handlers to use depends on the broadcast mode set in the encoder tab
  const isIcecast = broadcastMode === 'icecast'
  const liveStatus  = isIcecast ? icecastStatus : radioStatus
  const goLiveAct   = isIcecast
    ? () => icecastStartRef?.current?.()
    : startRadio
  const stopAct     = isIcecast
    ? () => icecastStopRef?.current?.()
    : stopRadio

  const radioLive       = liveStatus === 'live'
  const radioConnecting = liveStatus === 'connecting' || liveStatus === 'requesting' || liveStatus === 'reconnecting'

  return (
    <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
      <button
        onClick={() => audioEngine?.setMicOnAir(1, !micOn)}
        title={micOn ? "Mute Microphone" : "Go On Air with Microphone"}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-150 shrink-0 ${
          micOn
            ? 'bg-red-600 text-white shadow-[0_0_18px_#ef444455] animate-pulse'
            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        {micOn ? '● ON AIR MIC' : 'ON AIR MIC'}
      </button>

      <button
        onClick={radioLive ? stopAct : goLiveAct}
        disabled={radioConnecting}
        title={radioLive ? "Stop Broadcasting" : "Start Broadcasting"}
        className={`ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-150 shrink-0 ${
          radioLive
            ? 'bg-green-600 text-white shadow-[0_0_18px_#16a34a55] animate-pulse'
            : radioConnecting
            ? 'bg-gray-700 text-gray-400 cursor-wait border border-gray-600'
            : liveStatus === 'error'
            ? 'bg-red-900 text-red-300 border border-red-700 hover:border-red-500 hover:text-white'
            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-green-600 hover:text-green-400'
        }`}
      >
        {/* Broadcast / radio tower icon */}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1.41 1L0 2.41l5.59 5.59A7.94 7.94 0 0 0 4 12c0 2.58 1.23 4.87 3.13 6.33L5.59 19.87 7 21.28l1.55-1.55A7.97 7.97 0 0 0 12 21c1.55 0 3-.44 4.24-1.2l1.52 1.52 1.41-1.41-1.52-1.52A7.97 7.97 0 0 0 20 12c0-1.55-.44-3-1.2-4.24L20.59 6 22 4.59 20.59 3.18 19.17 4.6A7.94 7.94 0 0 0 12 4c-1.55 0-3 .44-4.24 1.2L6.24 3.68 4.83 2.27 3.41 3.68 1.41 1zm7.27 7.27A5.97 5.97 0 0 1 12 6c1.08 0 2.09.29 2.96.79L8.2 13.55A5.97 5.97 0 0 1 8.68 8.27zm-1.42 6.88l6.76-6.76A5.97 5.97 0 0 1 18 12c0 1.08-.29 2.09-.79 2.96l-1.42-1.42A3.99 3.99 0 0 0 16 12c0-2.21-1.79-4-4-4-.53 0-1.04.11-1.5.29L9.08 6.87A5.97 5.97 0 0 1 12 6v0zm2.73 2.73A3.99 3.99 0 0 1 8 12c0-.53.11-1.04.29-1.5L15.73 17c-.46.18-.97.29-1.5.29H12v0zM12 18c-3.31 0-6-2.69-6-6 0-1.08.29-2.09.79-2.96l1.42 1.42A3.99 3.99 0 0 0 8 12c0 2.21 1.79 4 4 4 .53 0 1.04-.11 1.5-.29l1.42 1.42A5.97 5.97 0 0 1 12 18z"/>
        </svg>
        {radioLive ? '● GO LIVE RADIO' : liveStatus === 'reconnecting' ? 'RECONNECTING…' : radioConnecting ? 'CONNECTING…' : liveStatus === 'error' ? 'RETRY LIVE' : 'GO LIVE RADIO'}
      </button>
    </div>
  )
}
