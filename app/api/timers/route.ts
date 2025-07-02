import { type NextRequest, NextResponse } from "next/server"
import { rooms } from "@/lib/rooms"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const roomCode = url.searchParams.get("roomCode")

  if (!roomCode || !rooms.has(roomCode)) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const room = rooms.get(roomCode)
  room.lastActivity = Date.now()
  return NextResponse.json(room)
}

export async function POST(request: NextRequest) {
  const { roomCode, ...updates } = await request.json()

  if (!roomCode || !rooms.has(roomCode)) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const room = rooms.get(roomCode)
  const updatedRoom = { ...room, ...updates, lastActivity: Date.now() }
  rooms.set(roomCode, updatedRoom)

  return NextResponse.json(updatedRoom)
}
