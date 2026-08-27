import Link from 'next/link'

export default function Home() {
  return (
    <main className="page">
      <div className="home">
        <div className="home-mark">
          SQUAD PICKS<span className="dot">.</span>
        </div>
        <p className="home-line">
          Open a bet on a real match, share the link with your group, and let the room settle it.
        </p>
        <Link href="/bets/new" className="home-action">
          <span className="stamp-button" style={{ display: 'block' }}>
            Open a bet
          </span>
        </Link>
        <p className="home-foot mono">Points only · No accounts · Private rooms</p>
      </div>
    </main>
  )
}
