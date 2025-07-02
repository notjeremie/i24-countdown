"use client"

import MobileTimer from "./mobile-timer"

export default function MobileTimerPage({
  params,
}: {
  params: { roomCode: string }
}) {
  const { roomCode } = params

  return <MobileTimer roomCode={roomCode} />
}
