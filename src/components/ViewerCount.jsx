import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ViewerCount() {
  const { token } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!token) return
    const poll = async () => {
      try {
        const res = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setCount(data.live_count ?? 0)
        }
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [token])

  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-400">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      </svg>
      {count} {count === 1 ? 'listener' : 'listeners'}
    </span>
  )
}
