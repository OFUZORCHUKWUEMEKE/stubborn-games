'use client'

import { useState } from 'react'

export default function CopyRoomLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API can be unavailable (non-HTTPS, permissions) — the
      // link is still fully selectable/copyable by hand either way
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={copy}>
      {copied ? 'Copied' : 'Copy for the chat'}
    </button>
  )
}
