import { Link, useNavigate } from 'react-router-dom'
import appLogo from '../assets/radioinonestop_logo .png'

// Drop the real screenshots into /public/features/ using these exact filenames
// (jpg, png, or webp all work — just update the `image` path below to match)
// and they'll replace these placeholders automatically.
const FEATURES = [
  {
    id: 'dj-player',
    eyebrow: '01 — Broadcast',
    title: 'Radio DJ Player',
    image: '/features/radio-dj-player.png',
    accent: 'text-red-400',
    border: 'border-red-900/40',
    bg: 'bg-red-900/10',
    desc: "A two-deck browser DJ player built for live radio. Load a track to Deck A and the next one to Deck B, beatmatch with pitch control, and crossfade between them without ever leaving the tab.",
    points: [
      'Dual decks (A/B) with Instant Play and full transport control',
      'Hot Cues and Loop points for clean, repeatable transitions',
      'Pitch control and a live X-Fader to blend outgoing and incoming tracks',
      'Feeds straight into your live stream — no separate broadcast software needed',
    ],
  },
  {
    id: 'mixer',
    eyebrow: '02 — Studio',
    title: 'Mixer',
    image: '/features/mixer.png',
    accent: 'text-amber-400',
    border: 'border-amber-900/40',
    bg: 'bg-amber-900/10',
    desc: 'A full broadcast mixer with dedicated channel strips for your DJ Player, microphone, podcast sources, and external line-in or USB gear — all routed down to one master bus.',
    points: [
      'Per-channel gain, pan, and fader control with real-time level metering',
      'Mix in mic, DJ Player, podcast sources, or external line-in/USB sources side by side',
      'Monitor and AUX return buses so you can cue up the next source before it goes live',
      'Master section with live recording, so every broadcast is captured as you go',
    ],
  },
  {
    id: 'analytics',
    eyebrow: '03 — Insights',
    title: 'Listener Analytics',
    image: '/features/listener-analytics.png',
    accent: 'text-emerald-400',
    border: 'border-emerald-900/40',
    bg: 'bg-emerald-900/10',
    desc: "See exactly who's tuning in, in real time. Track live listener counts, session lengths, and where your audience is actually listening from.",
    points: [
      'Weekly listener trend chart to track growth over time',
      'Geographic distribution showing which countries your audience comes from',
      'Raw stream session log with duration and connection details per listener',
      'Live on-air listener counts fed straight from the streaming server',
    ],
  },
  {
    id: 'scheduler',
    eyebrow: '04 — Automation',
    title: 'Scheduler',
    image: '/features/scheduler.png',
    accent: 'text-orange-400',
    border: 'border-orange-900/40',
    bg: 'bg-orange-900/10',
    desc: 'Queue up songs to play automatically at a specific date and time. Set it once and the scheduler console handles the trigger for you — even if you switch tabs.',
    points: [
      'Program upcoming schedules with exact dates, times, and recurring options',
      'Scheduler console shows what’s queued next — edit or delete on the fly',
      'Automatic triggers hand tracks straight to the on-air player, no manual cueing',
      'Runs in the background across the app, so shows fire on time no matter what tab you’re on',
    ],
  },
  {
    id: 'conference',
    eyebrow: '05 — Collaboration',
    title: 'Conference',
    image: '/features/conference.png',
    accent: 'text-sky-400',
    border: 'border-sky-900/40',
    bg: 'bg-sky-900/10',
    desc: 'Bring co-hosts, guests, and callers into your broadcast with a built-in studio conference room. Invite by link, mix their voices live, and send them straight to air.',
    points: [
      'Shareable invite link with an optional passcode to control who joins',
      'Per-guest gain control with live voice-activity indicators',
      'Dedicated Program and Cue buses — route a guest to air or just to monitor',
      'Room capacity scales with your plan, from a couple of co-hosts to a full panel',
    ],
  },
  {
    id: 'mixer-settings',
    eyebrow: '06 — Configuration',
    title: 'Mixer Settings',
    image: '/features/mixer-settings.png',
    accent: 'text-yellow-300',
    border: 'border-yellow-900/40',
    bg: 'bg-yellow-900/10',
    desc: 'Choose how the mixer routes your sound, then shape it with a full graphic EQ — configure it once and it holds every time you go live.',
    points: [
      'App Mixer mode streams your in-app mix; External Mixer mode sends a line-in source to the stream while routing the app mix out to your gear',
      '11-band graphic EQ (31.25Hz–16kHz) plus a dedicated gain fader for the master mix',
      'Visual sliders make it easy to shape tone by ear and save a setup that fits your room',
      'Settings persist across sessions, so your studio sounds the same every broadcast',
    ],
  },
  {
    id: 'record',
    eyebrow: '07 — Archive',
    title: 'Record',
    image: '/features/record.png',
    accent: 'text-rose-400',
    border: 'border-rose-900/40',
    bg: 'bg-rose-900/10',
    desc: 'Capture every broadcast automatically. Pick a save location and format once, then hit record — it saves exactly what you sent to air.',
    points: [
      'Choose a custom save location, or a folder, for every recording',
      'Record in WEBM or OGG, with format notes on browser compatibility',
      'One-click record with a live running timer while you broadcast',
      'Builds an archive of every show, ready to re-upload, edit, or share after you go off air',
    ],
  },
]

export default function FeaturesPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#09090f]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <img src={appLogo} alt="Radio In One Stop logo" className="w-7 h-7 rounded-sm object-contain" />
            <span>Radio In One Stop</span>
          </Link>
        </div>
      </header>

      {/* Title */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 bg-red-900/20 border border-red-800/40 rounded-full px-3 py-1 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Everything in your studio
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
          One dashboard.{' '}
          <span className="rio-logo-gradient-text">Every tool you need.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-gray-500 text-sm sm:text-base leading-relaxed">
          From spinning tracks to bringing a co-host on air, here's a closer look at the six tools that
          make up the Radio In One Stop studio.
        </p>
      </section>

      {/* Feature sections */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col gap-20 sm:gap-28">
        {FEATURES.map((f, i) => (
          <section
            key={f.id}
            id={f.id}
            className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-14`}
          >
            {/* Image */}
            <div className="w-full lg:w-1/2 shrink-0">
              <div className={`relative rounded-2xl border ${f.border} ${f.bg} overflow-hidden p-3 sm:p-4 flex items-center justify-center`}>
                <img
                  src={f.image}
                  alt={`${f.title} screenshot`}
                  className="w-full h-auto max-h-125 object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Text */}
            <div className="w-full lg:w-1/2">
              <span className={`text-xs font-bold uppercase tracking-wider ${f.accent}`}>{f.eyebrow}</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2 mb-4">{f.title}</h2>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6">{f.desc}</p>
              <ul className="flex flex-col gap-3">
                {f.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center border ${f.border} ${f.bg}`}>
                      <svg className={`w-3 h-3 ${f.accent}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </main>

      {/* CTA band */}
      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Ready to go live?</h2>
          <p className="text-gray-500 text-sm mb-8">Choose your plan and start broadcasting in minutes.</p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-8 py-3 rounded-xl rio-logo-gradient text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/40"
          >
            View Pricing Plans
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-gray-600">© 2026 Radio In One Stop</span>
          <Link to="/" className="text-xs font-medium text-gray-400 transition-colors hover:text-white">Back to Home</Link>
        </div>
      </footer>
    </div>
  )
}
