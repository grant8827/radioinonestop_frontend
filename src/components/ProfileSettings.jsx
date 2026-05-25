import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B / Soul', 'Electronic / Dance',
  'Jazz', 'Classical', 'Country', 'Latin', 'Reggae',
  'Gospel / Christian', 'News / Talk', 'Sports', 'Podcast', 'Other',
]

function Section({ title, children }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
    />
  )
}

function SaveBtn({ loading, label = 'Save Changes' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? 'Saving…' : label}
    </button>
  )
}

function StatusMsg({ msg }) {
  if (!msg) return null
  const isErr = msg.startsWith('!')
  return (
    <p className={`text-xs mt-2 ${isErr ? 'text-red-400' : 'text-green-400'}`}>
      {isErr ? msg.slice(1) : msg}
    </p>
  )
}

export default function ProfileSettings() {
  const { token, login } = useAuth()
  const logoInputRef = useRef(null)

  // Profile section
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    station_name: '',
    genre: '',
    description: '',
    logo_url: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [listenUrl, setListenUrl] = useState('')

  // Password section
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  // Delete section
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProfileForm({
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          email: d.email || '',
          station_name: d.station_name || '',
          genre: d.genre || '',
          description: d.description || '',
          logo_url: d.logo_url || '',
        })
        if (d.listen_url) setListenUrl(d.listen_url)
      })
      .catch(() => {})
  }, [token])

  function set(field) {
    return (e) => setProfileForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setProfileMsg('!Logo must be an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setProfileMsg('!Logo must be smaller than 2 MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setProfileForm((f) => ({ ...f, logo_url: ev.target.result }))
    reader.readAsDataURL(file)
  }

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg('')
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      })
      if (!res.ok) {
        const text = await res.text()
        setProfileMsg('!' + (text.trim() || 'Failed to save profile'))
        return
      }
      const data = await res.json()
      if (data.token) login(data.token)
      if (data.listen_url) setListenUrl(data.listen_url)
      setProfileMsg('Profile updated successfully')
    } catch {
      setProfileMsg('!Network error')
    } finally {
      setProfileLoading(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwMsg('')
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg('!New passwords do not match')
      return
    }
    if (pwForm.new_password.length < 8) {
      setPwMsg('!New password must be at least 8 characters')
      return
    }
    setPwLoading(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
      })
      if (!res.ok) {
        const text = await res.text()
        setPwMsg('!' + (text.trim() || 'Failed to change password'))
        return
      }
      setPwMsg('Password changed successfully')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch {
      setPwMsg('!Network error')
    } finally {
      setPwLoading(false)
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault()
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleteLoading(true)
    setDeleteMsg('')
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (!res.ok) {
        const text = await res.text()
        setDeleteMsg('!' + (text.trim() || 'Failed to delete account'))
        setDeleteConfirm(false)
        return
      }
      login(null)
      window.location.href = '/'
    } catch {
      setDeleteMsg('!Network error')
      setDeleteConfirm(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 px-4 py-6 lg:px-8">
      <h1 className="text-lg font-bold text-white mb-6">Profile</h1>

      <div className="max-w-lg space-y-5">

        {/* Personal Info + Station Info */}
        <Section title="Personal Info">
          <form onSubmit={handleProfileSave}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="First Name">
                <Input
                  type="text"
                  value={profileForm.first_name}
                  onChange={set('first_name')}
                  placeholder="First name"
                />
              </Field>
              <Field label="Last Name">
                <Input
                  type="text"
                  value={profileForm.last_name}
                  onChange={set('last_name')}
                  placeholder="Last name"
                />
              </Field>
            </div>
            <Field label="Email Address">
              <Input
                type="email"
                value={profileForm.email}
                onChange={set('email')}
                placeholder="you@example.com"
              />
            </Field>

            <div className="mt-5 pt-4 border-t border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Station Info</p>

              <Field label="Station Name">
                <Input
                  type="text"
                  value={profileForm.station_name}
                  onChange={set('station_name')}
                  placeholder="Your station name"
                />
              </Field>

              <Field label="Genre">
                <select
                  value={profileForm.genre}
                  onChange={set('genre')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="">Select a genre…</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>

              <Field label="Description">
                <textarea
                  value={profileForm.description}
                  onChange={set('description')}
                  rows={3}
                  placeholder="Tell listeners about your station…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                />
              </Field>

              <Field label="Station Logo">
                <div className="flex items-center gap-3">
                  {profileForm.logo_url ? (
                    <img
                      src={profileForm.logo_url}
                      alt="Station logo"
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-gray-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 18h16.5M3 9l.75-.75m0 0L4.5 7.5M3.75 8.25L5.25 6.75" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 rounded-lg transition-colors"
                    >
                      {profileForm.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {profileForm.logo_url && (
                      <button
                        type="button"
                        onClick={() => setProfileForm((f) => ({ ...f, logo_url: '' }))}
                        className="ml-2 px-3 py-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-600 mt-1">Max 2 MB, any image format</p>
                  </div>
                </div>
              </Field>
            </div>

            <SaveBtn loading={profileLoading} />
            <StatusMsg msg={profileMsg} />
            {listenUrl && (
              <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Your listener URL</p>
                <p className="text-xs font-mono text-red-400 break-all select-all">{window.location.origin + listenUrl}</p>
              </div>
            )}
          </form>
        </Section>

        {/* Change Password */}
        <Section title="Change Password">
          <form onSubmit={handlePasswordChange}>
            <Field label="Current Password">
              <Input
                type="password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </Field>
            <Field label="New Password">
              <Input
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm New Password">
              <Input
                type="password"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </Field>
            <SaveBtn loading={pwLoading} label="Update Password" />
            <StatusMsg msg={pwMsg} />
          </form>
        </Section>

        {/* Danger Zone */}
        <div className="bg-gray-900 rounded-xl border border-red-900/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-900/40">
            <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="px-5 py-5">
            <p className="text-xs text-gray-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <form onSubmit={handleDeleteAccount}>
              <Field label="Confirm with your password">
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => { setDeletePassword(e.target.value); setDeleteConfirm(false) }}
                  placeholder="Enter your password to confirm"
                  autoComplete="current-password"
                />
              </Field>
              <button
                type="submit"
                disabled={deleteLoading || !deletePassword}
                className="mt-2 px-4 py-2 bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-200 text-sm font-medium rounded-lg border border-red-700 transition-colors"
              >
                {deleteLoading ? 'Deleting…' : deleteConfirm ? 'Click again to confirm deletion' : 'Delete My Account'}
              </button>
              <StatusMsg msg={deleteMsg} />
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}