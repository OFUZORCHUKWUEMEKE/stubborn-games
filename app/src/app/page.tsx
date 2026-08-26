import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Squad Picks</h1>
      <p>Open a bet, get a private room link, send it to your group — points MVP.</p>
      <p>
        <Link href="/bets/new">Open a bet →</Link>
      </p>
    </main>
  )
}
