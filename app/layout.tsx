import type React from "react"
import type { Metadata } from "next"
// Remove Inter import to avoid Google Fonts requests
// import { Inter } from 'next/font/google'
import "./globals.css"

// Use system fonts instead
const systemFont = {
  className: "font-sans", // Uses system fonts via Tailwind
}

export const metadata: Metadata = {
  title: "i24 Countdown",
  description: "Professional countdown timer application for live broadcasts and events",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={systemFont.className}>{children}</body>
    </html>
  )
}
