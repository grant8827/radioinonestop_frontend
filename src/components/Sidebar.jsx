import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from './UpgradeModal'

// Define which features are available in each plan
const PLAN_FEATURES = {
  starter: ['radio', 'mixer', 'stream', 'scheduler'],
  professional: ['radio', 'mixer', 'stream', 'scheduler', 'conference'],
  enterprise: ['radio', 'mixer', 'stream', 'scheduler', 'conference'],
  ultimate: ['radio', 'mixer', 'stream', 'scheduler', 'conference'],
}

// Define required plans for locked features
const FEATURE_REQUIRED_PLAN = {
  conference: 'professional',
}

const NAV_ITEMS = [
  { id: 'radio', label: 'Radio', icon: RadioIcon },
  { id: 'mixer', label: 'Mixer', icon: MixerIcon },
  { id: 'stream', label: 'Stream', icon: StreamIcon },
  { id: 'scheduler', label: 'Scheduler', icon: SchedulerIcon },
  { id: 'conference', label: 'Conference', icon: ConferenceIcon },
]

function RadioIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H5.02L16.89 2.37 16.26.91 3.24 6.15zM12 18c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6-8H6V8h12v2z" />
    </svg>
  )
}

function VideoIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  )
}

function ConferenceIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

function MixerIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
    </svg>
  )
}

function StreamIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.25h.008v.008H12v-.008z" />
    </svg>
  )
}

function SchedulerIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6" />
    </svg>
  )
}

function AdsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  )
}

function LockIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

export default function Sidebar({ stationName, logoUrl, mode, onModeChange, onSettingsClick }) {
  const [open, setOpen] = useState(false) // mobile drawer
  const [upgradeModal, setUpgradeModal] = useState({ show: false, feature: null, requiredPlan: null })
  const { logout, user } = useAuth()

  const userPlan = user?.plan || 'starter'
  const allowedFeatures = PLAN_FEATURES[userPlan] || PLAN_FEATURES.starter

  const content = (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className="px-5 pt-6 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={`${stationName} logo`} className="w-8 h-8 rounded-sm object-cover flex-shrink-0" />
          ) : (
            <span className="w-8 h-8 rounded-sm bg-gray-800 border border-gray-700 text-amber-400 flex items-center justify-center text-sm font-black flex-shrink-0">
              {stationName?.[0]?.toUpperCase() || 'R'}
            </span>
          )}
          <span className="font-bold text-sm leading-tight truncate">{stationName}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 pt-4 pb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
          Channels
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isLocked = !allowedFeatures.includes(id)
          const requiredPlan = FEATURE_REQUIRED_PLAN[id]
          
          return (
            <div key={id} className="relative group">
              <button
                onClick={() => {
                  if (isLocked) {
                    setUpgradeModal({ show: true, feature: label, requiredPlan })
                  } else {
                    onModeChange(id)
                    setOpen(false)
                  }
                }}
                disabled={isLocked && !requiredPlan}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${
                  isLocked
                    ? 'opacity-50 cursor-not-allowed text-gray-500 hover:text-gray-400 hover:bg-gray-800/50'
                    : mode === id
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {isLocked && <LockIcon className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                {!isLocked && mode === id && (
                  <span className="ml-auto text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5 leading-none">
                    ON
                  </span>
                )}
                {isLocked && requiredPlan && (
                  <span className="ml-auto text-[9px] font-bold text-amber-400 uppercase tracking-wider flex-shrink-0">
                    {requiredPlan === 'professional' ? 'PRO' : requiredPlan === 'enterprise' ? 'ENT' : 'ULT'}
                  </span>
                )}
              </button>
              {isLocked && requiredPlan && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
                  Available in {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} - Click to upgrade
                </div>
              )}
            </div>
          )
        })}
        
        {/* Settings */}
        <button
          onClick={() => { onModeChange('settings'); setOpen(false) }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${
            mode === 'settings'
              ? 'bg-red-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
          {mode === 'settings' && (
            <span className="ml-auto text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5 leading-none">ON</span>
          )}
        </button>
        
        {/* Admin Navigation - Only for admin users */}
        {user?.role === 'admin' && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
              Admin
            </p>
            <button
              onClick={() => {
                onModeChange('admin')
                setOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${
                mode === 'admin'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <AdsIcon className="w-4 h-4 flex-shrink-0" />
              Super Admin
              {mode === 'admin' && (
                <span className="ml-auto text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5 leading-none">
                  ON
                </span>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User area */}
      <div className="px-3 pb-5 border-t border-gray-800 pt-3 space-y-0.5">
        {/* Upgrade Plan */}
        <a
          href="/pricing"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 "
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Manage Plan
        </a>

        {/* Profile */}
        <button
          onClick={() => { onModeChange('profile'); setOpen(false) }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'profile'
              ? 'bg-red-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Profile
          {mode === 'profile' && (
            <span className="ml-auto text-[10px] font-semibold bg-white/20 rounded px-1.5 py-0.5 leading-none">ON</span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={() => { logout(); setOpen(false) }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-red-400 hover:text-red-300 hover:bg-gray-800"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-gray-900 border-r border-gray-800 flex-shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile: hamburger button */}
      <button
        className="lg:hidden fixed top-3 left-3 z-40 bg-gray-800 rounded-lg p-2 text-gray-400 hover:text-white"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative w-56 bg-gray-900 border-r border-gray-800 h-full flex flex-col z-10">
            {content}
          </aside>
        </div>
      )}

      {/* Upgrade Modal */}
      {upgradeModal.show && (
        <UpgradeModal
          requiredPlan={upgradeModal.requiredPlan}
          featureName={upgradeModal.feature}
          onClose={() => setUpgradeModal({ show: false, feature: null, requiredPlan: null })}
        />
      )}
    </>
  )
}
