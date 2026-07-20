import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import AdsManager from './AdsManager'

export default function SuperAdmin() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 border border-purple-500/30">
        <h1 className="text-2xl font-bold text-white mb-2">Super Admin Dashboard</h1>
        <p className="text-purple-100">Platform management and configuration</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        <TabButton
          active={activeTab === 'messages'}
          onClick={() => setActiveTab('messages')}
          icon={<MessagesIcon />}
          label="Messages"
        />
        <TabButton
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          icon={<UsersIcon />}
          label="Users"
        />
        <TabButton
          active={activeTab === 'pricing'}
          onClick={() => setActiveTab('pricing')}
          icon={<PricingIcon />}
          label="Pricing"
        />
        <TabButton
          active={activeTab === 'marketing'}
          onClick={() => setActiveTab('marketing')}
          icon={<MarketingIcon />}
          label="Marketing"
        />
        <TabButton
          active={activeTab === 'ads'}
          onClick={() => setActiveTab('ads')}
          icon={<AdsIcon />}
          label="Ad Campaigns"
        />
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UsersTab token={token} />}
        {activeTab === 'messages' && <MessagesTab token={token} />}
        {activeTab === 'pricing' && <PricingTab token={token} />}
        {activeTab === 'marketing' && <MarketingTab token={token} />}
        {activeTab === 'ads' && <AdsManager />}
      </div>
    </div>
  )
}

function MessagesTab({ token }) {
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function loadMessages() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(await res.text())
      setMessages(await res.json())
    } catch (err) { setError(err.message || 'Could not load messages') }
    setLoading(false)
  }
  useEffect(() => { loadMessages() }, [token])

  async function sendReply(e) {
    e.preventDefault(); setSending(true); setError('')
    try {
      const res = await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: selected.id, reply }) })
      if (!res.ok) throw new Error((await res.text()).trim())
      setReply(''); setSelected(null); await loadMessages()
    } catch (err) { setError(err.message || 'Could not send reply') }
    setSending(false)
  }

  const labels = { pricing: 'Pricing question', station_not_streaming: 'Station not streaming', account: 'Account help', technical: 'Technical support', other: 'Something else' }
  if (loading) return <div className="py-12 text-center text-gray-400">Loading messages...</div>
  return <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      {messages.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No messages yet.</p>}
      {messages.map((m) => <button key={m.id} onClick={() => { setSelected(m); setReply(''); setError('') }} className={`block w-full border-b border-gray-800 p-4 text-left hover:bg-gray-800 ${selected?.id === m.id ? 'bg-gray-800' : ''}`}>
        <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-white">{m.email}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${m.status === 'replied' ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>{m.status}</span></div>
        <p className="mt-1 text-xs text-purple-400">{labels[m.reason] || m.reason}</p><p className="mt-2 truncate text-xs text-gray-500">{m.message}</p>
      </button>)}
    </div>
    <div className="min-h-80 rounded-xl border border-gray-800 bg-gray-900 p-6">
      {!selected ? <div className="flex h-full items-center justify-center text-sm text-gray-500">Select a message to read it.</div> : <div>
        <div className="border-b border-gray-800 pb-4"><p className="text-xs uppercase tracking-wide text-purple-400">{labels[selected.reason] || selected.reason}</p><h2 className="mt-1 font-semibold text-white">{selected.email}</h2><p className="mt-1 text-xs text-gray-500">{new Date(selected.createdAt).toLocaleString()}</p></div>
        <p className="whitespace-pre-wrap py-6 text-sm leading-6 text-gray-300">{selected.message}</p>
        {selected.adminReply && <div className="mb-5 rounded-lg border border-green-900/40 bg-green-950/20 p-4"><p className="mb-2 text-xs font-semibold text-green-400">Previous reply</p><p className="whitespace-pre-wrap text-sm text-gray-300">{selected.adminReply}</p></div>}
        <form onSubmit={sendReply}><label className="mb-2 block text-sm font-medium text-white">Reply by email</label><textarea required maxLength={4000} rows={5} value={reply} onChange={(e) => setReply(e.target.value)} className="w-full resize-none rounded-lg border border-gray-700 bg-gray-950 p-3 text-sm text-white outline-none focus:border-purple-500" placeholder="Write your reply..." />{error && <p className="mt-2 text-sm text-red-400">{error}</p>}<button disabled={sending || !reply.trim()} className="mt-3 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50">{sending ? 'Sending...' : 'Send email reply'}</button></form>
      </div>}
    </div>
  </div>
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-purple-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Users Management Tab
// ═══════════════════════════════════════════════════════════════════════════

function UsersTab({ token }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Loaded users:', data)
        setUsers(data)
      } else {
        const error = await res.text()
        console.error('Failed to load users - HTTP', res.status, error)
        alert(`Failed to load users: ${res.status} - ${error}`)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      alert(`Error loading users: ${err.message}`)
    }
    setLoading(false)
  }

  async function handleUpdate(userId, updates) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        loadUsers()
        setEditUser(null)
      }
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  async function handleActionChange(user, action) {
    if (!action) return
    setActionLoadingId(user.id)

    const base = {
      plan: user.plan || 'starter',
      billingCycle: user.billingCycle || 'monthly',
      isSuspended: user.isSuspended,
    }

    // Inactive means suspended and reset to starter/monthly until admin re-activates.
    if (action === 'activate') {
      base.isSuspended = false
    } else if (action === 'suspend') {
      base.isSuspended = true
    } else if (action === 'inactive') {
      base.isSuspended = true
      base.plan = 'starter'
      base.billingCycle = 'monthly'
    }

    try {
      await handleUpdate(user.id, base)
    } finally {
      setActionLoadingId('')
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading users...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Station</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Billing</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-800/50">
                <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{user.stationName || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="capitalize text-purple-400">{user.plan || 'starter'}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{user.billingCycle || 'monthly'}</td>
                <td className="px-6 py-4 text-sm">
                  {user.isSuspended ? (
                    <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full border border-red-700/30">
                      Suspended
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-700/30">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <select
                      defaultValue=""
                      disabled={actionLoadingId === user.id}
                      onChange={(e) => {
                        const action = e.target.value
                        e.target.value = ''
                        handleActionChange(user, action)
                      }}
                      className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-2 py-1.5"
                    >
                      <option value="" disabled>
                        {actionLoadingId === user.id ? 'Applying...' : 'Action'}
                      </option>
                      <option value="activate">Activate</option>
                      <option value="suspend">Suspend</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button
                      onClick={() => setEditUser(user)}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  )
}

function EditUserModal({ user, onClose, onSave }) {
  const [plan, setPlan] = useState(user.plan || 'starter')
  const [billingCycle, setBillingCycle] = useState(user.billingCycle || 'monthly')
  const [isSuspended, setIsSuspended] = useState(user.isSuspended || false)

  function handleSubmit(e) {
    e.preventDefault()
    onSave(user.id, { plan, billingCycle, isSuspended })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="text"
              value={user.email}
              disabled
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="starter">Starter - $29/mo</option>
              <option value="professional">Professional - $39/mo</option>
              <option value="enterprise">Enterprise - $59/mo</option>
              <option value="ultimate">Ultimate - $99/mo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Billing Cycle</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly (17% off)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="suspended"
              checked={isSuspended}
              onChange={(e) => setIsSuspended(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="suspended" className="text-sm text-gray-300">
              Suspend account
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Pricing Management Tab
// ═══════════════════════════════════════════════════════════════════════════

function PricingTab({ token }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editPlan, setEditPlan] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    loadPlans()
  }, [])

  async function handleSyncPayPal() {
    if (!confirm('This will create subscription plans in your PayPal account for any plan missing a PayPal Plan ID. Continue?')) {
      return
    }
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/paypal/sync-plans', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = { error: text } }
      if (!res.ok) {
        setSyncResult({ error: data.error || text || `Request failed (${res.status})` })
      } else {
        setSyncResult(data)
        loadPlans()
      }
    } catch (err) {
      setSyncResult({ error: err.message })
    }
    setSyncing(false)
  }

  async function loadPlans() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pricing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPlans(data)
      }
    } catch (err) {
      console.error('Failed to load pricing:', err)
    }
    setLoading(false)
  }

  async function handleUpdate(planData) {
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planData),
      })
      if (res.ok) {
        loadPlans()
        setEditPlan(null)
      }
    } catch (err) {
      console.error('Failed to update pricing:', err)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading pricing...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold mb-1">PayPal Plan Sync</h3>
          <p className="text-sm text-gray-300">
            Auto-create PayPal subscription plans for any package missing a Plan ID. Uses current prices and sale percentages.
          </p>
        </div>
        <button
          onClick={handleSyncPayPal}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          {syncing ? 'Syncing...' : 'Sync to PayPal'}
        </button>
      </div>

      {syncResult && (
        <div className={`rounded-xl p-4 border ${syncResult.error ? 'bg-red-900/20 border-red-800/40' : 'bg-green-900/20 border-green-800/40'}`}>
          {syncResult.error ? (
            <div className="text-sm text-red-300">Error: {syncResult.error}</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-green-300">
                Sync complete ({syncResult.mode} mode) — Product: <code className="text-xs">{syncResult.product_id}</code>
              </div>
              <div className="space-y-1 text-xs">
                {(syncResult.plans || []).map(p => (
                  <div key={p.id} className="flex flex-wrap gap-x-3 text-gray-300">
                    <span className="text-white font-medium capitalize">{p.id}</span>
                    <span className={p.status === 'error' ? 'text-red-400' : p.status === 'created' ? 'text-green-400' : 'text-gray-500'}>
                      {p.status}
                    </span>
                    {p.monthly_plan_id && <span>M: <code>{p.monthly_plan_id}</code></span>}
                    {p.yearly_plan_id && <span>Y: <code>{p.yearly_plan_id}</code></span>}
                    {p.error && <span className="text-red-400 w-full">{p.error}</span>}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className="text-xs text-gray-400 hover:text-white mt-2"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-gray-900 border rounded-xl p-6 ${
              plan.isFeatured ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white capitalize">{plan.name}</h3>
              {plan.isFeatured && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">Featured</span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <div className="text-2xl font-bold text-white">${plan.monthlyPrice}</div>
                <div className="text-xs text-gray-400">per month</div>
              </div>
              <div>
                <div className="text-lg text-gray-300">${plan.yearlyPrice}</div>
                <div className="text-xs text-gray-400">per year</div>
              </div>
            </div>

            {plan.salePercent > 0 && (
              <div className="mb-4 px-3 py-2 bg-green-900/30 border border-green-700/30 rounded-lg">
                <div className="text-sm font-semibold text-green-400">{plan.salePercent}% OFF</div>
              </div>
            )}

            <button
              onClick={() => setEditPlan(plan)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Edit Pricing
            </button>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editPlan && (
        <EditPlanModal
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  )
}

function EditPlanModal({ plan, onClose, onSave }) {
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthlyPrice || 0)
  const [yearlyPrice, setYearlyPrice] = useState(plan.yearlyPrice || 0)
  const [monthlySalePercent, setMonthlySalePercent] = useState(plan.monthlySalePercent || 0)
  const [yearlySalePercent, setYearlySalePercent] = useState(plan.yearlySalePercent || 0)
  const [paypalPlanIdMonthly, setPaypalPlanIdMonthly] = useState(plan.paypalPlanIdMonthly || '')
  const [paypalPlanIdYearly, setPaypalPlanIdYearly] = useState(plan.paypalPlanIdYearly || '')
  const [isFeatured, setIsFeatured] = useState(plan.isFeatured || false)

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      id: plan.id,
      monthlyPrice: parseFloat(monthlyPrice),
      yearlyPrice: parseFloat(yearlyPrice),
      features: plan.features || [],
      monthlySalePercent: parseInt(monthlySalePercent),
      yearlySalePercent: parseInt(yearlySalePercent),
      paypalPlanIdMonthly,
      paypalPlanIdYearly,
      isFeatured,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4 capitalize">Edit {plan.name} Plan</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Yearly Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={yearlyPrice}
              onChange={(e) => setYearlyPrice(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Sale Discount (%)</label>
            <input
              type="number"
              min="0"
              max="80"
              value={monthlySalePercent}
              onChange={(e) => setMonthlySalePercent(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">0 = no sale, shows original price with slash</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Yearly Sale Discount (%)</label>
            <input
              type="number"
              min="0"
              max="80"
              value={yearlySalePercent}
              onChange={(e) => setYearlySalePercent(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">0 = no sale, shows original price with slash</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">PayPal Monthly Plan ID</label>
            <input
              type="text"
              value={paypalPlanIdMonthly}
              onChange={(e) => setPaypalPlanIdMonthly(e.target.value)}
              placeholder="P-XXXXXXXXXXXXXXXXXXXX"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Create in PayPal Dashboard → Subscriptions</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">PayPal Yearly Plan ID</label>
            <input
              type="text"
              value={paypalPlanIdYearly}
              onChange={(e) => setPaypalPlanIdYearly(e.target.value)}
              placeholder="P-XXXXXXXXXXXXXXXXXXXX"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Create in PayPal Dashboard → Subscriptions</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="featured" className="text-sm text-gray-300">
              Featured plan (highlight on pricing page)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Marketing Content Tab
// ═══════════════════════════════════════════════════════════════════════════

function MarketingTab({ token }) {
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [editContent, setEditContent] = useState(null)

  useEffect(() => {
    loadContent()
  }, [])

  async function loadContent() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/marketing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setContent(data)
      }
    } catch (err) {
      console.error('Failed to load marketing content:', err)
    }
    setLoading(false)
  }

  async function handleUpdate(contentData) {
    try {
      const res = await fetch('/api/admin/marketing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contentData),
      })
      if (res.ok) {
        loadContent()
        setEditContent(null)
      }
    } catch (err) {
      console.error('Failed to update marketing content:', err)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading marketing content...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-400">Manage promotional content on public pages</p>
        <button
          onClick={() => setEditContent({ id: '', page: 'landing', section: '', contentType: 'banner', content: '', isActive: true })}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg"
        >
          Add Content
        </button>
      </div>

      <div className="space-y-3">
        {content.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-gray-900 border border-gray-800 rounded-xl">
            No marketing content yet. Click "Add Content" to create promotional banners.
          </div>
        )}

        {content.map((item) => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">{item.page}</span>
                <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">{item.section}</span>
                <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">{item.contentType}</span>
                {item.isActive ? (
                  <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded border border-green-700/30">Active</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">Inactive</span>
                )}
              </div>
              <p className="text-sm text-gray-400 truncate">{item.content}</p>
            </div>
            <button
              onClick={() => setEditContent(item)}
              className="ml-4 text-sm text-purple-400 hover:text-purple-300"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* Edit Content Modal */}
      {editContent && (
        <EditMarketingModal
          content={editContent}
          onClose={() => setEditContent(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  )
}

function EditMarketingModal({ content, onClose, onSave }) {
  const [page, setPage] = useState(content.page || 'landing')
  const [section, setSection] = useState(content.section || '')
  const [contentType, setContentType] = useState(content.contentType || 'banner')
  const [contentText, setContentText] = useState(content.content || '')
  const [isActive, setIsActive] = useState(content.isActive !== undefined ? content.isActive : true)

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      id: content.id,
      page,
      section,
      contentType,
      content: contentText,
      isActive,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full">
        <h3 className="text-xl font-bold text-white mb-4">
          {content.id ? 'Edit Marketing Content' : 'Add Marketing Content'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Page</label>
            <select
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="landing">Landing Page</option>
              <option value="pricing">Pricing Page</option>
              <option value="features">Features Section</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g., hero, footer, sidebar"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="banner">Banner</option>
              <option value="text">Text</option>
              <option value="image">Image URL</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows="4"
              placeholder="Enter banner text, image URL, or HTML content"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="active" className="text-sm text-gray-300">
              Active (display on site)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg"
            >
              Save Content
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Icons
// ═══════════════════════════════════════════════════════════════════════════

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function MessagesIcon() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72A7.45 7.45 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
}

function PricingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function MarketingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  )
}

function AdsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  )
}
