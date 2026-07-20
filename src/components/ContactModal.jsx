import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const REASONS = [
  ['pricing', 'Pricing question'],
  ['station_not_streaming', 'Station not streaming'],
  ['account', 'Account help'],
  ['technical', 'Technical support'],
  ['other', 'Something else'],
]

export default function ContactModal({ onClose }) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [station, setStation] = useState(user?.stationName || '')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    const close = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), reason, station: station.trim(), message: message.trim() }),
      })
      if (!res.ok) throw new Error((await res.text()).trim() || 'Could not send your message')
      setStatus('sent')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div><h2 className="text-xl font-bold text-white">Get in touch</h2><p className="mt-1 text-sm text-gray-400">Tell us what you need help with.</p></div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-gray-500 hover:text-white">×</button>
        </div>
        {status === 'sent' ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl">✓</div>
            <h3 className="font-semibold text-white">Message sent</h3>
            <p className="mt-2 text-sm text-gray-400">Our team will reply to {email}.</p>
            <button onClick={onClose} className="mt-6 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">What can we help with?</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REASONS.map(([value, label]) => <button key={value} type="button" onClick={() => setReason(value)} className={`rounded-lg border px-3 py-2.5 text-left text-sm ${reason === value ? 'border-red-500 bg-red-500/15 text-white' : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'}`}>{label}</button>)}
              </div>
            </div>
            <div><label className="mb-2 block text-sm font-medium text-gray-200">Email address</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500" /></div>
            <div><label className="mb-2 block text-sm font-medium text-gray-200">Station name <span className="text-red-400">*</span></label><input type="text" required maxLength={300} value={station} onChange={(e) => setStation(e.target.value)} placeholder="Enter your station name" className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500" /><p className="mt-1.5 text-xs text-gray-500">This helps us identify the correct station.</p></div>
            <div><label className="mb-2 block text-sm font-medium text-gray-200">Message</label><textarea required minLength={10} maxLength={4000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your question or problem..." className="w-full resize-none rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500" /></div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button disabled={!reason || status === 'sending'} className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">{status === 'sending' ? 'Sending...' : 'Send message'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
