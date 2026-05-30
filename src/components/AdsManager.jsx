import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdsManager() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [placements, setPlacements] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!token) return
    loadData()
  }, [token])

  async function loadData() {
    setLoading(true)
    try {
      const [statsRes, placementsRes, campaignsRes] = await Promise.all([
        fetch('/api/ads/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/ads/placements', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/ads/campaigns', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (placementsRes.ok) setPlacements(await placementsRes.json())
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json())
    } catch (err) {
      console.error('Failed to load ads data:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading advertising platform...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Advertising Platform</h1>
          <p className="text-sm text-gray-400 mt-1">Manage ad campaigns and track performance</p>
        </div>
        <button 
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          onClick={() => setActiveTab('create')}
        >
          + New Campaign
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Campaigns"
            value={stats.activeCampaigns}
            icon="📊"
            color="purple"
          />
          <StatCard
            label="Total Impressions"
            value={stats.totalImpressions.toLocaleString()}
            icon="👁️"
            color="blue"
          />
          <StatCard
            label="Total Clicks"
            value={stats.totalClicks.toLocaleString()}
            icon="🖱️"
            color="green"
          />
          <StatCard
            label="Est. Monthly Revenue"
            value={`$${stats.estRevenue.toFixed(2)}`}
            icon="💰"
            color="yellow"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-6">
          {['overview', 'campaigns', 'placements', 'create'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab stats={stats} campaigns={campaigns} />}
        {activeTab === 'campaigns' && <CampaignsTab campaigns={campaigns} onRefresh={loadData} token={token} />}
        {activeTab === 'placements' && <PlacementsTab placements={placements} />}
        {activeTab === 'create' && <CreateCampaignTab placements={placements} onSuccess={loadData} token={token} onCancel={() => setActiveTab('campaigns')} />}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    purple: 'from-purple-900/30 to-purple-800/10 border-purple-700/30',
    blue: 'from-blue-900/30 to-blue-800/10 border-blue-700/30',
    green: 'from-green-900/30 to-green-800/10 border-green-700/30',
    yellow: 'from-yellow-900/30 to-yellow-800/10 border-yellow-700/30',
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

function OverviewTab({ stats, campaigns }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Overview</h3>
        {stats && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Click-Through Rate (CTR)</span>
              <span className="text-white font-medium">{stats.avgCTR.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Active Ad Placements</span>
              <span className="text-white font-medium">{activeCampaigns.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Campaigns</span>
              <span className="text-white font-medium">{campaigns.length}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Campaigns</h3>
        {campaigns.length === 0 ? (
          <p className="text-gray-400 text-sm">No campaigns yet. Create your first one!</p>
        ) : (
          <div className="space-y-3">
            {campaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <div className="text-white font-medium">{campaign.advertiserName}</div>
                  <div className="text-xs text-gray-400">{campaign.placementName}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${
                    campaign.status === 'active' ? 'text-green-400' : 
                    campaign.status === 'draft' ? 'text-gray-400' : 'text-yellow-400'
                  }`}>
                    {campaign.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">${campaign.price}/mo</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignsTab({ campaigns, onRefresh, token }) {
  async function handleStatusToggle(campaignId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Failed to update campaign:', err)
    }
  }

  async function handleDelete(campaignId) {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Placement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Impressions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Clicks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">CTR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {campaigns.map((campaign) => {
              const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100).toFixed(2) : '0.00'
              return (
                <tr key={campaign.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{campaign.advertiserName}</div>
                    <div className="text-xs text-gray-400">{campaign.assetType}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{campaign.placementName}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">${campaign.price}/mo</div>
                    {campaign.discountPercent > 0 && (
                      <div className="text-xs text-green-400">{campaign.discountPercent}% off</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{campaign.impressions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{campaign.clicks.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{ctr}%</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      campaign.status === 'active' ? 'bg-green-900/30 text-green-400 border border-green-700/30' :
                      campaign.status === 'draft' ? 'bg-gray-700/30 text-gray-400 border border-gray-600/30' :
                      'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleStatusToggle(campaign.id, campaign.status)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      {campaign.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No campaigns yet. Create your first campaign to get started!
          </div>
        )}
      </div>
    </div>
  )
}

function PlacementsTab({ placements }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {placements.map((placement) => (
        <div key={placement.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{placement.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{placement.description}</p>
            </div>
            <span className="px-3 py-1 bg-purple-900/30 text-purple-400 text-xs font-medium rounded-full border border-purple-700/30">
              {placement.placement}
            </span>
          </div>
          
          {placement.width > 0 && (
            <div className="text-sm text-gray-400 mb-3">
              Dimensions: {placement.width}x{placement.height}px
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <div className="text-2xl font-bold text-white">${placement.basePrice}<span className="text-sm text-gray-400 font-normal">/month</span></div>
            <div className={`text-xs font-medium ${placement.active ? 'text-green-400' : 'text-gray-500'}`}>
              {placement.active ? 'Available' : 'Unavailable'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CreateCampaignTab({ placements, onSuccess, token, onCancel }) {
  const [form, setForm] = useState({
    placementId: '',
    advertiserName: '',
    targetUrl: '',
    assetType: 'Flyer',
    assetUrl: '',
    assetName: '',
    price: 0,
    discountPercent: 0,
  })
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        onSuccess()
        onCancel()
      }
    } catch (err) {
      console.error('Failed to create campaign:', err)
    }
    setSaving(false)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">Create New Campaign</h3>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Advertiser Name *</label>
          <input
            type="text"
            name="advertiserName"
            value={form.advertiserName}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            placeholder="e.g. NeoCyber Clothing"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Ad Placement *</label>
          <select
            name="placementId"
            value={form.placementId}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">Select a placement</option>
            {placements.map(p => (
              <option key={p.id} value={p.id}>{p.name} - ${p.basePrice}/mo</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Target URL</label>
          <input
            type="url"
            name="targetUrl"
            value={form.targetUrl}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Asset Type *</label>
          <select
            name="assetType"
            value={form.assetType}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="Flyer">Flyer (Image)</option>
            <option value="Video">Video</option>
            <option value="Audio">Audio</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Asset URL (temporary)</label>
          <input
            type="text"
            name="assetUrl"
            value={form.assetUrl}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            placeholder="https://example.com/ad-image.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">File upload coming soon - use external URL for now</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Price *</label>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Discount % (optional)</label>
          <input
            type="number"
            name="discountPercent"
            value={form.discountPercent}
            onChange={handleChange}
            min="0"
            max="80"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
