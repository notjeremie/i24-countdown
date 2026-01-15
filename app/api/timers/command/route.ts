import { type NextRequest, NextResponse } from "next/server"
import { broadcastUpdate } from "../stream/route"
import { rooms } from "@/lib/rooms"
import { getAllLabels, getLabelById } from "@/lib/labels"

export async function POST(request: NextRequest) {
  const { command, timerId, value, roomCode, input, selectedMode, labelIndex } = await request.json()

  if (!roomCode || !rooms.has(roomCode)) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const room = rooms.get(roomCode)
  const currentTimer = room.timers[timerId || room.selectedTimer]

  switch (command) {
    case "selectTimer":
      room.selectedTimer = value
      break

    case "syncInput":
      // New command to sync complete input string
      if (currentTimer.isInputMode && input !== undefined) {
        currentTimer.input = input
        console.log(`[Server] Synced input for timer ${timerId}: "${input}"`)
      }
      break

    case "number":
      if (currentTimer.isInputMode) {
        const currentInput = currentTimer.input
        if (currentInput.replace(/\D/g, "").length < 6) {
          currentTimer.input = currentInput + value.toString()
        }
      }
      break

    case "backspace":
      if (currentTimer.isInputMode) {
        currentTimer.input = currentTimer.input.slice(0, -1)
      }
      break

    case "delete":
      // Preserve labelId when manually stopping/resetting
      const preservedLabelId = currentTimer.labelId
      currentTimer.input = ""
      currentTimer.timeLeft = 0
      currentTimer.isRunning = false
      currentTimer.isInputMode = true
      currentTimer.isCountingUp = false
      currentTimer.selectedMode = null
      currentTimer.labelId = preservedLabelId // Keep the labelId
      break

    case "timerFinished":
      // Handle natural timer completion - preserve labelId and reset to input mode
      const preservedLabelIdFinished = currentTimer.labelId
      currentTimer.input = ""
      currentTimer.timeLeft = 0
      currentTimer.isRunning = false
      currentTimer.isInputMode = true
      currentTimer.isCountingUp = false
      currentTimer.selectedMode = null
      currentTimer.labelId = preservedLabelIdFinished // Keep the labelId
      console.log(`Timer ${timerId} finished naturally, preserved labelId: "${preservedLabelIdFinished}"`)
      break

    case "modeUp":
      if (currentTimer.isInputMode) {
        currentTimer.selectedMode = "up"
      }
      break

    case "modeDown":
      if (currentTimer.isInputMode) {
        currentTimer.selectedMode = "down"
      }
      break

    case "enterZero":
      // Special case for starting from 00:00:00 - always count UP
      if (currentTimer.isInputMode) {
        currentTimer.input = input !== undefined ? input : currentTimer.input
        currentTimer.timeLeft = 0
        currentTimer.isInputMode = false
        currentTimer.isRunning = true
        currentTimer.isCountingUp = true // Always count up from zero
        currentTimer.selectedMode = "up"
        console.log(`[Server] Timer ${timerId} started counting UP from 00:00:00`)
      }
      break

    case "enter":
      if (currentTimer.isInputMode) {
        // Use input from client if provided, otherwise fall back to server state
        const inputToUse = input !== undefined ? input : currentTimer.input
        const modeToUse = selectedMode !== undefined ? selectedMode : currentTimer.selectedMode || "down"

        if (inputToUse) {
          const formattedTime = formatInput(inputToUse)
          const seconds = timeToSeconds(formattedTime)

          // If time is 00:00:00, automatically count UP
          if (seconds === 0) {
            currentTimer.input = inputToUse
            currentTimer.timeLeft = 0
            currentTimer.isInputMode = false
            currentTimer.isRunning = true
            currentTimer.isCountingUp = true // Always count up from zero
            currentTimer.selectedMode = "up"
            console.log(`[Server] Timer ${timerId} started counting UP from 00:00:00`)
          } else if (seconds > 0) {
            // If any time is entered, use the selected mode
            currentTimer.input = inputToUse
            currentTimer.timeLeft = seconds
            currentTimer.isInputMode = false
            currentTimer.isRunning = true
            currentTimer.isCountingUp = modeToUse === "up"
            currentTimer.selectedMode = modeToUse
            console.log(
              `[Server] Timer ${timerId} started with input: "${inputToUse}" (${seconds}s), mode: ${modeToUse}`,
            )
          }
        }
      }
      break

    case "pauseResume":
      if (!currentTimer.isInputMode) {
        currentTimer.isRunning = !currentTimer.isRunning
      }
      break

    case "setLabel":
      if (labelIndex !== undefined) {
        const labels = getAllLabels()
        const label = labels[labelIndex - 1] // labelIndex is 1-based
        if (label) {
          const targetTimerId = room.selectedTimer
          room.timers[targetTimerId].labelId = label.id
          console.log(`[Server] Set label for selected timer ${targetTimerId}: "${label.text}" (index ${labelIndex})`)
        } else {
          console.log(`[Server] Label index ${labelIndex} not found`)
        }
      }
      break

    case "updateLabel":
      if (timerId !== undefined && value !== undefined) {
        room.timers[timerId].labelId = value
        const label = getLabelById(value)
        console.log(`[Server] Set labelId for timer ${timerId}: "${value}" (${label?.text || "unknown"})`)
      }
      break
  }

  room.lastActivity = Date.now()
  rooms.set(roomCode, room)

  // Broadcast update immediately to all connected clients in this room
  broadcastUpdate(room, roomCode)

  // Return the updated state immediately for faster response
  return NextResponse.json(room)
}

// Helper functions
function formatInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6)
  if (digits.length === 0) return "00:00:00"
  if (digits.length === 1) return `00:00:0${digits}`
  if (digits.length === 2) return `00:00:${digits}`
  if (digits.length === 3) return `00:0${digits[0]}:${digits.slice(1)}`
  if (digits.length === 4) return `00:${digits.slice(0, 2)}:${digits.slice(2)}`
  if (digits.length === 5) return `0${digits[0]}:${digits.slice(1, 3)}:${digits.slice(3)}`
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`
}

function timeToSeconds(formattedTime: string) {
  const [hours, minutes, seconds] = formattedTime.split(":").map(Number)
  return hours * 3600 + minutes * 60 + seconds
}
