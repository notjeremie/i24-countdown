"use client"
export const dynamic = 'force-static'  // Force le rendu statique

export default function Home() {
  // Votre code de countdown...
}

import CountdownTimer from "../countdown-timer"

export default function Page() {
  return (
    <div>
      <CountdownTimer />
    </div>
  )
}
