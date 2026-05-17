import { useState, useEffect, useRef } from 'react'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/chat`

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState('')
  const [nameSet, setNameSet] = useState(false)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setMessages((prev) => [...prev.slice(-99), msg])
      } catch {}
    }

    return () => ws.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ user: username || 'Anon', message: input.trim() }))
    setInput('')
  }

  if (!nameSet) {
    return (
      <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4 h-full min-h-64">
        <h2 className="text-sm font-semibold text-gray-300">Live Chat</h2>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-gray-400 text-sm text-center">Enter a name to join the chat</p>
          <input
            type="text"
            placeholder="Your display name..."
            maxLength={32}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && username.trim() && setNameSet(true)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
            autoFocus
          />
          <button
            onClick={() => username.trim() && setNameSet(true)}
            className="w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Join Chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-2xl flex flex-col h-[300px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-300">Live Chat</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{username}</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-600'}`} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-6">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-red-400 font-medium text-sm">{msg.user}</span>
              <span className="text-gray-600 text-xs">{msg.time}</span>
            </div>
            <p className="text-gray-300 text-sm mt-0.5 break-words">{msg.message}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-800 flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Type a message..."
          maxLength={256}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500 min-w-0"
        />
        <button
          onClick={sendMessage}
          className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-2 transition-colors flex-shrink-0"
          aria-label="Send"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
