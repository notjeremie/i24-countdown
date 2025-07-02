"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileKeywords = ["mobile", "android", "iphone", "ipad", "ipod", "blackberry", "windows phone"]
      const isMobileDevice = mobileKeywords.some((keyword) => userAgent.includes(keyword))

      // Also check screen size as backup
      const isSmallScreen = window.innerWidth <= 768

      return isMobileDevice || isSmallScreen
    }

    const mobile = checkMobile()
    setIsMobile(mobile)

    // If it's a desktop/computer, automatically create a room
    if (!mobile) {
      createRoom()
    }
  }, [])

  const createRoom = async () => {
    setIsCreating(true)
    setError("")
    try {
      // For desktop, try to use CTRLEN as default, or create new if occupied
      const preferredRoom = "CTRLEN"

      // Check if preferred room is available (not actively being used)
      const checkResponse = await fetch(`/api/rooms?roomCode=${preferredRoom}`)
      if (checkResponse.ok) {
        const roomData = await checkResponse.json()
        // If room exists and hasn't been used recently (5 minutes), use it
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        if (roomData.lastActivity < fiveMinutesAgo) {
          router.push(`/timer/${preferredRoom}`)
          return
        }
      }

      // Otherwise create a new room
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      })
      const data = await response.json()
      if (data.roomCode) {
        router.push(`/timer/${data.roomCode}`)
      }
    } catch (error) {
      setError("Failed to create room")
      setIsCreating(false)
    }
  }

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a room code")
      return
    }

    setIsJoining(true)
    setError("")
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", roomCode: joinCode.toUpperCase() }),
      })
      const data = await response.json()
      if (data.success) {
        router.push(`/mobile/${joinCode.toUpperCase()}`)
      } else {
        setError("Room not found")
      }
    } catch (error) {
      setError("Failed to join room")
    } finally {
      setIsJoining(false)
    }
  }

  // Show loading while detecting device type
  if (isMobile === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="text-white text-lg">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading for desktop while auto-creating room
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="text-white text-lg mb-4">Creating your timer room...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            {error && <div className="text-red-400 text-sm mt-4">{error}</div>}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mobile interface - show options
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-center text-white text-2xl">Timer Control</CardTitle>
          <p className="text-center text-gray-400 text-sm">Connect to a timer session</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Access to Default Rooms */}
          <div className="space-y-3">
            <h3 className="text-white text-lg font-semibold">Quick Access</h3>
            <p className="text-gray-400 text-sm">Connect to default control rooms</p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => router.push("/mobile/CTRLFR")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 flex items-center justify-between"
              >
                <span>Control Room FR</span>
                <span className="text-xs bg-purple-800 px-2 py-1 rounded">CTRLFR</span>
              </Button>
              <Button
                onClick={() => router.push("/mobile/CTRLEN")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 flex items-center justify-between"
              >
                <span>Control Room EN</span>
                <span className="text-xs bg-indigo-800 px-2 py-1 rounded">CTRLEN</span>
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-6">
            {/* Create New Room */}
            <div className="space-y-3">
              <h3 className="text-white text-lg font-semibold">Create New Session</h3>
              <p className="text-gray-400 text-sm">Start a new timer session that others can join</p>
              <Button
                onClick={createRoom}
                disabled={isCreating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {isCreating ? "Creating..." : "Create New Session"}
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-6">
            {/* Join Existing Room */}
            <div className="space-y-3">
              <h3 className="text-white text-lg font-semibold">Join Existing Session</h3>
              <p className="text-gray-400 text-sm">Enter the room code from a computer or another device</p>
              <Input
                type="text"
                placeholder="Enter room code (e.g., ABC123)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                maxLength={6}
              />
              <Button
                onClick={joinRoom}
                disabled={isJoining || !joinCode.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              >
                {isJoining ? "Joining..." : "Join Session"}
              </Button>
            </div>
          </div>

          {error && <div className="text-red-400 text-center text-sm">{error}</div>}

          {/* Help Text */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
            💡 Tip: Open this app on a computer to automatically create a session, then use this mobile interface to
            control it remotely.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
