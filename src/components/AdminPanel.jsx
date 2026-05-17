import { useState } from 'react'

export default function AdminPanel({ config, onSave, onClose }) {
  const [form, setForm] = useState({
    stationName: config?.stationName ?? '',
    hlsBaseURL: config?.hlsBaseURL ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        onSave(form)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {}
    setSaving(false)
  }

  const base = form.hlsBaseURL || 'http://your-server'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Station Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">Station Name</label>
            <input
              type="text"
              name="stationName"
              value={form.stationName}
              onChange={handleChange}
              placeholder="Radio In One Stop"
              className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">HLS Base URL</label>
            <input
              type="url"
              name="hlsBaseURL"
              value={form.hlsBaseURL}
              onChange={handleChange}
              placeholder="https://your-domain.com"
              className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500">
              Derived stream URLs:<br />
              <code className="text-gray-400 break-all">{base}/hls/radio/index.m3u8</code><br />
              <code className="text-gray-400 break-all">{base}/hls/video/index.m3u8</code>
            </p>
          </div>

          {/* RTMP ingest info */}
          <div className="bg-gray-800 rounded-lg px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-medium text-gray-300">OBS / vMix RTMP ingest</p>
            <p className="text-xs text-gray-400">Server: <code className="text-red-400">rtmp://your-server:1935</code></p>
            <p className="text-xs text-gray-400">Stream Key: <code className="text-red-400">radio</code> or <code className="text-red-400">video</code></p>
            <p className="text-xs text-gray-500 mt-1">
              The backend auto-detects the stream key from the RTMP publish path and starts an FFmpeg LL-HLS transcode.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm transition-colors px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
