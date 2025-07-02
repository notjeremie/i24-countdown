"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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

interface MobileTimerProps {
  roomCode: string
}

export default function MobileTimer({ roomCode }: MobileTimerProps) {
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
  const [selectedTimer, setSelectedTimer] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("Connecting...")
  const [editingLabel, setEditingLabel] = useState<number | null>(null)
  const [labelInput, setLabelInput] = useState("")
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCommandRef = useRef<number>(0)
  const reconnectAttemptsRef = useRef<number>(0)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activeInputRef = useRef<{ [timerId: number]: number }>({}) // Track active input timestamps
  const inputSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null) // For debounced input sync

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

  // Format seconds to hh:mm:ss
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Sync full input to server (debounced)
  const syncInputToServer = (timerId: number, input: string) => {
    // Clear existing timeout
    if (inputSyncTimeoutRef.current) {
      clearTimeout(inputSyncTimeoutRef.current)
    }

    // Debounce input sync to avoid too many requests
    inputSyncTimeoutRef.current = setTimeout(() => {
      fetch("/api/timers/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "syncInput",
          roomCode,
          timerId,
          input: input,
          timestamp: Date.now(),
        }),
      }).catch((error) => {
        console.error("Failed to sync input:", error)
      })
    }, 150) // 150ms debounce
  }

  // Send command to server with immediate optimistic updates
  const sendCommand = async (command: string, value?: number, targetTimerId?: number) => {
    const now = Date.now()
    const timerId = targetTimerId !== undefined ? targetTimerId : selectedTimer

    // Track active input to prevent server overrides
    if (command === "number" || command === "backspace") {
      activeInputRef.current[timerId] = now
    }

    // IMMEDIATE optimistic updates for instant feedback
    if (command === "selectTimer" && value !== undefined) {
      setSelectedTimer(value)
    } else if (command === "number" && timers[timerId]?.isInputMode) {
      const currentTimer = timers[timerId]
      const currentInput = currentTimer.input
      if (currentInput.replace(/\D/g, "").length < 6) {
        const newInput = currentInput + value.toString()
        setTimers((prev) => prev.map((timer) => (timer.id === timerId ? { ...timer, input: newInput } : timer)))
        // Sync the complete input to server
        syncInputToServer(timerId, newInput)
        return // Don't send individual digit commands
      }
    } else if (command === "backspace" && timers[timerId]?.isInputMode) {
      const newInput = timers[timerId].input.slice(0, -1)
      setTimers((prev) => prev.map((timer) => (timer.id === timerId ? { ...timer, input: newInput } : timer)))
      // Sync the complete input to server
      syncInputToServer(timerId, newInput)
      return // Don't send backspace commands
    } else if (command === "modeUp" && timers[timerId]?.isInputMode) {
      setTimers((prev) =>
        prev.map((timer) => (timer.id === timerId ? { ...timer, selectedMode: "up" as const } : timer)),
      )
    } else if (command === "modeDown" && timers[timerId]?.isInputMode) {
      setTimers((prev) =>
        prev.map((timer) => (timer.id === timerId ? { ...timer, selectedMode: "down" as const } : timer)),
      )
    } else if (command === "delete") {
      setTimers((prev) =>
        prev.map((timer) =>
          timer.id === timerId
            ? {
                ...timer,
                input: "",
                timeLeft: 0,
                isRunning: false,
                isInputMode: true,
                isCountingUp: false,
                selectedMode: null,
              }
            : timer,
        ),
      )
    } else if (command === "enter" && timers[timerId]?.isInputMode && timers[timerId]?.input) {
      const timer = timers[timerId]
      const mode = timer.selectedMode || "down"
      const formattedTime = formatInput(timer.input)
      const seconds = timeToSeconds(formattedTime)
      if (seconds > 0) {
        setTimers((prev) =>
          prev.map((t) =>
            t.id === timerId
              ? { ...t, timeLeft: seconds, isInputMode: false, isRunning: true, isCountingUp: mode === "up" }
              : t,
          ),
        )
      }
    } else if (command === "pauseResume" && !timers[timerId]?.isInputMode) {
      const currentTimer = timers[timerId]
      setTimers((prev) =>
        prev.map((timer) => (timer.id === timerId ? { ...timer, isRunning: !currentTimer.isRunning } : timer)),
      )
    }

    // Send to server in background (don't wait for response)
    const payload: any = {
      command,
      roomCode,
      timestamp: now,
      timerId: timerId,
    }

    if (command === "selectTimer") {
      payload.value = value
      payload.timerId = value
    } else if (command === "enter") {
      // Send the actual input value to ensure server uses correct time
      payload.input = timers[timerId]?.input
      payload.selectedMode = timers[timerId]?.selectedMode
    } else {
      if (value !== undefined) {
        payload.value = value
      }
    }

    // Fire and forget - don't wait for server response
    fetch("/api/timers/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error("Failed to send command:", error)
    })
  }

  // Helper function to convert formatted time to seconds
  const timeToSeconds = (formattedTime: string) => {
    const [hours, minutes, seconds] = formattedTime.split(":").map(Number)
    return hours * 3600 + minutes * 60 + seconds
  }

  // Fetch current state from server
  const fetchCurrentState = async () => {
    try {
      console.log(`Fetching initial state for room ${roomCode}`)
      const response = await fetch(`/api/timers?roomCode=${roomCode}`)
      if (response.ok) {
        const data = await response.json()
        console.log("Received initial state:", data)
        if (data.timers) {
          setTimers(data.timers)
          setSelectedTimer(data.selectedTimer ?? 0)
        }
      } else {
        console.error("Failed to fetch initial state:", response.status)
      }
    } catch (error) {
      console.error("Failed to fetch current state:", error)
    }
  }

  // Connect to real-time updates with improved error handling
  const connectEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Clear any existing timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
    }

    setConnectionStatus("Connecting...")
    console.log(`Attempting to connect to room ${roomCode} (attempt ${reconnectAttemptsRef.current + 1})`)

    const eventSource = new EventSource(`/api/timers/stream?roomCode=${roomCode}`)
    eventSourceRef.current = eventSource

    // Reset heartbeat timeout on any message
    const resetHeartbeatTimeout = () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current)
      }
      // If no message received in 60 seconds, consider connection dead
      heartbeatTimeoutRef.current = setTimeout(() => {
        console.log("No heartbeat received, reconnecting...")
        setIsConnected(false)
        setConnectionStatus("Connection timeout")
        connectEventSource()
      }, 60000)
    }

    eventSource.onopen = () => {
      setIsConnected(true)
      setConnectionStatus("Connected")
      reconnectAttemptsRef.current = 0
      console.log("Connected to event stream")
      resetHeartbeatTimeout()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        resetHeartbeatTimeout()

        if (data.type === "connected") {
          console.log("Connection confirmed by server")
        } else if (data.type === "heartbeat") {
          console.log("Heartbeat received")
        } else if (data.type === "state" || data.type === "update") {
          if (data.timers) {
            // Smart merge: don't override timers that have recent input activity
            const now = Date.now()
            setTimers((prevTimers) => {
              return data.timers.map((serverTimer: Timer, index: number) => {
                const prevTimer = prevTimers[index]
                const lastInput = activeInputRef.current[serverTimer.id] || 0

                // If user has been actively typing in the last 1 second, preserve local input
                if (serverTimer.isInputMode && prevTimer?.isInputMode && now - lastInput < 1000) {
                  console.log(`Preserving local input for timer ${serverTimer.id}: "${prevTimer.input}"`)
                  return {
                    ...serverTimer,
                    input: prevTimer.input, // Keep local input
                  }
                }

                return serverTimer
              })
            })
          }
          if (data.selectedTimer !== undefined) {
            setSelectedTimer(data.selectedTimer)
          }
        }
      } catch (error) {
        console.error("Failed to parse event data:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      setIsConnected(false)

      reconnectAttemptsRef.current++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000) // Exponential backoff, max 30s

      setConnectionStatus(`Reconnecting in ${Math.ceil(delay / 1000)}s... (attempt ${reconnectAttemptsRef.current})`)

      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current)
      }

      // Attempt to reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connectEventSource()
      }, delay)
    }
  }

  // Update timer label using command API for proper sync
  const updateTimerLabel = async (timerId: number, label: string) => {
    try {
      // Process label - limit to 2 lines, 5 chars each
      const lines = label.split("\n")
      const limitedLines = []
      for (let i = 0; i < Math.min(lines.length, 2); i++) {
        limitedLines.push(lines[i].slice(0, 5))
      }
      const processedLabel = limitedLines.join("\n")

      // Update local state immediately
      setTimers((prevTimers) =>
        prevTimers.map((timer) => (timer.id === timerId ? { ...timer, label: processedLabel } : timer)),
      )

      // Use command API for proper real-time sync
      await fetch("/api/timers/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "updateLabel",
          roomCode,
          timerId,
          value: processedLabel,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.error("Failed to update label:", error)
    }
  }

  // Handle timer card selection
  const handleTimerSelect = (timerId: number) => {
    sendCommand("selectTimer", timerId)
  }

  // Handle label editing
  const startEditingLabel = (timerId: number) => {
    setEditingLabel(timerId)
    setLabelInput(timers[timerId]?.label || "")
  }

  const saveLabel = () => {
    if (editingLabel !== null) {
      updateTimerLabel(editingLabel, labelInput)
      setEditingLabel(null)
      setLabelInput("")
    }
  }

  const cancelEditingLabel = () => {
    setEditingLabel(null)
    setLabelInput("")
  }

  // Initialize connection and fetch initial state
  useEffect(() => {
    fetchCurrentState()
    connectEventSource()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current)
      }
      if (inputSyncTimeoutRef.current) {
        clearTimeout(inputSyncTimeoutRef.current)
      }
    }
  }, [roomCode])

  // Add local countdown effect for running timers - PRESERVE LABELS AND SYNC COMPLETION WITH DELAY
  useEffect(() => {
    const intervals: { [key: number]: NodeJS.Timeout } = {}

    timers.forEach((timer) => {
      if (timer.isRunning && !timer.isInputMode) {
        intervals[timer.id] = setInterval(() => {
          setTimers((prevTimers) =>
            prevTimers.map((t) => {
              if (t.id === timer.id && t.isRunning) {
                if (t.isCountingUp) {
                  return { ...t, timeLeft: t.timeLeft + 1 }
                } else {
                  if (t.timeLeft <= 1) {
                    // Timer finished - preserve the label and sync to server with delay
                    console.log(`Timer ${timer.id} finished, will sync to server after delay`)

                    // Send completion to server after a short delay to avoid race conditions
                    setTimeout(() => {
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
                    }, 500) // 500ms delay

                    return {
                      ...t,
                      timeLeft: 0,
                      isRunning: false,
                      isInputMode: true,
                      input: "",
                      selectedMode: null,
                      label: t.label, // Preserve label
                    }
                  }
                  return { ...t, timeLeft: t.timeLeft - 1 }
                }
              }
              return t
            }),
          )
        }, 1000)
      }
    })

    return () => {
      Object.values(intervals).forEach((interval) => {
        if (interval) clearInterval(interval)
      })
    }
  }, [timers, roomCode])

  // Clean up old active input timestamps
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      Object.keys(activeInputRef.current).forEach((timerId) => {
        if (now - activeInputRef.current[Number.parseInt(timerId)] > 5000) {
          delete activeInputRef.current[Number.parseInt(timerId)]
        }
      })
    }, 5000)

    return () => clearInterval(cleanup)
  }, [])

  // Show loading if no timers yet
  if (timers.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-2 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Connecting to room {roomCode}...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    )
  }

  // If editing a label, show the label editor
  if (editingLabel !== null) {
    return (
      <div className="min-h-screen bg-black text-white p-2">
        <div className="mb-2 text-center">
          <div className="text-xs text-gray-400 mb-1">Room: {roomCode}</div>
          <div className="text-lg font-bold">Edit Timer {editingLabel + 1} Label</div>
        </div>

        <Card className="bg-gray-800 border-gray-700 mb-4">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timer Label (max 2 lines, 5 chars each)
                </label>
                <textarea
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Enter label..."
                  className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded p-3 text-lg font-bold text-center resize-none"
                  rows={2}
                  maxLength={11} // 5 + 1 (newline) + 5
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const lines = labelInput.split("\n")
                      if (lines.length >= 2) {
                        e.preventDefault()
                      }
                    }
                  }}
                />
              </div>

              <div className="text-xs text-gray-400 text-center">Preview: {labelInput || "(empty)"}</div>

              <div className="flex gap-3">
                <Button onClick={saveLabel} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3">
                  Save Label
                </Button>
                <Button
                  onClick={cancelEditingLabel}
                  variant="outline"
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-400">
          💡 Tip: Keep labels short and descriptive (e.g., "BREAK", "TALK", "Q&A")
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-2">
      {/* Room Info */}
      <div className="mb-2 text-center">
        <div className="text-xs text-gray-400 mb-1">Room: {roomCode}</div>
        <div className="flex items-center justify-center">
          <div
            className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          ></div>
          <span className="text-xs">{connectionStatus}</span>
        </div>
      </div>

      {/* Timer Displays */}
      <div className="space-y-2 mb-4">
        {timers.map((timer, index) => (
          <Card
            key={timer.id}
            onClick={() => handleTimerSelect(timer.id)}
            className={`bg-gray-800 border-2 cursor-pointer transition-all duration-200 ${
              selectedTimer === timer.id
                ? "border-yellow-400 bg-gray-700 shadow-lg shadow-yellow-400/20"
                : "border-gray-600 hover:border-gray-500"
            }`}
          >
            <CardContent className="p-3">
              <div className="text-center">
                {/* Label - clickable to edit */}
                <div
                  onClick={(e) => {
                    e.stopPropagation() // Prevent timer selection
                    startEditingLabel(timer.id)
                  }}
                  className="min-h-[2rem] flex items-center justify-center mb-2 cursor-pointer hover:bg-gray-700 rounded p-1 transition-colors"
                >
                  {timer.label ? (
                    <div className="text-yellow-400 text-base font-bold whitespace-pre-line">{timer.label}</div>
                  ) : (
                    <div className="text-gray-500 text-sm italic">Tap to add label</div>
                  )}
                </div>

                <div
                  className={`font-mono text-2xl font-bold mb-2 ${
                    timer.isInputMode
                      ? "text-red-600"
                      : timer.isCountingUp
                        ? "text-green-400"
                        : timer.timeLeft <= 10
                          ? "text-red-400 animate-pulse"
                          : "text-red-400"
                  }`}
                >
                  {timer.isInputMode ? formatInput(timer.input) : formatTime(timer.timeLeft)}
                </div>

                {selectedTimer === timer.id && <div className="mt-2 text-yellow-400 text-xs font-bold">● SELECTED</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="space-y-3">
        {/* Mode Selection - with immediate visual feedback */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => sendCommand("modeUp", undefined, selectedTimer)}
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-95 text-white py-4 text-lg font-bold transition-all duration-100"
            disabled={!timers[selectedTimer]?.isInputMode}
          >
            ↑ UP
          </Button>
          <Button
            onClick={() => sendCommand("modeDown", undefined, selectedTimer)}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 active:scale-95 text-white py-4 text-lg font-bold transition-all duration-100"
            disabled={!timers[selectedTimer]?.isInputMode}
          >
            ↓ DOWN
          </Button>
        </div>

        {/* Number Pad - with immediate visual feedback */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              onClick={() => sendCommand("number", num, selectedTimer)}
              className="bg-gray-700 hover:bg-gray-600 active:bg-gray-800 active:scale-95 text-white py-4 text-xl font-bold transition-all duration-100"
            >
              {num}
            </Button>
          ))}
          <Button
            onClick={() => sendCommand("backspace", undefined, selectedTimer)}
            className="bg-gray-700 hover:bg-gray-600 active:bg-gray-800 active:scale-95 text-white py-4 text-lg font-bold transition-all duration-100"
          >
            ⌫
          </Button>
          <Button
            onClick={() => sendCommand("number", 0, selectedTimer)}
            className="bg-gray-700 hover:bg-gray-600 active:bg-gray-800 active:scale-95 text-white py-4 text-xl font-bold transition-all duration-100"
          >
            0
          </Button>
          <Button
            onClick={() => sendCommand("delete", undefined, selectedTimer)}
            className="bg-red-700 hover:bg-red-800 active:bg-red-900 active:scale-95 text-white py-4 text-lg font-bold transition-all duration-100"
          >
            STOP
          </Button>
        </div>

        {/* Action Buttons - Single smart button */}
        <div className="space-y-2">
          <Button
            onClick={() => {
              if (timers[selectedTimer]?.isInputMode) {
                sendCommand("enter", undefined, selectedTimer)
              } else {
                sendCommand("pauseResume", undefined, selectedTimer)
              }
            }}
            className={`w-full py-4 text-xl font-bold transition-all duration-100 active:scale-95 ${
              timers[selectedTimer]?.isInputMode
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                : timers[selectedTimer]?.isRunning
                  ? "bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800"
                  : "bg-green-600 hover:bg-green-700 active:bg-green-800"
            } text-white`}
            disabled={timers[selectedTimer]?.isInputMode && !timers[selectedTimer]?.input}
          >
            {timers[selectedTimer]?.isInputMode ? "RUN" : timers[selectedTimer]?.isRunning ? "PAUSE" : "RESUME"}
          </Button>
        </div>
      </div>
    </div>
  )
}
