'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Msg = { id: number; kind: 'user' | 'event'; text: string; created_at: string; sender: string | null }

// The design mockup pre-fills who's talking — it never had to solve "who is
// this browser tab" since there's no session/account system to ask instead.
// The real app still needs *some* way to know who's sending, so this keeps a
// sender picker (styled to blend into the chat row) rather than guessing.
const EVENT_EMOJI = /^[⚽🟥🟨🔁]\s*/

function eventVariant(text: string): 'goal' | 'card-red' | 'card-yellow' | 'sys' {
  if (text.startsWith('⚽')) return 'goal'
  if (text.startsWith('🟥')) return 'card-red'
  if (text.startsWith('🟨')) return 'card-yellow'
  return 'sys'
}

export default function BetChat({ betId, members }: { betId: number; members: { id: number; name: string }[] }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [senderId, setSenderId] = useState(members[0]?.id.toString() ?? '')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/bets/${betId}/chat`, { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as { messages: Msg[] }
        setMessages(data.messages)
      }
    } catch {
      // transient failure: keep current messages
    }
  }, [betId])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 10_000) // poll for new messages (user + auto events)
    return () => clearInterval(t)
  }, [refresh])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!senderId) return setError('Choose who is posting.')
    if (!text.trim()) return setError('Message cannot be empty.')
    setSending(true)
    try {
      const res = await fetch(`/api/bets/${betId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: Number(senderId), text: text.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(data.error ?? 'Failed to send')
      } else {
        setText('')
        await refresh()
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-panel" aria-label="Bet chat">
      <div className="chat-head">
        <h2>Room chat</h2>
        <span className="count mono">{members.length} in the room</span>
      </div>

      <div className="chat-list">
        {messages.length === 0 && <p className="hero-note">No messages yet — say something!</p>}
        {messages.map((m) => {
          if (m.kind === 'event') {
            const variant = eventVariant(m.text)
            const displayText = m.text.replace(EVENT_EMOJI, '')
            return (
              <div key={m.id} className={`chat-event ${variant}`}>
                {(variant === 'card-yellow' || variant === 'card-red') && (
                  <span className={`card-chip ${variant === 'card-red' ? 'r' : 'y'}`} />
                )}
                {displayText}
              </div>
            )
          }
          return (
            <div key={m.id} className="chat-msg">
              <span className="who">
                {m.sender ?? '???'} <span className="mono" style={{ opacity: 0.7 }}>{new Date(m.created_at + 'Z').toLocaleTimeString()}</span>
              </span>
              {m.text}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send}>
        <div className="chat-input-row">
          <select
            className="text-input mono"
            style={{ minWidth: 110, flex: '0 0 auto', textAlign: 'left' }}
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input
            className="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={500}
          />
          <button type="submit" className="send-btn" disabled={sending}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
      </form>
    </div>
  )
}
