import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Squad Picks',
  description: 'Open a bet, get a private room link, share it with your group.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
