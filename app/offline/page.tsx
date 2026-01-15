"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Timer {
  id: number
  input: string
  timeLeft: number
  isRunning: boolean
  isInputMode: boolean
  isCountingUp: boolean
  selectedMode: "up" | "down" | null
  labelId: string
}

interface Label {
  id: string
  text: string
  order: number
}

export default function OfflineTimer() {
  const [timers, setTimers] = useState<Timer[]>([
    {
      id: 0,
      input: "",
      timeLeft: 0,
      isRunning: false,
      isInputMode: true,
      isCountingUp: false,
      selectedMode: null,
      labelId: "",
    },
    {
      id: 1,
      input: "",
      timeLeft: 0,
      isRunning: false,
      isInputMode: true,
      isCountingUp: false,
      selectedMode: null,
      labelId: "",
    },
  ])
  const [labels, setLabels] = useState<Label[]>([])
  const intervalRefs = useRef<{ [key: number]: NodeJS.Timeout | null }>({})
  const [selectedTimer, setSelectedTimer] = useState<number | null>(0)
  const [showDebug, setShowDebug] = useState(false)
  const lastSyncTime = useRef<{ [key: number]: number }>({}) // Track when we last synced each timer
  const lastLocalUpdate = useRef<{ [key: number]: number }>({}) // Track local updates to prevent sync override
  const lastApiState = useRef<{ [key: number]: Timer }>({}) // Track last known API state
  // Add version tracking at the top with other refs
  const lastKnownVersion = useRef<number>(-1)

  // Fetch labels on component mount
  useEffect(() => {
    fetchLabels()
  }, [])

  const fetchLabels = async () => {
    try {
      const response = await fetch("/api/labels")
      if (response.ok) {
        const data = await response.json()
        setLabels(data.labels || [])
      }
    } catch (error) {
      console.error("Failed to fetch labels:", error)
    }
  }

  // Get label text by ID
  const getLabelText = (labelId: string) => {
    if (labelId === "none" || labelId === "") return ""
    const label = labels.find((l) => l.id === labelId)
    return label ? label.text : ""
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

  // Helper function to check if timer is finished
  const isTimerFinished = (timer: Timer) => {
    return !timer.isRunning && !timer.isInputMode && timer.timeLeft === 0
  }

  // Simplified update - no complex syncing
  const updateTimer = (id: number, updates: Partial<Timer>) => {
    // Track local updates to prevent sync override
    lastLocalUpdate.current[id] = Date.now()
    setTimers((prevTimers) => prevTimers.map((timer) => (timer.id === id ? { ...timer, ...updates } : timer)))
  }

  // Handle input change for specific timer
  const handleInputChange = (id: number, value: string) => {
    updateTimer(id, { input: value })
  }

  // Handle label change for specific timer
  const handleLabelChange = (id: number, labelId: string) => {
    updateTimer(id, { labelId })
  }

  // Handle Enter key press for specific timer
  const handleKeyPress = (id: number, e: React.KeyboardEvent, input: string) => {
    if (e.key === "Enter") {
      const timer = timers[id]
      const formattedTime = formatInput(input)
      const seconds = timeToSeconds(formattedTime)

      if (seconds === 0) {
        updateTimer(id, {
          timeLeft: 0,
          isInputMode: false,
          isRunning: true,
          isCountingUp: true,
        })
      } else {
        const mode = timer.selectedMode || "down"
        updateTimer(id, {
          timeLeft: seconds,
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

    if (key === "+" || e.code === "NumpadAdd") {
      if (timer.isInputMode) {
        handleModeSelect(selectedTimer, "up")
      }
      return
    }

    if (key === "-" || e.code === "NumpadSubtract") {
      if (timer.isInputMode) {
        handleModeSelect(selectedTimer, "down")
      }
      return
    }

    if (/^\d$/.test(key)) {
      // FIXED: Handle all non-input states (running, paused, finished)
      if (!timer.isInputMode) {
        // Stop any running timer and switch to input mode
        if (intervalRefs.current[selectedTimer]) {
          clearInterval(intervalRefs.current[selectedTimer]!)
          intervalRefs.current[selectedTimer] = null
        }

        console.log(`[Input] Switching timer ${selectedTimer} to input mode, starting with: ${key}`)

        updateTimer(selectedTimer, {
          isRunning: false,
          isInputMode: true,
          input: key, // Start with the pressed number
          timeLeft: 0,
          isCountingUp: false,
          selectedMode: null,
          labelId: timer.labelId, // Preserve label
        })
        return
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
      // FIXED: Reset timer but PRESERVE the label
      if (intervalRefs.current[selectedTimer]) {
        clearInterval(intervalRefs.current[selectedTimer]!)
        intervalRefs.current[selectedTimer] = null
      }

      console.log(`[Delete] Resetting timer ${selectedTimer} to input mode - PRESERVING LABEL`)

      updateTimer(selectedTimer, {
        isRunning: false,
        isInputMode: true,
        input: "",
        timeLeft: 0,
        isCountingUp: false,
        selectedMode: null,
        labelId: timer.labelId, // PRESERVE THE LABEL
      })
    } else if (key === "Enter" && timer.isInputMode) {
      handleKeyPress(selectedTimer, e as any, timer.input)
    } else if (key === "Enter" && !timer.isInputMode) {
      // FIXED: Handle finished timers - start count-up from 0
      if (isTimerFinished(timer)) {
        console.log(`[Enter] Timer ${selectedTimer} is finished, starting count-up from 0`)
        updateTimer(selectedTimer, {
          timeLeft: 0,
          isRunning: true,
          isInputMode: false,
          isCountingUp: true,
          selectedMode: "up",
          labelId: timer.labelId, // Preserve label
        })
      } else if (timer.timeLeft > 0) {
        // Only allow pause/resume if timer has time left
        updateTimer(selectedTimer, {
          isRunning: !timer.isRunning,
        })
      }
    }
  }

  useEffect(() => {
    const timer = timers[0]
    const shouldHaveInterval = timer.isRunning && !timer.isInputMode
    const hasInterval = intervalRefs.current[0] !== null

    if (shouldHaveInterval && !hasInterval) {
      console.log(
        `[Timer 0] Starting countdown - counting ${timer.isCountingUp ? "UP" : "DOWN"} from ${timer.timeLeft}`,
      )

      const startTime = Date.now()
      const initialTimeLeft = timer.timeLeft

      setTimers((prevTimers) =>
        prevTimers.map((t) => {
          if (t.id === 0 && t.isRunning) {
            if (t.isCountingUp) {
              const newTime = t.timeLeft + 1
              lastLocalUpdate.current[0] = Date.now()
              return { ...t, timeLeft: newTime }
            } else {
              const newTime = t.timeLeft - 1
              if (newTime <= 0) {
                console.log(`[Timer 0] Finished countdown - FINISHED STATE`)

                fetch("/api/offline", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "timerFinished",
                    timerId: 0,
                  }),
                }).catch(() => {})

                lastLocalUpdate.current[0] = Date.now()
                return {
                  ...t,
                  timeLeft: 0,
                  isRunning: false,
                  isInputMode: false,
                  input: "",
                  selectedMode: null,
                  labelId: t.labelId,
                }
              }
              lastLocalUpdate.current[0] = Date.now()
              return { ...t, timeLeft: newTime }
            }
          }
          return t
        }),
      )

      intervalRefs.current[0] = setInterval(() => {
        setTimers((prevTimers) =>
          prevTimers.map((t) => {
            if (t.id === 0 && t.isRunning) {
              const elapsedMs = Date.now() - startTime
              const elapsedSeconds = Math.floor(elapsedMs / 1000) + 1 // +1 because we already did first tick

              if (t.isCountingUp) {
                const newTime = initialTimeLeft + elapsedSeconds
                lastLocalUpdate.current[0] = Date.now()
                return { ...t, timeLeft: newTime }
              } else {
                const newTime = initialTimeLeft - elapsedSeconds
                if (newTime <= 0) {
                  console.log(`[Timer 0] Finished countdown - FINISHED STATE`)

                  // Send completion to API
                  fetch("/api/offline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "timerFinished",
                      timerId: 0,
                    }),
                  }).catch(() => {})

                  lastLocalUpdate.current[0] = Date.now()
                  return {
                    ...t,
                    timeLeft: 0,
                    isRunning: false,
                    isInputMode: false,
                    input: "",
                    selectedMode: null,
                    labelId: t.labelId,
                  }
                }
                lastLocalUpdate.current[0] = Date.now()
                return { ...t, timeLeft: newTime }
              }
            }
            return t
          }),
        )
      }, 1000)
    } else if (!shouldHaveInterval && hasInterval) {
      console.log(`[Timer 0] Stopping countdown`)
      clearInterval(intervalRefs.current[0]!)
      intervalRefs.current[0] = null
    }
  }, [timers[0]])

  useEffect(() => {
    const timer = timers[1]
    const shouldHaveInterval = timer.isRunning && !timer.isInputMode
    const hasInterval = intervalRefs.current[1] !== null

    if (shouldHaveInterval && !hasInterval) {
      console.log(
        `[Timer 1] Starting countdown - counting ${timer.isCountingUp ? "UP" : "DOWN"} from ${timer.timeLeft}`,
      )

      const startTime = Date.now()
      const initialTimeLeft = timer.timeLeft

      setTimers((prevTimers) =>
        prevTimers.map((t) => {
          if (t.id === 1 && t.isRunning) {
            if (t.isCountingUp) {
              const newTime = t.timeLeft + 1
              lastLocalUpdate.current[1] = Date.now()
              return { ...t, timeLeft: newTime }
            } else {
              const newTime = t.timeLeft - 1
              if (newTime <= 0) {
                console.log(`[Timer 1] Finished countdown - FINISHED STATE`)

                fetch("/api/offline", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "timerFinished",
                    timerId: 1,
                  }),
                }).catch(() => {})

                lastLocalUpdate.current[1] = Date.now()
                return {
                  ...t,
                  timeLeft: 0,
                  isRunning: false,
                  isInputMode: false,
                  input: "",
                  selectedMode: null,
                  labelId: t.labelId,
                }
              }
              lastLocalUpdate.current[1] = Date.now()
              return { ...t, timeLeft: newTime }
            }
          }
          return t
        }),
      )

      intervalRefs.current[1] = setInterval(() => {
        setTimers((prevTimers) =>
          prevTimers.map((t) => {
            if (t.id === 1 && t.isRunning) {
              const elapsedMs = Date.now() - startTime
              const elapsedSeconds = Math.floor(elapsedMs / 1000) + 1 // +1 because we already did first tick

              if (t.isCountingUp) {
                const newTime = initialTimeLeft + elapsedSeconds
                lastLocalUpdate.current[1] = Date.now()
                return { ...t, timeLeft: newTime }
              } else {
                const newTime = initialTimeLeft - elapsedSeconds
                if (newTime <= 0) {
                  console.log(`[Timer 1] Finished countdown - FINISHED STATE`)

                  // Send completion to API
                  fetch("/api/offline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "timerFinished",
                      timerId: 1,
                    }),
                  }).catch(() => {})

                  lastLocalUpdate.current[1] = Date.now()
                  return {
                    ...t,
                    timeLeft: 0,
                    isRunning: false,
                    isInputMode: false,
                    input: "",
                    selectedMode: null,
                    labelId: t.labelId,
                  }
                }
                lastLocalUpdate.current[1] = Date.now()
                return { ...t, timeLeft: newTime }
              }
            }
            return t
          }),
        )
      }, 1000)
    } else if (!shouldHaveInterval && hasInterval) {
      console.log(`[Timer 1] Stopping countdown`)
      clearInterval(intervalRefs.current[1]!)
      intervalRefs.current[1] = null
    }
  }, [timers[1]])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach((interval) => {
        if (interval) clearInterval(interval)
      })
    }
  }, [])

  // Reset specific timer - PRESERVE the label
  const handleReset = (id: number) => {
    if (intervalRefs.current[id]) {
      clearInterval(intervalRefs.current[id]!)
      intervalRefs.current[id] = null
    }

    console.log(`[Reset] Resetting timer ${id} to input mode - PRESERVING LABEL`)

    setTimers((prevTimers) =>
      prevTimers.map((timer) =>
        timer.id === id
          ? {
              ...timer,
              isRunning: false,
              isInputMode: true, // ALWAYS go to input mode
              input: "",
              timeLeft: 0,
              isCountingUp: false,
              selectedMode: null,
              labelId: timer.labelId, // PRESERVE THE LABEL
            }
          : timer,
      ),
    )

    // API call
    fetch("/api/offline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reset",
        timerId: id,
      }),
    }).catch(() => {})
  }

  const handleTimerClick = (timerId: number) => {
    setSelectedTimer(timerId)
  }

  const handleModeSelect = (id: number, mode: "up" | "down") => {
    updateTimer(id, { selectedMode: mode })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (selectedTimer !== null) {
        handleNumberInput(e as any)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedTimer, timers])

  // PRECISE VERSION-BASED SYNC - Only sync timers that actually changed
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/offline")
        if (response.ok) {
          const apiState = await response.json()

          // Check if version changed
          if (apiState.version !== lastKnownVersion.current) {
            console.log(`[SYNC] 🔥 Version changed: ${lastKnownVersion.current} → ${apiState.version}`)

            // Update version tracking
            lastKnownVersion.current = apiState.version

            // PRECISE SYNC: Only sync timers that actually have differences
            setTimers((prevTimers) => {
              return prevTimers.map((localTimer, index) => {
                const apiTimer = apiState.timers[index]
                if (!apiTimer) return localTimer

                const now = Date.now()
                const lastUpdate = lastLocalUpdate.current[index] || 0
                const timeSinceUpdate = now - lastUpdate

                // Check if this specific timer has any differences
                const hasInputModeChange = localTimer.isInputMode !== apiTimer.isInputMode
                const hasRunningChange = localTimer.isRunning !== apiTimer.isRunning
                const hasInputChange = localTimer.input !== apiTimer.input
                const hasLabelChange = localTimer.labelId !== apiTimer.labelId
                const hasModeChange = localTimer.selectedMode !== apiTimer.selectedMode
                const hasCountingChange = localTimer.isCountingUp !== apiTimer.isCountingUp
                const hasTimeChange = Math.abs(localTimer.timeLeft - apiTimer.timeLeft) > 2

                // If no differences, don't sync this timer
                if (
                  !hasInputModeChange &&
                  !hasRunningChange &&
                  !hasInputChange &&
                  !hasLabelChange &&
                  !hasModeChange &&
                  !hasCountingChange &&
                  !hasTimeChange
                ) {
                  console.log(`[SYNC] ✅ Timer ${index} unchanged - no sync needed`)
                  return localTimer
                }

                // CRITICAL state changes that affect timer operation (NOT including labels)
                const hasCriticalStateChange =
                  hasInputModeChange ||
                  hasRunningChange ||
                  (localTimer.isInputMode && hasInputChange) ||
                  hasModeChange ||
                  hasCountingChange

                if (hasCriticalStateChange) {
                  console.log(`[SYNC] 🚨 Critical state change for timer ${index} - FULL SYNC:`)
                  if (hasInputModeChange)
                    console.log(`[SYNC]   isInputMode: ${localTimer.isInputMode} → ${apiTimer.isInputMode}`)
                  if (hasRunningChange)
                    console.log(`[SYNC]   isRunning: ${localTimer.isRunning} → ${apiTimer.isRunning}`)
                  if (hasInputChange) console.log(`[SYNC]   input: "${localTimer.input}" → "${apiTimer.input}"`)

                  // Clear interval if timer state changed
                  if ((hasRunningChange || hasInputModeChange) && intervalRefs.current[index]) {
                    clearInterval(intervalRefs.current[index]!)
                    intervalRefs.current[index] = null
                    console.log(`[SYNC] Cleared interval for timer ${index}`)
                  }

                  return apiTimer // Full sync for critical changes
                }

                // ONLY protect timeLeft for actively running timers (not in input mode)
                if (localTimer.isRunning && !localTimer.isInputMode && timeSinceUpdate < 2000 && hasTimeChange) {
                  console.log(
                    `[SYNC] 🛡️ Protecting timeLeft for running timer ${index} (local: ${localTimer.timeLeft}, api: ${apiTimer.timeLeft})`,
                  )
                  return {
                    ...apiTimer, // Sync everything else (including labels)
                    timeLeft: localTimer.timeLeft, // But keep local timeLeft
                  }
                }

                // For minor changes (labels, time updates), sync without affecting timer operation
                if (hasTimeChange || hasLabelChange) {
                  console.log(`[SYNC] 🔄 Syncing minor changes for timer ${index}`)
                  if (hasLabelChange) console.log(`[SYNC]   labelId: "${localTimer.labelId}" → "${apiTimer.labelId}"`)
                  return apiTimer
                }

                return localTimer
              })
            })

            // Always sync selected timer
            if (apiState.selectedTimer !== selectedTimer) {
              console.log(`[SYNC] 🎯 Syncing selected timer: ${selectedTimer} → ${apiState.selectedTimer}`)
              setSelectedTimer(apiState.selectedTimer)
            }

            console.log(`[SYNC] ✅ Precise sync completed`)
          } else {
            // No version change - just sync selection if needed
            if (apiState.selectedTimer !== selectedTimer) {
              setSelectedTimer(apiState.selectedTimer)
            }
          }
        }
      } catch (error) {
        // Silent fail - don't log to avoid spam
      }
    }, 500)

    return () => clearInterval(syncInterval)
  }, [selectedTimer, timers])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-2 sm:p-4">
      {/* Offline Mode Indicator */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-white text-sm font-bold mb-1">Mode</div>
          <div className="flex items-center">
            <div className="text-gray-400 text-lg font-bold mr-2">OFFLINE</div>
            <div className="inline-block w-3 h-3 rounded-full bg-gray-500"></div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          ← Back
        </Button>
      </div>

      {/* Debug Toggle Button */}
      <div className="absolute top-20 right-4 z-10">
        <Button
          onClick={() => setShowDebug(!showDebug)}
          size="sm"
          variant="outline"
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 mb-2"
        >
          {showDebug ? "Hide Debug" : "Debug"}
        </Button>

        {showDebug && (
          <div className="bg-gray-800 rounded-lg p-2 border border-gray-700 text-xs text-white">
            <div className="mb-2">Debug Info:</div>
            <div className="mb-2">Version: {lastKnownVersion.current}</div>
            {timers.map((timer) => (
              <div key={timer.id} className="mb-1">
                T{timer.id}: {timer.isRunning ? "RUN" : "STOP"} {timer.isInputMode ? "INPUT" : "TIMER"} {timer.timeLeft}
                s{intervalRefs.current[timer.id] ? " [INT]" : " [NO-INT]"}
                {isTimerFinished(timer) ? " [FINISHED]" : ""}
                {timer.isCountingUp ? " [UP]" : " [DOWN]"}
                <br />
                Label: "{timer.labelId}" ({getLabelText(timer.labelId)})
              </div>
            ))}
            <Button
              onClick={() => {
                // Force clear all intervals and reset stuck timers
                Object.keys(intervalRefs.current).forEach((timerId) => {
                  const id = Number.parseInt(timerId)
                  if (intervalRefs.current[id]) {
                    clearInterval(intervalRefs.current[id]!)
                    intervalRefs.current[id] = null
                  }
                })
                setTimers((prev) =>
                  prev.map((timer) => ({
                    ...timer,
                    isRunning: false,
                    isInputMode: true,
                    input: "",
                    timeLeft: 0,
                    selectedMode: null,
                    labelId: timer.labelId, // Preserve labels in force reset
                  })),
                )
                console.log("Force reset all timers (labels preserved)")
              }}
              size="sm"
              className="mt-2 bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              Force Reset All
            </Button>
          </div>
        )}
      </div>

      <Card className="w-full max-w-7xl bg-gray-800 border-gray-700">
        <CardContent className="py-4 sm:py-8 px-2 sm:px-6">
          <div className="space-y-8">
            {timers.map((timer, index) => (
              <div key={timer.id} className="flex items-center justify-center gap-2 sm:gap-4">
                {/* Label Dropdown */}
                <div className="w-24 sm:w-32 md:w-40 h-16 sm:h-20 md:h-24 bg-gray-700 border border-gray-600 rounded relative flex-shrink-0">
                  <Select
                    value={timer.labelId || "none"}
                    onValueChange={(labelId) => handleLabelChange(timer.id, labelId === "none" ? "" : labelId)}
                  >
                    <SelectTrigger className="w-full h-full bg-transparent border-none text-yellow-400 text-xl sm:text-2xl md:text-4xl font-bold">
                      <SelectValue placeholder="Label">{getLabelText(timer.labelId) || ""}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="none" className="text-gray-400">
                        No Label
                      </SelectItem>
                      {labels.map((label) => (
                        <SelectItem key={label.id} value={label.id} className="text-yellow-400 font-bold">
                          {label.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        // FIXED: Removed blinking animation - no more animate-pulse
                        timer.isCountingUp && timer.isRunning
                          ? "bg-green-900/30 border-solid border-green-500"
                          : isTimerFinished(timer)
                            ? "bg-gray-900/50 border-solid border-gray-400" // Finished state - gray, no blinking
                            : timer.isRunning
                              ? "bg-red-900/30 border-solid border-red-500"
                              : "bg-gray-700/50 border-solid border-gray-500" // Paused state
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
