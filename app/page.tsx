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
  }, [])

  const createRoom = async () => {
    setIsCreating(true)
    setError("")
    try {
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
    } finally {
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
        router.push(`/timer/${joinCode.toUpperCase()}`)
      } else {
        setError("Room not found")
      }
    } catch (error) {
      setError("Failed to join room")
    } finally {
      setIsJoining(false)
    }
  }

  const connectToDefaultRoom = (roomCode: string) => {
    router.push(`/timer/${roomCode}`)
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

  // Desktop interface - show room selection options
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center text-white text-3xl mb-2">i24 Countdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            {/* Default Control Rooms */}
            <div className="space-y-4">
              <h3 className="text-white text-xl font-semibold text-center">Control Rooms</h3>
              <p className="text-gray-400 text-center">Connect to a default control room for broadcast use</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => connectToDefaultRoom("CTRLFR")}
                  className="h-24 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold flex flex-col items-center justify-center space-y-2 transition-all duration-200 hover:scale-105"
                >
                  <div className="text-xl">🇫🇷 Control Room FR</div>
                  <div className="text-sm bg-purple-800 px-3 py-1 rounded font-mono">CTRLFR</div>
                </Button>

                <Button
                  onClick={() => connectToDefaultRoom("CTRLEN")}
                  className="h-24 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold flex flex-col items-center justify-center space-y-2 transition-all duration-200 hover:scale-105"
                >
                  <div className="text-xl">🇬🇧 Control Room EN</div>
                  <div className="text-sm bg-indigo-800 px-3 py-1 rounded font-mono">CTRLEN</div>
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-8">
              {/* Create New Room */}
              <div className="space-y-4">
                <h3 className="text-white text-xl font-semibold text-center">Create New Session</h3>
                <p className="text-gray-400 text-center">Start a new timer session with a unique room code</p>
                <div className="flex justify-center">
                  <Button
                    onClick={createRoom}
                    disabled={isCreating}
                    className="h-16 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold transition-all duration-200 hover:scale-105"
                  >
                    {isCreating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      "Create New Session"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-8">
              {/* Join Existing Room */}
              <div className="space-y-4">
                <h3 className="text-white text-xl font-semibold text-center">Join Existing Session</h3>
                <p className="text-gray-400 text-center">Enter a room code to join an existing session</p>
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <Input
                    type="text"
                    placeholder="Enter room code (e.g., ABC123)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-lg h-12"
                    maxLength={6}
                  />
                  <Button
                    onClick={joinRoom}
                    disabled={isJoining || !joinCode.trim()}
                    className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white font-bold whitespace-nowrap"
                  >
                    {isJoining ? "Joining..." : "Join Session"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-8">
              {/* Offline Mode */}
              <div className="space-y-4">
                <h3 className="text-white text-xl font-semibold text-center">Offline Mode</h3>
                <p className="text-gray-400 text-center">
                  Use timers locally on this computer only (no remote control)
                </p>
                <div className="flex justify-center">
                  <Button
                    onClick={() => router.push("/offline")}
                    className="h-16 px-8 bg-gray-600 hover:bg-gray-700 text-white text-lg font-bold transition-all duration-200 hover:scale-105"
                  >
                    Start Offline Mode
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500 text-red-400 text-center p-4 rounded-lg">{error}</div>
            )}

            {/* Help Text */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-700">
              💡 <strong>Pro Tip:</strong> Use your mobile device to control timers remotely by connecting to the same
              room code
            </div>
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
          <CardTitle className="text-center text-white text-2xl">i24 Countdown</CardTitle>
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
                <span>🇫🇷 Control Room FR</span>
                <span className="text-xs bg-purple-800 px-2 py-1 rounded">CTRLFR</span>
              </Button>
              <Button
                onClick={() => router.push("/mobile/CTRLEN")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 flex items-center justify-between"
              >
                <span>🇬🇧 Control Room EN</span>
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
        </CardContent>
      </Card>
    </div>
  )
}
