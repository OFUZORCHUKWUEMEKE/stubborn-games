'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Msg = { id: number; kind: 'user' | 'event'; text: string; created_at: string; sender: string | null }

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
    <section aria-label="Bet chat" style={{ border: '1px solid #888', padding: '1rem', marginTop: '2rem' }}>
      <h2>Match chat</h2>

      <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.length === 0 && <p style={{ color: '#888' }}>No messages yet — say something!</p>}
        {messages.map((m) =>
          m.kind === 'event' ? (
            <p key={m.id} style={{ background: '#eef6ff', padding: '0.3rem 0.6rem', fontStyle: 'italic' }}>
              <strong>[match]</strong> {m.text}
            </p>
          ) : (
            <p key={m.id}>
              <strong>{m.sender ?? '???'}</strong>{' '}
              <small style={{ color: '#888' }}>{new Date(m.created_at + 'Z').toLocaleTimeString()}</small>
              <br />
              {m.text}
            </p>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ display: 'grid', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={senderId} onChange={(e) => setSenderId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            maxLength={500}
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={sending}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
        {error && (
          <p role="alert" style={{ color: 'red' }}>
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
