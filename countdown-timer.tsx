"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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

export default function CountdownTimer() {
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

  // Update specific timer
  const updateTimer = (id: number, updates: Partial<Timer>) => {
    setTimers((prev) => prev.map((timer) => (timer.id === id ? { ...timer, ...updates } : timer)))
  }

  // Handle input change for specific timer
  const handleInputChange = (id: number, value: string) => {
    updateTimer(id, { input: value })
  }

  // Handle label change for specific timer
  const handleLabelChange = (id: number, value: string) => {
    // Allow typing but enforce limits
    const processedValue = value

    // Split into lines
    const lines = processedValue.split("\n")

    // Limit to 2 lines, 5 chars each
    const limitedLines = []
    for (let i = 0; i < Math.min(lines.length, 2); i++) {
      limitedLines.push(lines[i].slice(0, 5))
    }

    updateTimer(id, { label: limitedLines.join("\n") })
  }

  // Handle Enter key press for specific timer
  const handleKeyPress = (id: number, e: React.KeyboardEvent, input: string) => {
    if (e.key === "Enter" && input) {
      const timer = timers[id]
      const mode = timer.selectedMode || "down" // Default to "down" if no mode selected

      const formattedTime = formatInput(input)
      const seconds = timeToSeconds(formattedTime)
      if (seconds > 0) {
        updateTimer(id, {
          timeLeft: seconds, // Start from the entered time for both UP and DOWN
          isInputMode: false,
          isRunning: true,
          isCountingUp: mode === "up",
        })
      }
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
        handleModeSelect(selectedTimer, "up")
      }
      return
    }

    // Handle numpad - key to select DOWN mode
    if (key === "-" || e.code === "NumpadSubtract") {
      if (timer.isInputMode) {
        handleModeSelect(selectedTimer, "down")
      }
      return
    }

    // If timer is running and user presses a number, stop it and reset to input mode
    if (/^\d$/.test(key)) {
      if (!timer.isInputMode) {
        // Stop the running timer and reset it to input mode
        if (intervalRefs.current[selectedTimer]) {
          clearInterval(intervalRefs.current[selectedTimer]!)
          intervalRefs.current[selectedTimer] = null
        }
        updateTimer(selectedTimer, {
          isRunning: false,
          isInputMode: true,
          input: key, // Start with the pressed number
          timeLeft: 0,
          isCountingUp: false,
          selectedMode: null,
          label: timer.label, // Keep the label
        })
      } else {
        // Normal input mode behavior
        const currentInput = timer.input
        if (currentInput.replace(/\D/g, "").length < 6) {
          const newInput = currentInput + key
          handleInputChange(selectedTimer, newInput)
        }
      }
    } else if (key === "Backspace" && timer.isInputMode) {
      handleInputChange(selectedTimer, timer.input.slice(0, -1))
    } else if (key === "Delete") {
      // Reset the selected timer completely
      if (intervalRefs.current[selectedTimer]) {
        clearInterval(intervalRefs.current[selectedTimer]!)
        intervalRefs.current[selectedTimer] = null
      }
      updateTimer(selectedTimer, {
        isRunning: false,
        isInputMode: true,
        input: "",
        timeLeft: 0,
        isCountingUp: false,
        selectedMode: null,
        label: timer.label, // Keep the label
      })
    } else if (key === "Enter" && timer.isInputMode) {
      handleKeyPress(selectedTimer, e, timer.input)
    }
  }

  // Countdown/Countup effect for all timers
  useEffect(() => {
    timers.forEach((timer) => {
      if (timer.isRunning) {
        intervalRefs.current[timer.id] = setInterval(() => {
          setTimers((prev) =>
            prev.map((t) => {
              if (t.id === timer.id) {
                if (t.isCountingUp) {
                  // Count up from the entered time
                  return { ...t, timeLeft: t.timeLeft + 1 }
                } else {
                  // Count down to zero
                  if (t.timeLeft <= 1) {
                    return {
                      ...t,
                      timeLeft: 0,
                      isRunning: false,
                      isInputMode: true,
                      input: "",
                      selectedMode: null,
                      label: "",
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
  }, [timers])

  // Reset specific timer
  const handleReset = (id: number) => {
    if (intervalRefs.current[id]) {
      clearInterval(intervalRefs.current[id]!)
      intervalRefs.current[id] = null
    }
    updateTimer(id, {
      isRunning: false,
      isInputMode: true,
      input: "",
      timeLeft: 0,
      isCountingUp: false,
      selectedMode: null,
      label: "",
    })
  }

  const handleTimerClick = (timerId: number) => {
    setSelectedTimer(timerId)
  }

  // Handle mode selection
  const handleModeSelect = (id: number, mode: "up" | "down") => {
    updateTimer(id, { selectedMode: mode })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle arrow key navigation - works regardless of timer state
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedTimer((prev) => {
          if (prev === null) return 0
          return prev > 0 ? prev - 1 : timers.length - 1
        })
        return
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedTimer((prev) => {
          if (prev === null) return 0
          return prev < timers.length - 1 ? prev + 1 : 0
        })
        return
      }

      // Handle number input for selected timer (works for both running and input mode timers)
      if (selectedTimer !== null) {
        handleNumberInput(e as any)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedTimer, timers])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardContent className="py-8 px-6">
          <div className="space-y-8">
            {timers.map((timer, index) => (
              <div key={timer.id} className="flex items-center justify-center gap-4">
                {/* Label Input */}
                <div className="w-40 h-24 bg-gray-700 border border-gray-600 rounded relative">
                  {editingLabel === timer.id ? (
                    <textarea
                      value={timer.label}
                      onChange={(e) => handleLabelChange(timer.id, e.target.value)}
                      onBlur={() => setEditingLabel(null)}
                      autoFocus
                      className="w-full h-full bg-transparent text-yellow-400 text-4xl font-bold text-center resize-none border-none outline-none p-2"
                      style={{
                        lineHeight: "1.2",
                        overflow: "hidden",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const lines = timer.label.split("\n")
                          if (lines.length >= 2) {
                            e.preventDefault()
                          }
                        }
                        if (e.key === "Escape") {
                          setEditingLabel(null)
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
                      className={`font-mono font-bold p-2 rounded-lg border-2 cursor-pointer text-red-600 text-6xl tracking-tight text-center leading-tight ${
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
                      className={`font-mono font-bold p-2 rounded-lg border-2 cursor-pointer text-red-600 text-6xl tracking-tight text-center leading-tight ${
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

                {/* Control Buttons - Always show UP and DOWN */}
                <div className="flex flex-col gap-2">
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
