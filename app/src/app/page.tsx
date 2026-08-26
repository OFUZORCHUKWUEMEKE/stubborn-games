import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Squad Picks</h1>
      <p>Private betting app for the squad — points MVP.</p>
      <p>
        <Link href="/bets">All bets</Link> · <Link href="/bets/new">Open a bet →</Link>
      </p>
    </main>
  )
}
