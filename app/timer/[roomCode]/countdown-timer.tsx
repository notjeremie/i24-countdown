"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Timer {
  id: number
  input: string
  timeLeft: number
  isRunning: boolean
  isInputMode: boolean
  isCountingUp: boolean
  selectedMode: "up" | "down" | null
  label: string
}

interface CountdownTimerProps {
  roomCode: string
}

export default function CountdownTimer({ roomCode }: CountdownTimerProps) {
  const [timers, setTimers] = useState<Timer[]>([
    {
      id: 0,
      input: "",
      timeLeft: 0,
      isRunning: false,
      isInputMode: true,
      isCountingUp: false,
      selectedMode: null,
      label: "",
    },
    {
      id: 1,
      input: "",
      timeLeft: 0,
      isRunning: false,
      isInputMode: true,
      isCountingUp: false,
      selectedMode: null,
      label: "",
    },
  ])
  const intervalRefs = useRef<{ [key: number]: NodeJS.Timeout | null }>({})
  const [selectedTimer, setSelectedTimer] = useState<number | null>(0)
  const [editingLabel, setEditingLabel] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 5
  const retryDelay = 1000 // milliseconds
  const eventSourceRef = useRef<EventSource | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate mobile URL and QR code
  const mobileUrl = `${window.location.origin}/mobile/${roomCode}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileUrl)}`

  // Copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
  }

  // Copy mobile URL to clipboard
  const copyMobileUrl = () => {
    navigator.clipboard.writeText(mobileUrl)
  }

  const resetHeartbeat = () => {
    clearTimeout(heartbeatTimeoutRef.current as NodeJS.Timeout)
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.log("Heartbeat timeout: closing connection")
      closeEventSource()
      setConnectionStatus("disconnected")
    }, 5000) // 5 seconds
  }

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  // -----------------------------------------------------------------------------------------------------------------
  // SAFER SSE CONNECTION — silently handles the common "{ isTrusted:true }" browser Event,
  // distinguishes between a transient network error and an explicit server close, and
  // keeps trying forever with exponential back-off (max 30 s) without spamming the log.
  // -----------------------------------------------------------------------------------------------------------------
  const connect = useCallback(() => {
    // clean up any previous stream & heartbeat timer
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    clearTimeout(heartbeatTimeoutRef.current as NodeJS.Timeout)

    setConnectionStatus("connecting")
    console.log("[SSE] connecting …")

    const es = new EventSource(`/api/timers/stream?roomCode=${roomCode}`)
    eventSourceRef.current = es

    // ❶ Heartbeat watchdog – any message (state / update / heartbeat) resets it
    const resetHeartbeat = () => {
      clearTimeout(heartbeatTimeoutRef.current as NodeJS.Timeout)
      heartbeatTimeoutRef.current = setTimeout(() => {
        console.warn("[SSE] heartbeat missed – reconnecting")
        es.close()
        reconnect()
      }, 60_000) // 60 s
    }

    es.onopen = () => {
      console.log("[SSE] open")
      resetHeartbeat()
      setRetryCount(0)
      setIsConnected(true)
      setConnectionStatus("connected")
    }

    es.onmessage = (evt) => {
      resetHeartbeat()

      // Server may occasionally push keep-alive objects
      if (evt.data === "heartbeat") return

      try {
        const data = JSON.parse(evt.data)
        console.log("[Desktop] Received SSE data:", data) // Debug logging

        if (data.type === "connected") {
          console.log("[Desktop] Connection confirmed by server")
        } else if (data.type === "heartbeat") {
          console.log("[Desktop] Heartbeat received")
        } else if (data.type === "state" || data.type === "update" || data.timers) {
          // Update timers state
          if (data.timers) {
            console.log("[Desktop] Updating timers:", data.timers)
            setTimers(data.timers)
          }
          // Update selected timer
          if (data.selectedTimer !== undefined) {
            console.log("[Desktop] Updating selected timer:", data.selectedTimer)
            setSelectedTimer(data.selectedTimer)
          }
        }
      } catch (error) {
        console.error("[Desktop] Failed to parse SSE data:", error, evt.data)
      }
    }

    es.onerror = () => {
      // Most browsers fire an Event object { isTrusted:true }. It is *not* an Exception.
      // When readyState === CLOSED (2) the connection was intentionally closed and will
      // normally auto-reconnect; otherwise treat it as a network hiccup.
      if (es.readyState === EventSource.CLOSED) {
        console.info("[SSE] closed by browser — waiting for automatic retry")
        return
      }

      console.warn("[SSE] network error — forcing reconnect")
      es.close()
      reconnect()
    }

    // helper used by error & heartbeat timeout
    function reconnect() {
      setIsConnected(false)
      setConnectionStatus("disconnected")
      const next = Math.min(1000 * 2 ** retryCount, 30_000)
      setRetryCount((c) => c + 1)
      setTimeout(connect, next)
      console.log(`[SSE] reconnect in ${next / 1000}s (attempt ${retryCount + 1})`)
    }
  }, [roomCode, retryCount])

  useEffect(() => {
    connect()

    // Fetch initial state
    fetch(`/api/timers?roomCode=${roomCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.timers) {
          setTimers(data.timers)
          setSelectedTimer(data.selectedTimer)
        }
      })

    return () => {
      closeEventSource()
      clearTimeout(heartbeatTimeoutRef.current as NodeJS.Timeout)
    }
  }, [roomCode, connect])

  // Send command to server (for keyboard input)
  const sendCommand = useCallback(
    async (command: string, value?: number) => {
      try {
        const payload: any = {
          command,
          roomCode,
          timestamp: Date.now(),
        }

        if (command === "selectTimer") {
          payload.value = value
          payload.timerId = value
        } else if (command === "enter") {
          // Send the actual input value to ensure server uses correct time
          payload.timerId = selectedTimer
          payload.input = timers[selectedTimer || 0]?.input
          payload.selectedMode = timers[selectedTimer || 0]?.selectedMode
        } else {
          payload.timerId = selectedTimer
          if (value !== undefined) {
            payload.value = value
          }
        }

        console.log("[Desktop] Sending command:", payload) // Debug logging

        const response = await fetch("/api/timers/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          console.error("[Desktop] Command failed:", response.status, response.statusText)
        } else {
          console.log("[Desktop] Command sent successfully:", command)
        }
      } catch (error) {
        console.error("Failed to send command:", error)
      }
    },
    [roomCode, selectedTimer, timers],
  )

  // Send updates to server (for direct timer updates)
  const syncToServer = useCallback(
    async (updates: any) => {
      try {
        await fetch("/api/timers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updates, roomCode }),
        })
      } catch (error) {
        console.error("Failed to sync to server:", error)
      }
    },
    [roomCode],
  )

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

  // Convert formatted time to seconds
  const timeToSeconds = (formattedTime: string) => {
    const [hours, minutes, seconds] = formattedTime.split(":").map(Number)
    return hours * 3600 + minutes * 60 + seconds
  }

  // Format seconds to hh:mm:ss
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle input change for specific timer
  const handleInputChange = (id: number, value: string) => {
    // Use command API for real-time sync
    sendCommand("number", Number.parseInt(value.slice(-1)))
  }

  // Handle label change for specific timer
  const handleLabelChange = (id: number, value: string) => {
    const processedValue = value
    const lines = processedValue.split("\n")
    const limitedLines = []
    for (let i = 0; i < Math.min(lines.length, 2); i++) {
      limitedLines.push(lines[i].slice(0, 5))
    }

    // Update local state and sync to server
    const updatedTimers = timers.map((timer) =>
      timer.id === id ? { ...timer, label: limitedLines.join("\n") } : timer,
    )
    setTimers(updatedTimers)
    syncToServer({ timers: updatedTimers, selectedTimer })
  }

  // Handle Enter key press for specific timer
  const handleKeyPress = (id: number, e: React.KeyboardEvent, input: string) => {
    if (e.key === "Enter" && input) {
      sendCommand("enter")
    }
  }

  // Handle number input for specific timer
  const handleNumberInput = (e: React.KeyboardEvent) => {
    if (selectedTimer === null) return

    const timer = timers[selectedTimer]
    const key = e.key

    // Handle numpad + key to select UP mode
    if (key === "+" || e.code === "NumpadAdd") {
      if (timer.isInputMode) {
        sendCommand("modeUp")
      }
      return
    }

    // Handle numpad - key to select DOWN mode
    if (key === "-" || e.code === "NumpadSubtract") {
      if (timer.isInputMode) {
        sendCommand("modeDown")
      }
      return
    }

    // If timer is running and user presses a number, stop it and reset to input mode
    if (/^\d$/.test(key)) {
      if (!timer.isInputMode) {
        sendCommand("delete")
        // Then send the number
        setTimeout(() => sendCommand("number", Number.parseInt(key)), 100)
      } else {
        // Normal input mode behavior
        sendCommand("number", Number.parseInt(key))
      }
    } else if (key === "Backspace" && timer.isInputMode) {
      sendCommand("backspace")
    } else if (key === "Delete") {
      sendCommand("delete")
    } else if (key === "Enter" && timer.isInputMode) {
      sendCommand("enter")
    } else if (key === "Enter" && !timer.isInputMode) {
      sendCommand("pauseResume")
    }
  }

  // Countdown/Countup effect for all timers - PRESERVE LABELS AND SYNC COMPLETION
  useEffect(() => {
    timers.forEach((timer) => {
      if (timer.isRunning) {
        intervalRefs.current[timer.id] = setInterval(() => {
          setTimers((prevTimers) =>
            prevTimers.map((t) => {
              if (t.id === timer.id) {
                if (t.isCountingUp) {
                  return { ...t, timeLeft: t.timeLeft + 1 }
                } else {
                  if (t.timeLeft <= 1) {
                    // Timer finished - preserve the label and sync to server
                    console.log(`Timer ${timer.id} finished, syncing to server`)

                    // Send completion to server immediately
                    fetch("/api/timers/command", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        command: "timerFinished",
                        roomCode,
                        timerId: timer.id,
                        timestamp: Date.now(),
                      }),
                    }).catch((error) => {
                      console.error("Failed to sync timer completion:", error)
                    })

                    return {
                      ...t,
                      timeLeft: 0,
                      isRunning: false,
                      isInputMode: true,
                      input: "",
                      selectedMode: null,
                      // KEEP the label - don't reset it!
                      label: t.label,
                    }
                  }
                  return { ...t, timeLeft: t.timeLeft - 1 }
                }
              }
              return t
            }),
          )
        }, 1000)
      } else {
        if (intervalRefs.current[timer.id]) {
          clearInterval(intervalRefs.current[timer.id]!)
          intervalRefs.current[timer.id] = null
        }
      }
    })

    return () => {
      Object.values(intervalRefs.current).forEach((interval) => {
        if (interval) clearInterval(interval)
      })
    }
  }, [timers, roomCode])

  // Reset specific timer
  const handleReset = (id: number) => {
    sendCommand("delete")
  }

  const handleTimerClick = (timerId: number) => {
    setSelectedTimer(timerId)
    sendCommand("selectTimer", timerId)
  }

  const handleModeSelect = (id: number, mode: "up" | "down") => {
    if (mode === "up") {
      sendCommand("modeUp")
    } else {
      sendCommand("modeDown")
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingLabel !== null) {
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        const newSelected = selectedTimer === null ? 0 : selectedTimer > 0 ? selectedTimer - 1 : timers.length - 1
        setSelectedTimer(newSelected)
        sendCommand("selectTimer", newSelected)
        return
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const newSelected = selectedTimer === null ? 0 : selectedTimer < timers.length - 1 ? selectedTimer + 1 : 0
        setSelectedTimer(newSelected)
        sendCommand("selectTimer", newSelected)
        return
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (selectedTimer !== null) {
          setEditingLabel(selectedTimer)
        }
        return
      }

      if (selectedTimer !== null) {
        handleNumberInput(e as any)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedTimer, timers, editingLabel])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-2 sm:p-4">
      {/* Room Info Header */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-white text-sm font-bold mb-1">Room Code</div>
          <div className="flex items-center">
            <div className="text-yellow-400 text-xl font-mono font-bold mr-2">{roomCode}</div>
            <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
          <div className="text-white text-xs mb-1">
            Status:{" "}
            {connectionStatus === "connected" ? (
              <span className="text-green-500">Connected</span>
            ) : connectionStatus === "connecting" ? (
              <span className="text-yellow-500">Connecting...</span>
            ) : (
              <span className="text-red-500">Disconnected (Retry {retryCount})</span>
            )}
          </div>
          <div className="flex items-center">
            <div
              className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            ></div>
            <span className="text-xs text-gray-400">Desktop</span>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-7xl bg-gray-800 border-gray-700">
        <CardContent className="py-4 sm:py-8 px-2 sm:px-6">
          <div className="space-y-8">
            {timers.map((timer, index) => (
              <div key={timer.id} className="flex items-center justify-center gap-2 sm:gap-4">
                {/* Label Input */}
                <div className="w-24 sm:w-32 md:w-40 h-16 sm:h-20 md:h-24 bg-gray-700 border border-gray-600 rounded relative flex-shrink-0">
                  {editingLabel === timer.id ? (
                    <textarea
                      value={timer.label}
                      onChange={(e) => handleLabelChange(timer.id, e.target.value)}
                      onBlur={() => setEditingLabel(null)}
                      autoFocus
                      className="w-full h-full bg-transparent text-yellow-400 text-xl sm:text-2xl md:text-4xl font-bold text-center resize-none border-none outline-none p-1 sm:p-2"
                      style={{
                        lineHeight: "1.2",
                        overflow: "hidden",
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation()

                        if (e.key === "Enter") {
                          if (e.shiftKey) {
                            const lines = timer.label.split("\n")
                            if (lines.length >= 2) {
                              e.preventDefault()
                            }
                          } else {
                            e.preventDefault()
                            setEditingLabel(null)
                            setSelectedTimer(timer.id)
                          }
                        }
                        if (e.key === "Escape") {
                          setEditingLabel(null)
                          setSelectedTimer(timer.id)
                        }
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-yellow-400 text-4xl font-bold cursor-pointer"
                      onClick={() => setEditingLabel(timer.id)}
                      style={{
                        lineHeight: "1.2",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {timer.label || ""}
                    </div>
                  )}
                </div>

                {/* Timer Display */}
                <div className="flex-1 text-center">
                  {timer.isInputMode ? (
                    <div
                      onClick={() => handleTimerClick(timer.id)}
                      className={`font-mono font-bold p-2 rounded-lg border-2 cursor-pointer text-red-600 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-center leading-tight h-16 sm:h-20 md:h-24 flex items-center justify-center ${
                        selectedTimer === timer.id
                          ? "border-solid border-red-500 bg-gray-700"
                          : "border-dashed border-gray-600 bg-gray-800"
                      }`}
                    >
                      {formatInput(timer.input)}
                    </div>
                  ) : (
                    <div
                      onClick={() => handleReset(timer.id)}
                      className={`font-mono font-bold p-2 rounded-lg border-2 cursor-pointer text-red-600 text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-center leading-tight h-16 sm:h-20 md:h-24 flex items-center justify-center ${
                        timer.timeLeft <= 10 && !timer.isCountingUp
                          ? "bg-red-900/30 animate-pulse border-solid border-red-500"
                          : timer.isCountingUp
                            ? "bg-green-900/30 border-solid border-green-500"
                            : "bg-red-900/30 border-solid border-red-500"
                      } ${
                        selectedTimer === timer.id ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-800" : ""
                      }`}
                    >
                      {formatTime(timer.timeLeft)}
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
                  <Button
                    onClick={() => (timer.isInputMode ? handleModeSelect(timer.id, "up") : undefined)}
                    size="sm"
                    variant={timer.selectedMode === "up" ? "default" : "outline"}
                    disabled={!timer.isInputMode}
                    className={`${
                      timer.selectedMode === "up"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-green-900/30 border-green-500 text-green-400 hover:bg-green-900/50"
                    } ${!timer.isInputMode ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    UP
                  </Button>
                  <Button
                    onClick={() => (timer.isInputMode ? handleModeSelect(timer.id, "down") : undefined)}
                    size="sm"
                    variant={timer.selectedMode === "down" ? "default" : "outline"}
                    disabled={!timer.isInputMode}
                    className={`${
                      timer.selectedMode === "down"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-red-900/30 border-red-500 text-red-400 hover:bg-red-900/50"
                    } ${!timer.isInputMode ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    DOWN
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
