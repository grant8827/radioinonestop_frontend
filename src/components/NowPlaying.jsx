import { useAudioEngine } from '../context/AudioEngine'

export default function NowPlaying({ config, mode }) {
  const audioEngine = useAudioEngine()
  const micOn = audioEngine?.micOnAirMap?.[1] ?? false

  return (
    <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3">
      <button
        onClick={() => audioEngine?.setMicOnAir(1, !micOn)}
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
    </div>
  )
}
