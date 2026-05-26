import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useAuth } from '../context/AuthContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

// ── Country flag emoji from ISO-3166-1 alpha-2 code ──────────────────────────
function countryFlag(code) {
  if (!code || code.length !== 2 || code === 'XX' || code === 'LC') return '🌐'
  const offset = 127397
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => c.charCodeAt(0) + offset))
}

function formatDuration(secs) {
  if (!secs || secs < 1) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  const accentClass = {
    green:  'border-green-500/30 bg-green-950/20',
    purple: 'border-purple-500/30 bg-purple-950/20',
    blue:   'border-blue-500/30 bg-blue-950/20',
    orange: 'border-orange-500/30 bg-orange-950/20',
  }[accent] ?? 'border-gray-700/50 bg-gray-900/40'

  const dotClass = {
    green:  'bg-green-400',
    purple: 'bg-purple-400',
    blue:   'bg-blue-400',
    orange: 'bg-orange-400',
  }[accent] ?? 'bg-gray-400'

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-2 ${accentClass}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ── Country progress bar row ──────────────────────────────────────────────────
function CountryRow({ code, name, count, pct }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xl w-7 text-center shrink-0">{countryFlag(code)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-200 truncate">{name}</span>
          <span className="text-xs text-gray-400 ml-2 tabular-nums shrink-0">{count}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-500"
            style={{ width: `${Math.max(pct, 1)}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-500 w-10 text-right shrink-0">{pct.toFixed(1)}%</span>
    </div>
  )
}

export default function ListenersPage() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const intervalRef = useRef(null)

  const fetchAnalytics = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      setData(json)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [token])

  useEffect(() => {
    fetchAnalytics()
    intervalRef.current = setInterval(fetchAnalytics, 3000)
    return () => clearInterval(intervalRef.current)
  }, [fetchAnalytics])

  // ── Chart config ─────────────────────────────────────────────────────────
  const chartData = data
    ? {
        labels: data.chart_labels,
        datasets: [
          {
            label: 'Unique Listeners',
            data: data.chart_data,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168,85,247,0.12)',
            pointBackgroundColor: '#a855f7',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      }
    : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#e5e7eb',
        bodyColor: '#9ca3af',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280', font: { size: 11 }, stepSize: 1 },
        min: 0,
      },
    },
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Listener Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">Live data · refreshes every 3 s</p>
        </div>
        {data && (
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            data.live_count > 0
              ? 'bg-green-950/40 border-green-700/40 text-green-400'
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.live_count > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {data.live_count > 0 ? 'On Air' : 'Off Air'}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-3 text-sm text-red-300">
          Failed to load analytics: {error}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Live Now"
          value={data?.live_count ?? '—'}
          sub="active connections"
          accent="green"
        />
        <KpiCard
          label="Today"
          value={data?.daily_sessions ?? '—'}
          sub="unique listeners"
          accent="purple"
        />
        <KpiCard
          label="This Month"
          value={data?.monthly_sessions ?? '—'}
          sub="unique listeners"
          accent="blue"
        />
        <KpiCard
          label="Avg Duration"
          value={data ? formatDuration(data.avg_duration_secs) : '—'}
          sub="per session"
          accent="orange"
        />
      </div>

      {/* ── 6-week trend chart ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">Weekly Listener Trend</h3>
          <p className="text-xs text-gray-500 mt-0.5">Unique listeners per week · last 6 weeks</p>
        </div>
        <div className="px-5 py-5" style={{ height: 220 }}>
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-xs text-gray-600">Loading chart…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Geographic distribution ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">Geographic Distribution</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {data?.live_count > 0
              ? 'Based on active listeners'
              : "Based on today's sessions"}
          </p>
        </div>
        <div className="px-5 py-4">
          {!data || data.countries?.length === 0 ? (
            <p className="text-sm text-gray-600 py-4 text-center">
              No listener data yet — start your stream to see geographic breakdown.
            </p>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {data.countries.map((c) => (
                <CountryRow
                  key={c.code}
                  code={c.code}
                  name={c.name}
                  count={c.count}
                  pct={c.pct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Raw log inspector ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/40 transition-colors"
        >
          <div>
            <h3 className="text-sm font-semibold text-white">Raw Stream Log</h3>
            <p className="text-xs text-gray-500 mt-0.5">Latest 5 session records from the API</p>
          </div>
          <span className="text-gray-500 text-xs">{showRaw ? '▲ collapse' : '▼ expand'}</span>
        </button>
        {showRaw && (
          <div className="border-t border-gray-800 px-5 py-4">
            <pre className="text-xs text-green-400 font-mono bg-gray-950 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {data?.raw_sample
                ? JSON.stringify(data.raw_sample, null, 2)
                : 'No data yet.'}
            </pre>
          </div>
        )}
      </div>

    </div>
  )
}
