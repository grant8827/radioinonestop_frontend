import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import StationModal from '../components/StationModal'

export default function StationsPage() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [liveOnly, setLiveOnly] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/stations')
        if (!r.ok) throw new Error('fetch failed')
        const data = await r.json()
        if (!cancelled && Array.isArray(data)) setStations(data)
      } catch (err) {
        console.error('Failed to load stations:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = stations
    if (liveOnly) list = list.filter(s => s.is_live)
    if (q) {
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.genre || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (a.is_live !== b.is_live) return a.is_live ? -1 : 1
      return (b.listeners || 0) - (a.listeners || 0)
    })
  }, [stations, query, liveOnly])

  const liveCount = stations.filter(s => s.is_live).length

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <Link to="/" className="font-bold text-lg tracking-tight">
            Radio<span className="text-purple-400">InOneStop</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">All Stations</h1>
          <p className="text-gray-500 text-sm">
            {stations.length} station{stations.length !== 1 ? 's' : ''} registered
            {liveCount > 0 && <> • <span className="text-red-400">{liveCount} live now</span></>}
          </p>
        </div>

        {/* Search + Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, genre, or description..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-colors"
            />
          </div>
          <button
            onClick={() => setLiveOnly(v => !v)}
            className={`shrink-0 px-5 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 ${
              liveOnly
                ? 'bg-red-900/30 border-red-700/50 text-red-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${liveOnly ? 'bg-red-400 animate-pulse' : 'bg-gray-500'}`} />
            Live Only
          </button>
        </div>

        {/* Results count */}
        {!loading && query && (
          <p className="text-xs text-gray-500 mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{query}"
          </p>
        )}

        {/* Stations Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading stations...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-2">No stations found</p>
            {(query || liveOnly) && (
              <button
                onClick={() => { setQuery(''); setLiveOnly(false) }}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(station => (
              <div
                key={station.slug}
                onClick={() => setSelectedStation(station)}
                className="group relative rounded-xl border border-white/5 bg-white/3 hover:border-purple-800/60 hover:bg-white/5 transition-all duration-200 overflow-hidden cursor-pointer"
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-[#1a1a2e] border border-white/10 flex items-center justify-center">
                    {station.logo_url ? (
                      <img src={station.logo_url} alt={station.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-purple-400">
                        {station.name?.[0]?.toUpperCase() ?? '♫'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm text-white truncate">{station.name}</h3>
                      {station.is_live && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-900/20 border border-red-900/40 rounded-full px-2 py-0.5">
                          <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    {station.genre && (
                      <p className="text-[10px] text-purple-400 font-semibold mb-1">{station.genre}</p>
                    )}
                    {station.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{station.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-600">
                        {station.listeners} listener{station.listeners !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl">
                  <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 text-white text-sm font-bold shadow-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Listen Now
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedStation && (
        <StationModal station={selectedStation} onClose={() => setSelectedStation(null)} />
      )}
    </div>
  )
}
