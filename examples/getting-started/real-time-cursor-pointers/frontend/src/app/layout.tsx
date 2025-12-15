import type { Metadata } from 'next'
import './globals.css'
import { StreamProvider } from '@/components/StreamProvider'

export const metadata: Metadata = {
  title: 'Real-time Cursor Demo | Motia',
  description: 'Real-time cursor sharing for collaborative applications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-zinc-900 antialiased">
        <StreamProvider>
          {children}
        </StreamProvider>
      </body>
    </html>
  )
}
