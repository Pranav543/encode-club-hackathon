// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/lib/web3-config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Streaming Protocol Demo',
  description: 'Advanced Payment Streaming Protocol with Real Blockchain Integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  )
}
