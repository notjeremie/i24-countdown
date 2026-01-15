"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Timer {
  id: number
  input: string
  timeLeft: number
  isRunning: boolean
  isInputMode: boolean
  isCountingUp: boolean
  selectedMode: "up" | "down" | null
  labelId: string
  status: "input" | "playing" | "paused" | "finished"
}

interface Label {
  id: string
  text: string
  order: number
}

export default function NetworkDisplay() {
  const [timers, setTimers] = useState<Timer[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [selectedTimer, setSelectedTimer] = useState<number>(0)
  const [serverUrl, setServerUrl] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("Connecting to local server...")
  const [showManualEntry, setShowManualEntry] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [lastVersion, setLastVersion] = useState(-1)
  const [debugInfo, setDebugInfo] = useState("")

  // Get label text by ID
  const getLabelText = (labelId: string) => {
    if (!labelId) return ""
    const label = labels.find((l) => l.id === labelId)
    return label ? label.text : ""
  }

  // Format seconds to hh:mm:ss
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Format input as hh:mm:ss
  const formatInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6)
    if (digits.length === 0) return "00:00:00"
    if (digits.length === 1) return `00:00:0${digits}`
    if (digits.length === 2) return `00:00:${digits}`
    if (digits.length === 3) return `00:0${digits[0]}:${digits.slice(1)}`
    if (digits.length === 4) return `00:${digits.slice(0, 2)}:${digits.slice(2)}`
    if (digits.length === 5) return `0${digits[0]}:${digits.slice(1, 3)}:${digits.slice(3)}`
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`
  }

  // Auto-connect to current server
  const autoConnectToCurrentServer = async () => {
    try {
      setConnectionStatus("Connecting to local server...")

      // Use the current origin (same server)
      const currentOrigin = window.location.origin
      const testUrl = `${currentOrigin}/api/offline`

      console.log("[Display] Auto-connecting to:", testUrl)

      const response = await fetch(testUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[Display] Auto-connection successful:", data)

      if (data.success && data.timers) {
        setTimers(data.timers)
        setSelectedTimer(data.selectedTimer || 0)
        setLastVersion(data.version || 0)
        setIsConnected(true)
        setConnectionStatus("Connected to local server")
        setServerUrl(currentOrigin) // Set for display purposes

        // Use labels from the main API response if available
        if (data.labels) {
          console.log("[Display] Labels from main API:", data.labels)
          setLabels(data.labels)
        }

        // Start polling for updates
        startPolling(testUrl)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("[Display] Auto-connection failed:", error)
      setConnectionStatus("Local server not available")
      setShowManualEntry(true) // Show manual entry if auto-connect fails
    }
  }

  // Connect to manual server
  const connectToManualServer = async () => {
    if (!serverUrl.trim()) {
      setConnectionStatus("Please enter server URL")
      return
    }

    try {
      setConnectionStatus("Connecting...")

      // Test connection
      const testUrl = serverUrl.endsWith("/") ? `${serverUrl}api/offline` : `${serverUrl}/api/offline`
      const response = await fetch(testUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[Display] Manual connection data:", data)

      if (data.success && data.timers) {
        setTimers(data.timers)
        setSelectedTimer(data.selectedTimer || 0)
        setLastVersion(data.version || 0)
        setIsConnected(true)
        setConnectionStatus("Connected")

        // Use labels from the main API response if available
        if (data.labels) {
          console.log("[Display] Labels from main API:", data.labels)
          setLabels(data.labels)
        } else {
          // Fallback: try to fetch labels separately
          try {
            const labelsUrl = serverUrl.endsWith("/") ? `${serverUrl}api/labels` : `${serverUrl}/api/labels`
            const labelsResponse = await fetch(labelsUrl)
            if (labelsResponse.ok) {
              const labelsData = await labelsResponse.json()
              console.log("[Display] Labels from separate API:", labelsData.labels)
              setLabels(labelsData.labels || [])
            } else {
              console.log("[Display] Labels fetch failed:", labelsResponse.status)
            }
          } catch (error) {
            console.log("[Display] Could not fetch labels:", error)
          }
        }

        // Start polling for updates
        startPolling(testUrl)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("[Display] Manual connection failed:", error)
      setConnectionStatus(`Connection failed: ${error.message}`)
      setIsConnected(false)
    }
  }

  // Start polling for updates with better error handling
  const startPolling = (apiUrl: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    console.log("[Display] Starting polling...")

    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(apiUrl)
        if (response.ok) {
          const data = await response.json()

          // Debug logging
          const debugStr = `V:${data.version || "none"} T1:${data.timers?.[0]?.timeLeft || "none"}/${data.timers?.[0]?.isRunning ? "RUN" : "STOP"} T2:${data.timers?.[1]?.timeLeft || "none"}/${data.timers?.[1]?.isRunning ? "RUN" : "STOP"}`
          setDebugInfo(debugStr)

          if (data.success && data.timers) {
            // Always update - don't rely on version checking for now
            console.log("[Display] Updating timers:", {
              version: data.version,
              timer0: {
                timeLeft: data.timers[0]?.timeLeft,
                isRunning: data.timers[0]?.isRunning,
                labelId: data.timers[0]?.labelId,
              },
              timer1: {
                timeLeft: data.timers[1]?.timeLeft,
                isRunning: data.timers[1]?.isRunning,
                labelId: data.timers[1]?.labelId,
              },
            })

            setTimers(data.timers)
            setSelectedTimer(data.selectedTimer || 0)
            setLastVersion(data.version || 0)
            setConnectionStatus(isConnected ? "Connected" : "Connected to local server")

            // Update labels if provided in response
            if (data.labels) {
              setLabels(data.labels)
            }
          }
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        console.error("[Display] Polling failed:", error)
        setConnectionStatus("Connection lost")
        setIsConnected(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 250) // Faster polling - every 250ms
  }

  // Disconnect
  const disconnect = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus("Disconnected")
    setTimers([])
    setDebugInfo("")
    setShowManualEntry(true) // Show manual entry after disconnect
  }

  // Auto-connect on component mount
  useEffect(() => {
    autoConnectToCurrentServer()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Helper function to check if timer is finished
  const isTimerFinished = (timer: Timer) => {
    return !timer.isRunning && !timer.isInputMode && timer.timeLeft === 0
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-4 md:p-6 space-y-4">
            <h1 className="text-white text-xl md:text-2xl font-bold text-center">Network Display</h1>

            {!showManualEntry ? (
              // Auto-connecting state
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="text-gray-400 text-sm">Connecting to local countdown app...</p>
                <div className="text-center text-sm text-gray-400">
                  Status: <span>{connectionStatus}</span>
                </div>
                <Button
                  onClick={() => setShowManualEntry(true)}
                  variant="outline"
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  Connect to Different Server
                </Button>
              </div>
            ) : (
              // Manual entry state
              <div className="space-y-4">
                <p className="text-gray-400 text-center text-sm">Connect to a countdown app on another computer</p>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">Server URL</label>
                  <Input
                    type="text"
                    placeholder="http://192.168.1.100:3000"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-base"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && serverUrl.trim()) {
                        connectToManualServer()
                      }
                    }}
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Enter the IP address and port of the computer running the countdown app
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowManualEntry(false)
                      autoConnectToCurrentServer()
                    }}
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    Try Local Again
                  </Button>
                  <Button
                    onClick={connectToManualServer}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!serverUrl.trim()}
                  >
                    {connectionStatus === "Connecting..." ? "Connecting..." : "Connect"}
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-400">
                  Status:{" "}
                  <span className={connectionStatus.includes("failed") ? "text-red-400" : ""}>{connectionStatus}</span>
                </div>
              </div>
            )}

            <div className="border-t border-gray-600 pt-4">
              <h3 className="text-white font-semibold mb-2 text-sm md:text-base">How it works:</h3>
              <ul className="text-gray-400 text-xs md:text-sm space-y-1">
                <li>• First tries to connect to the local countdown app automatically</li>
                <li>• If that fails, you can enter a different server's IP address</li>
                <li>• Perfect for displaying timers on a separate screen or device</li>
                <li>• Updates in real-time with the control computer</li>
              </ul>
            </div>

            {/* Mobile-specific tips */}
            <div className="md:hidden border-t border-gray-600 pt-4">
              <h3 className="text-white font-semibold mb-2 text-sm">Mobile Tips:</h3>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Keep this phone/tablet plugged in for long sessions</li>
                <li>• Turn on "Keep screen on" in your device settings</li>
                <li>• Use landscape mode for better visibility</li>
                <li>• Add to home screen for quick access</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-800 p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className="text-sm font-bold">Network Display</span>
          </div>
          <Button
            onClick={disconnect}
            size="sm"
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs px-2 py-1"
          >
            Disconnect
          </Button>
        </div>
        <div className="text-xs text-gray-400 mt-1">{connectionStatus}</div>
        {/* Debug info for mobile */}
        <div className="text-xs text-green-400 mt-1 font-mono">{debugInfo}</div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        {/* Connection Status */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-white text-sm font-bold mb-1">Network Display</div>
            <div className="flex items-center">
              <div
                className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="text-xs text-gray-400">{connectionStatus}</span>
            </div>
            <div className="text-xs text-green-400 mt-1 font-mono">{debugInfo}</div>
          </div>
        </div>

        {/* Disconnect Button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={disconnect}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Timer Display - Mobile Optimized */}
      <div className="md:min-h-screen md:flex md:items-center md:justify-center p-2 md:p-4">
        <div className="w-full max-w-7xl">
          {/* Mobile: Stack timers vertically */}
          <div className="md:hidden space-y-4 pt-2">
            {timers.map((timer, index) => (
              <Card key={timer.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  {/* Timer Label */}
                  <div className="text-center mb-3">
                    <div className="text-yellow-400 text-lg font-bold min-h-[1.5rem]">
                      {getLabelText(timer.labelId) || `Timer ${index + 1}`}
                    </div>
                    {/* Debug info for this timer */}
                    <div className="text-xs text-green-400 font-mono">
                      ID:{timer.labelId} | {timer.isRunning ? "RUN" : "STOP"} | {timer.isInputMode ? "INPUT" : "TIMER"}{" "}
                      | {timer.timeLeft}s
                    </div>
                  </div>

                  {/* Timer Display */}
                  <div className="text-center mb-3">
                    <div
                      className={`font-mono font-bold p-4 rounded-lg border-2 text-3xl sm:text-4xl tracking-tight ${
                        timer.isInputMode
                          ? selectedTimer === timer.id
                            ? "border-solid border-red-500 bg-gray-700 text-red-600"
                            : "border-dashed border-gray-600 bg-gray-800 text-red-600"
                          : timer.timeLeft <= 10 && !timer.isCountingUp && timer.isRunning
                            ? "bg-red-900/30 border-solid border-red-500 text-red-600"
                            : timer.isCountingUp && timer.isRunning
                              ? "bg-green-900/30 border-solid border-green-500 text-green-400"
                              : isTimerFinished(timer)
                                ? "bg-gray-900/50 border-solid border-gray-400 text-gray-400"
                                : timer.isRunning
                                  ? "bg-red-900/30 border-solid border-red-500 text-red-600"
                                  : "bg-gray-700/50 border-solid border-gray-500 text-gray-400"
                      } ${selectedTimer === timer.id ? "ring-2 ring-yellow-400" : ""}`}
                    >
                      {timer.isInputMode ? formatInput(timer.input) : formatTime(timer.timeLeft)}
                    </div>
                  </div>

                  {/* Mode Indicators */}
                  <div className="flex justify-center gap-4">
                    <div
                      className={`px-4 py-2 rounded-lg text-sm font-bold ${
                        timer.selectedMode === "up" || (timer.isCountingUp && !timer.isInputMode)
                          ? "bg-green-600 text-white"
                          : "bg-green-900/30 border border-green-500 text-green-400"
                      }`}
                    >
                      ↑ UP
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg text-sm font-bold ${
                        timer.selectedMode === "down" || (!timer.isCountingUp && !timer.isInputMode)
                          ? "bg-red-600 text-white"
                          : "bg-red-900/30 border border-red-500 text-red-400"
                      }`}
                    >
                      ↓ DOWN
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-center mt-3">
                    <div className="text-xs text-gray-400">
                      {timer.isInputMode
                        ? "Input Mode"
                        : timer.isRunning
                          ? timer.isCountingUp
                            ? "Counting Up"
                            : "Counting Down"
                          : isTimerFinished(timer)
                            ? "Finished"
                            : "Paused"}
                      {selectedTimer === timer.id && " • Selected"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Original horizontal layout */}
          <Card className="hidden md:block bg-gray-800 border-gray-700">
            <CardContent className="py-4 sm:py-8 px-2 sm:px-6">
              <div className="space-y-8">
                {timers.map((timer, index) => (
                  <div key={timer.id} className="flex items-center justify-center gap-2 sm:gap-4">
                    {/* Label Display */}
                    <div className="w-24 sm:w-32 md:w-40 h-16 sm:h-20 md:h-24 bg-gray-700 border border-gray-600 rounded relative flex-shrink-0 flex items-center justify-center">
                      <div className="text-yellow-400 text-xl sm:text-2xl md:text-4xl font-bold text-center">
                        {getLabelText(timer.labelId) || ""}
                      </div>
                    </div>

                    {/* Timer Display */}
                    <div className="flex-1 text-center">
                      <div
                        className={`font-mono font-bold p-2 rounded-lg border-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-center leading-tight h-16 sm:h-20 md:h-24 flex items-center justify-center ${
                          timer.isInputMode
                            ? selectedTimer === timer.id
                              ? "border-solid border-red-500 bg-gray-700 text-red-600"
                              : "border-dashed border-gray-600 bg-gray-800 text-red-600"
                            : timer.timeLeft <= 10 && !timer.isCountingUp && timer.isRunning
                              ? "bg-red-900/30 border-solid border-red-500 text-red-600"
                              : timer.isCountingUp && timer.isRunning
                                ? "bg-green-900/30 border-solid border-green-500 text-green-400"
                                : isTimerFinished(timer)
                                  ? "bg-gray-900/50 border-solid border-gray-400 text-gray-400"
                                  : timer.isRunning
                                    ? "bg-red-900/30 border-solid border-red-500 text-red-600"
                                    : "bg-gray-700/50 border-solid border-gray-500 text-gray-400"
                        } ${selectedTimer === timer.id ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-800" : ""}`}
                      >
                        {timer.isInputMode ? formatInput(timer.input) : formatTime(timer.timeLeft)}
                      </div>
                    </div>

                    {/* Mode Indicators */}
                    <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
                      <div
                        className={`px-3 py-1 rounded text-sm font-bold ${
                          timer.selectedMode === "up" || (timer.isCountingUp && !timer.isInputMode)
                            ? "bg-green-600 text-white"
                            : "bg-green-900/30 border border-green-500 text-green-400"
                        }`}
                      >
                        UP
                      </div>
                      <div
                        className={`px-3 py-1 rounded text-sm font-bold ${
                          timer.selectedMode === "down" || (!timer.isCountingUp && !timer.isInputMode)
                            ? "bg-red-600 text-white"
                            : "bg-red-900/30 border border-red-500 text-red-400"
                        }`}
                      >
                        DOWN
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Footer with Connection Info */}
      <div className="md:hidden bg-gray-800 p-3 border-t border-gray-700 text-center">
        <div className="text-xs text-gray-400">
          Displaying timers from: {serverUrl === window.location.origin ? "Local Server" : serverUrl}
        </div>
      </div>
    </div>
  )
}
