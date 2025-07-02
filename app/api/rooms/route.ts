import { type NextRequest, NextResponse } from "next/server"
import { rooms, generateRoomCode, getDefaultTimerState } from "@/lib/rooms"

export async function POST(request: NextRequest) {
  const { action, roomCode } = await request.json()

  if (action === "create") {
    // Create a new room
    const newRoomCode = generateRoomCode()
    rooms.set(newRoomCode, {
      ...getDefaultTimerState(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    })
    return NextResponse.json({ roomCode: newRoomCode })
  }

  if (action === "join" && roomCode) {
    // Join an existing room
    if (rooms.has(roomCode)) {
      const room = rooms.get(roomCode)
      room.lastActivity = Date.now()
      return NextResponse.json({ success: true, state: room })
    } else {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const roomCode = url.searchParams.get("roomCode")

  if (roomCode && rooms.has(roomCode)) {
    const room = rooms.get(roomCode)
    room.lastActivity = Date.now()
    return NextResponse.json(room)
  }

  return NextResponse.json({ error: "Room not found" }, { status: 404 })
}
