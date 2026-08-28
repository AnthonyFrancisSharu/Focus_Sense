import type { Metadata } from 'next'
import './globals.css'
import RootLayoutClient from '@/components/RootLayoutClient'

export const metadata: Metadata = {
  title: 'Real-Time Learner Feedback System',
  description: 'AI-powered learning analytics with facial emotion recognition and gaze tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  )
}
