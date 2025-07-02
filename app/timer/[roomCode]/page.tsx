"use client"

import CountdownTimer from "./countdown-timer"

export default function TimerPage({
  params,
}: {
  params: { roomCode: string }
}) {
  const { roomCode } = params

  return <CountdownTimer roomCode={roomCode} />
}
