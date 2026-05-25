import { useState } from 'react'

const TABS = [
  { id: 'record', label: 'Record' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('record')

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 px-4 py-6 lg:px-8">
      <h1 className="text-lg font-bold text-white mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Record tab content */}
      {tab === 'record' && (
        <div className="max-w-lg">
          <div className="bg-gray-900 rounded-xl border border-gray-800 px-5 py-8 flex flex-col items-center text-center">
            <svg className="w-10 h-10 text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <p className="text-sm text-gray-400">Record settings coming soon.</p>
          </div>
        </div>
      )}
    </div>
  )
}
