import type { NextRequest } from "next/server"
import { rooms } from "@/lib/rooms"

// Store active connections by room
const roomConnections = new Map<string, Set<ReadableStreamDefaultController>>()

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const roomCode = url.searchParams.get("roomCode")

  if (!roomCode) {
    return new Response("Room code required", { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      // Initialize room connections if not exists
      if (!roomConnections.has(roomCode)) {
        roomConnections.set(roomCode, new Set())
      }

      roomConnections.get(roomCode)!.add(controller)
      console.log(`Client connected to room ${roomCode}. Total connections: ${roomConnections.get(roomCode)!.size}`)

      // Send initial connection confirmation
      try {
        controller.enqueue(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`)
      } catch (error) {
        console.error("Failed to send connection confirmation:", error)
      }

      // Send initial state if room exists
      if (rooms.has(roomCode)) {
        const room = rooms.get(roomCode)
        try {
          controller.enqueue(`data: ${JSON.stringify({ ...room, type: "state" })}\n\n`)
        } catch (error) {
          console.error("Failed to send initial state:", error)
        }
      }

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`)
        } catch (error) {
          console.error("Failed to send heartbeat:", error)
          clearInterval(heartbeatInterval)
          const connections = roomConnections.get(roomCode)
          if (connections) {
            connections.delete(controller)
          }
        }
      }, 30000)

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeatInterval)
        const connections = roomConnections.get(roomCode)
        if (connections) {
          connections.delete(controller)
          console.log(`Client disconnected from room ${roomCode}. Remaining connections: ${connections.size}`)
          if (connections.size === 0) {
            roomConnections.delete(roomCode)
          }
        }
        try {
          controller.close()
        } catch (error) {
          // Controller might already be closed
        }
      }

      request.signal.addEventListener("abort", cleanup)

      // Also cleanup on any errors
      controller.error = (error) => {
        console.error("Stream controller error:", error)
        cleanup()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

// Function to broadcast updates to all connections in a specific room
export function broadcastUpdate(data: any, roomCode: string) {
  const connections = roomConnections.get(roomCode)
  if (!connections || connections.size === 0) {
    console.log(`No connections to broadcast to for room ${roomCode}`)
    return
  }

  const message = `data: ${JSON.stringify({ ...data, type: "update", timestamp: Date.now() })}\n\n`
  const deadConnections: ReadableStreamDefaultController[] = []

  connections.forEach((controller) => {
    try {
      controller.enqueue(message)
    } catch (error) {
      console.error("Failed to send message to client:", error)
      deadConnections.push(controller)
    }
  })

  // Remove dead connections
  deadConnections.forEach((controller) => {
    connections.delete(controller)
  })

  console.log(`Broadcasted update to ${connections.size} clients in room ${roomCode}`)
}
