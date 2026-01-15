import { type NextRequest, NextResponse } from "next/server"
import { getAllLabels } from "@/lib/labels"

// Network configuration - set this to allow external connections
const ALLOW_NETWORK_ACCESS = true // Set to true to allow other computers to connect

// Define the structure for a timer
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

// Define the structure for the offline state
interface OfflineState {
  timers: Timer[]
  selectedTimer: number
}

// Add at the top after the interface definitions
let stateVersion = 0

// Server-side countdown intervals
const serverIntervals: { [key: number]: NodeJS.Timeout } = {}

// Function to start server-side countdown for a timer with precision timing
function startServerCountdown(timerId: number) {
  // Clear existing interval
  if (serverIntervals[timerId]) {
    clearInterval(serverIntervals[timerId])
  }

  const timer = offlineState.timers[timerId]
  if (!timer || !timer.isRunning || timer.isInputMode) {
    return
  }

  console.log(
    `[SERVER] Starting countdown for timer ${timerId} - ${timer.isCountingUp ? "UP" : "DOWN"} from ${timer.timeLeft}`,
  )

  // Store start time and initial value for precise calculation
  const startTime = Date.now()
  const initialTimeLeft = timer.timeLeft

  serverIntervals[timerId] = setInterval(() => {
    const currentTimer = offlineState.timers[timerId]
    if (!currentTimer || !currentTimer.isRunning || currentTimer.isInputMode) {
      clearInterval(serverIntervals[timerId])
      delete serverIntervals[timerId]
      return
    }

    // Calculate elapsed seconds since start
    const elapsedMs = Date.now() - startTime
    const elapsedSeconds = Math.floor(elapsedMs / 1000)

    if (currentTimer.isCountingUp) {
      const newTime = initialTimeLeft + elapsedSeconds
      currentTimer.timeLeft = newTime
      stateVersion++
      console.log(`[SERVER] Timer ${timerId} counting UP: ${currentTimer.timeLeft}`)
    } else {
      const newTime = initialTimeLeft - elapsedSeconds
      if (newTime <= 0) {
        // Timer finished
        const preservedLabelId = currentTimer.labelId
        currentTimer.input = ""
        currentTimer.timeLeft = 0
        currentTimer.isRunning = false
        currentTimer.isInputMode = false
        currentTimer.isCountingUp = false
        currentTimer.selectedMode = null
        currentTimer.labelId = preservedLabelId

        stateVersion++
        console.log(`[SERVER] Timer ${timerId} finished - staying at 00:00:00`)

        clearInterval(serverIntervals[timerId])
        delete serverIntervals[timerId]
      } else {
        currentTimer.timeLeft = newTime
        stateVersion++
        console.log(`[SERVER] Timer ${timerId} counting DOWN: ${currentTimer.timeLeft}`)
      }
    }
  }, 100) // Update every 100ms but calculate based on real elapsed time
}

// Function to stop server-side countdown for a timer
function stopServerCountdown(timerId: number) {
  if (serverIntervals[timerId]) {
    console.log(`[SERVER] Stopping countdown for timer ${timerId}`)
    clearInterval(serverIntervals[timerId])
    delete serverIntervals[timerId]
  }
}

// Helper function to determine timer status
function getTimerStatus(timer: Omit<Timer, "status">): Timer["status"] {
  if (timer.isInputMode) return "input"
  if (timer.isRunning) return "playing"
  if (!timer.isRunning && !timer.isInputMode && timer.timeLeft > 0) return "paused"
  if (!timer.isRunning && !timer.isInputMode && timer.timeLeft === 0) return "finished"
  return "input"
}

// Helper function to check if timer is finished
function isTimerFinished(timer: Timer): boolean {
  return !timer.isRunning && !timer.isInputMode && timer.timeLeft === 0
}

// Initialize the offline state with some default timers
const offlineState: OfflineState = {
  timers: [
    {
      id: 0,
      input: "",
      timeLeft: 0,
      isRunning: false,
      isInputMode: true,
      isCountingUp: false,
      selectedMode: null,
      labelId: "",
      status: "input",
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
      status: "input",
    },
  ],
  selectedTimer: 0,
}

// Utility function to format the input time
function formatInput(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 6)
  if (digits.length === 0) return "00:00:00"
  if (digits.length === 1) return `00:00:0${digits}`
  if (digits.length === 2) return `00:00:${digits}`
  if (digits.length === 3) return `00:0${digits[0]}:${digits.slice(1)}`
  if (digits.length === 4) return `00:${digits.slice(0, 2)}:${digits.slice(2)}`
  if (digits.length === 5) return `0${digits[0]}:${digits.slice(1, 3)}:${digits.slice(3)}`
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`
}

// Utility function to convert formatted time to seconds
function timeToSeconds(formattedTime: string): number {
  const [hours, minutes, seconds] = formattedTime.split(":").map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

// Update timer status helper
function updateTimerStatus(timer: Timer): Timer {
  return {
    ...timer,
    status: getTimerStatus(timer),
  }
}

// GET - Return current state with status fields and labels
export async function GET() {
  // Update all timer statuses before returning
  const timersWithStatus = offlineState.timers.map(updateTimerStatus)

  // Update the state with the new statuses
  offlineState.timers = timersWithStatus

  const selectedTimerStatus = timersWithStatus[offlineState.selectedTimer]?.status || "input"
  const timer1Status = timersWithStatus[0]?.status || "input"
  const timer2Status = timersWithStatus[1]?.status || "input"

  // Fetch current labels to include in response
  const currentLabels = getAllLabels()

  console.log(`[API GET] Selected Timer: ${offlineState.selectedTimer}, Status: ${selectedTimerStatus}`)
  console.log(`[API GET] Timer 1 Status: ${timer1Status}, Timer 2 Status: ${timer2Status}`)
  console.log(`[API GET] Labels available: ${currentLabels.length}`)

  const response = NextResponse.json({
    success: true,
    timers: timersWithStatus,
    selectedTimer: offlineState.selectedTimer,
    version: stateVersion,
    selectedTimerStatus: selectedTimerStatus,
    timer1Status: timer1Status,
    timer2Status: timer2Status,
    labels: currentLabels, // Include labels in the response
  })

  // Add CORS headers for network access
  if (ALLOW_NETWORK_ACCESS) {
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  }

  return response
}

// POST - Handle commands with status updates
export async function POST(request: NextRequest) {
  let requestData
  try {
    requestData = await request.json()
  } catch (error) {
    console.error("[API POST] Invalid JSON received:", error)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { action, timerId, value, labelIndex } = requestData

  // ENHANCED TIMER SELECTION LOGIC
  let currentTimerId: number
  if (timerId !== undefined) {
    // Explicit timer ID provided
    currentTimerId = timerId
    console.log(`[STREAM DECK] Using explicit timerId: ${currentTimerId}`)
  } else {
    // Use selected timer
    currentTimerId = offlineState.selectedTimer
    console.log(`[STREAM DECK] Using selectedTimer: ${currentTimerId}`)
  }

  const currentTimer = offlineState.timers[currentTimerId]

  // DETAILED LOGGING FOR STREAM DECK DEBUGGING
  console.log("=".repeat(80))
  console.log(`[STREAM DECK] Received command:`)
  console.log(`  Action: ${action}`)
  console.log(`  TimerId from request: ${timerId}`)
  console.log(`  Using timerId: ${currentTimerId}`)
  console.log(`  Value: ${value}`)
  console.log(`  LabelIndex: ${labelIndex}`)
  console.log(`  Selected Timer in state: ${offlineState.selectedTimer}`)
  console.log(
    `  Available labels: ${getAllLabels()
      .map((l, i) => `${i + 1}:${l.text}`)
      .join(", ")}`,
  )
  console.log(`  Full payload:`, JSON.stringify(requestData, null, 2))

  // Show ALL timer states for debugging
  offlineState.timers.forEach((timer, index) => {
    console.log(`[STREAM DECK] Timer ${index} state:`)
    console.log(`  isRunning: ${timer.isRunning}`)
    console.log(`  isInputMode: ${timer.isInputMode}`)
    console.log(`  timeLeft: ${timer.timeLeft}`)
    console.log(`  input: "${timer.input}"`)
    console.log(`  status: ${getTimerStatus(timer)}`)
    console.log(`  isFinished: ${isTimerFinished(timer)}`)
    console.log(`  isCountingUp: ${timer.isCountingUp}`)
    console.log(`  labelId: "${timer.labelId}"`)
  })

  if (currentTimer) {
    console.log(`[STREAM DECK] Target timer ${currentTimerId} found and ready for command: ${action}`)
  } else {
    console.log(`[STREAM DECK] ERROR: Timer ${currentTimerId} not found!`)
    console.log(`[STREAM DECK] Available timers: ${offlineState.timers.map((t) => t.id).join(", ")}`)
  }
  console.log("=".repeat(80))

  // Store the BEFORE state for comparison
  const beforeState = currentTimer ? { ...currentTimer } : null

  // ULTRA-FAST RESPONSE - minimal processing, immediate state updates
  switch (action) {
    case "selectTimer":
      if (timerId !== undefined && timerId >= 0 && timerId < offlineState.timers.length) {
        offlineState.selectedTimer = timerId
        console.log(`[STREAM DECK] ✅ Selected timer changed to: ${timerId}`)
      } else {
        console.log(`[STREAM DECK] ❌ Invalid timer ID: ${timerId}`)
      }
      break

    case "number":
      if (currentTimer && value !== undefined) {
        console.log(`[STREAM DECK] Processing number ${value} on timer ${currentTimerId}`)

        // FIXED: Handle finished timers - switch to input mode first
        if (isTimerFinished(currentTimer)) {
          console.log(`[STREAM DECK] ✅ Timer ${currentTimerId} is FINISHED, switching to input mode`)
          const preservedLabelId = currentTimer.labelId
          currentTimer.input = value.toString() // Start with the pressed number
          currentTimer.timeLeft = 0
          currentTimer.isRunning = false
          currentTimer.isInputMode = true // Switch to input mode
          currentTimer.isCountingUp = false
          currentTimer.selectedMode = null
          currentTimer.labelId = preservedLabelId
          console.log(`[STREAM DECK] ✅ Timer ${currentTimerId} now in input mode with input: "${currentTimer.input}"`)
        } else if (currentTimer.isInputMode) {
          // Normal input mode behavior
          const currentInput = currentTimer.input
          if (currentInput.replace(/\D/g, "").length < 6) {
            currentTimer.input = currentInput + value.toString()
            console.log(`[STREAM DECK] ✅ Added digit to input: "${currentTimer.input}"`)
          } else {
            console.log(`[STREAM DECK] ❌ Input already at max length (6 digits)`)
          }
        } else if (currentTimer.isRunning || (!currentTimer.isRunning && currentTimer.timeLeft > 0)) {
          // Timer is running or paused - stop it and switch to input mode
          console.log(
            `[STREAM DECK] ✅ Timer ${currentTimerId} is running/paused, stopping and switching to input mode`,
          )
          const preservedLabelId = currentTimer.labelId
          currentTimer.input = value.toString() // Start with the pressed number
          currentTimer.timeLeft = 0
          currentTimer.isRunning = false
          currentTimer.isInputMode = true
          currentTimer.isCountingUp = false
          currentTimer.selectedMode = null
          currentTimer.labelId = preservedLabelId
          console.log(`[STREAM DECK] ✅ Timer ${currentTimerId} now in input mode with input: "${currentTimer.input}"`)
        }
      } else {
        console.log(`[STREAM DECK] ❌ Number command failed - timer: ${!!currentTimer}, value: ${value}`)
      }
      break

    case "backspace":
      if (currentTimer?.isInputMode) {
        const oldInput = currentTimer.input
        currentTimer.input = currentTimer.input.slice(0, -1)
        console.log(`[STREAM DECK] ✅ Backspace: "${oldInput}" → "${currentTimer.input}"`)
      } else {
        console.log(`[STREAM DECK] ❌ Backspace failed - timer not in input mode`)
      }
      break

    case "modeUp":
      if (currentTimer) {
        if (currentTimer.isInputMode) {
          currentTimer.selectedMode = "up"
          console.log(`[STREAM DECK] ✅ Mode set to UP for timer ${currentTimerId}`)
        } else {
          console.log(
            `[STREAM DECK] ❌ Mode UP failed - timer ${currentTimerId} not in input mode (isInputMode: ${currentTimer.isInputMode}, isRunning: ${currentTimer.isRunning})`,
          )
        }
      } else {
        console.log(`[STREAM DECK] ❌ Mode UP failed - timer ${currentTimerId} not found`)
      }
      break

    case "modeDown":
      if (currentTimer) {
        if (currentTimer.isInputMode) {
          currentTimer.selectedMode = "down"
          console.log(`[STREAM DECK] ✅ Mode set to DOWN for timer ${currentTimerId}`)
        } else {
          console.log(
            `[STREAM DECK] ❌ Mode DOWN failed - timer ${currentTimerId} not in input mode (isInputMode: ${currentTimer.isInputMode}, isRunning: ${currentTimer.isRunning})`,
          )
        }
      } else {
        console.log(`[STREAM DECK] ❌ Mode DOWN failed - timer ${currentTimerId} not found`)
      }
      break

    case "start":
    case "enter":
      console.log(`[STREAM DECK] 🚀 START/RESUME command - Processing for timer ${currentTimerId}`)

      if (currentTimer) {
        console.log(`[STREAM DECK] 🚀 Timer ${currentTimerId} state:`)
        console.log(`[STREAM DECK] 🚀   isInputMode: ${currentTimer.isInputMode}`)
        console.log(`[STREAM DECK] 🚀   isRunning: ${currentTimer.isRunning}`)
        console.log(`[STREAM DECK] 🚀   timeLeft: ${currentTimer.timeLeft}`)
        console.log(`[STREAM DECK] 🚀   input: "${currentTimer.input}"`)
        console.log(`[STREAM DECK] 🚀   isFinished: ${isTimerFinished(currentTimer)}`)

        if (currentTimer.isInputMode) {
          // START from input mode
          const formattedTime = formatInput(currentTimer.input)
          const seconds = timeToSeconds(formattedTime)
          console.log(
            `[STREAM DECK] 🚀 STARTING timer with input: "${currentTimer.input}" → ${formattedTime} → ${seconds}s`,
          )

          if (seconds === 0) {
            currentTimer.timeLeft = 0
            currentTimer.isInputMode = false
            currentTimer.isRunning = true
            currentTimer.isCountingUp = true
            currentTimer.selectedMode = "up"
            console.log(`[STREAM DECK] ✅ STARTED timer ${currentTimerId} counting UP from 0`)
          } else {
            const mode = currentTimer.selectedMode || "down"
            currentTimer.timeLeft = seconds
            currentTimer.isInputMode = false
            currentTimer.isRunning = true
            currentTimer.isCountingUp = mode === "up"
            console.log(`[STREAM DECK] ✅ STARTED timer ${currentTimerId} with ${seconds}s, mode: ${mode}`)
          }
        } else if (!currentTimer.isRunning && currentTimer.timeLeft > 0) {
          // RESUME paused timer
          console.log(
            `[STREAM DECK] 🚀 RESUMING paused timer ${currentTimerId} with ${currentTimer.timeLeft}s remaining`,
          )
          currentTimer.isRunning = true
          console.log(`[STREAM DECK] ✅ RESUMED timer ${currentTimerId}`)
        } else if (isTimerFinished(currentTimer)) {
          // FIXED: Handle finished timer - start count-up from 0
          console.log(`[STREAM DECK] 🚀 Timer ${currentTimerId} is FINISHED, starting count-up from 0`)
          const preservedLabelId = currentTimer.labelId
          currentTimer.timeLeft = 0
          currentTimer.isInputMode = false
          currentTimer.isRunning = true
          currentTimer.isCountingUp = true
          currentTimer.selectedMode = "up"
          currentTimer.labelId = preservedLabelId
          console.log(`[STREAM DECK] ✅ STARTED count-up timer ${currentTimerId} from finished state`)
        } else if (currentTimer.isRunning) {
          console.log(`[STREAM DECK] ❌ START failed - timer ${currentTimerId} is already running`)
        } else {
          console.log(`[STREAM DECK] ❌ START failed - timer ${currentTimerId} in unexpected state`)
        }
        // Start server-side countdown
        startServerCountdown(currentTimerId)
      } else {
        console.log(`[STREAM DECK] ❌ START failed - timer ${currentTimerId} not found`)
      }
      break

    case "pause":
      console.log(`[STREAM DECK] ⏸️ PAUSE command - Processing for timer ${currentTimerId}`)

      if (currentTimer) {
        console.log(`[STREAM DECK] ⏸️ Timer ${currentTimerId} state:`)
        console.log(`[STREAM DECK] ⏸️   isInputMode: ${currentTimer.isInputMode}`)
        console.log(`[STREAM DECK] ⏸️   isRunning: ${currentTimer.isRunning}`)
        console.log(`[STREAM DECK] ⏸️   timeLeft: ${currentTimer.timeLeft}`)

        if (!currentTimer.isInputMode && currentTimer.isRunning) {
          currentTimer.isRunning = false
          console.log(`[STREAM DECK] ✅ PAUSED timer ${currentTimerId}`)
        } else if (currentTimer.isInputMode) {
          console.log(`[STREAM DECK] ❌ PAUSE failed - timer ${currentTimerId} is in input mode`)
        } else if (!currentTimer.isRunning) {
          console.log(`[STREAM DECK] ❌ PAUSE failed - timer ${currentTimerId} is not running`)
        } else {
          console.log(`[STREAM DECK] ❌ PAUSE failed - timer ${currentTimerId} in unexpected state`)
        }
        // Stop server-side countdown
        stopServerCountdown(currentTimerId)
      } else {
        console.log(`[STREAM DECK] ❌ PAUSE failed - timer ${currentTimerId} not found`)
      }
      break

    case "reset":
      if (currentTimer) {
        const preservedLabelId = currentTimer.labelId
        console.log(`[STREAM DECK] Resetting timer ${currentTimerId} (preserving label: "${preservedLabelId}")`)

        // FIXED: Reset timer but PRESERVE the label
        currentTimer.input = ""
        currentTimer.timeLeft = 0
        currentTimer.isRunning = false
        currentTimer.isInputMode = true // ALWAYS go to input mode
        currentTimer.isCountingUp = false
        currentTimer.selectedMode = null
        currentTimer.labelId = preservedLabelId // KEEP THE LABEL
        console.log(
          `[STREAM DECK] ✅ Timer ${currentTimerId} reset to input mode (label preserved: "${preservedLabelId}")`,
        )
        // Stop server-side countdown
        stopServerCountdown(currentTimerId)
      } else {
        console.log(`[STREAM DECK] ❌ Reset failed - timer not found`)
      }
      break

    case "resetBoth":
      console.log(`[STREAM DECK] Resetting BOTH timers simultaneously`)

      // Reset Timer 0
      const timer0 = offlineState.timers[0]
      if (timer0) {
        const preservedLabelId0 = timer0.labelId
        timer0.input = ""
        timer0.timeLeft = 0
        timer0.isRunning = false
        timer0.isInputMode = true
        timer0.isCountingUp = false
        timer0.selectedMode = null
        timer0.labelId = preservedLabelId0
        stopServerCountdown(0)
        console.log(`[STREAM DECK] ✅ Timer 0 reset (label preserved: "${preservedLabelId0}")`)
      }

      // Reset Timer 1
      const timer1 = offlineState.timers[1]
      if (timer1) {
        const preservedLabelId1 = timer1.labelId
        timer1.input = ""
        timer1.timeLeft = 0
        timer1.isRunning = false
        timer1.isInputMode = true
        timer1.isCountingUp = false
        timer1.selectedMode = null
        timer1.labelId = preservedLabelId1
        stopServerCountdown(1)
        console.log(`[STREAM DECK] ✅ Timer 1 reset (label preserved: "${preservedLabelId1}")`)
      }

      console.log(`[STREAM DECK] ✅ Both timers reset successfully`)
      break

    case "setTime":
      if (currentTimer && value) {
        console.log(`[STREAM DECK] Setting time to: ${value}`)

        // FIXED: If timer is finished, switch to input mode first
        if (isTimerFinished(currentTimer)) {
          console.log(`[STREAM DECK] ✅ Timer ${currentTimerId} is FINISHED, switching to input mode for setTime`)
          const preservedLabelId = currentTimer.labelId
          currentTimer.input = value.toString()
          currentTimer.timeLeft = 0
          currentTimer.isRunning = false
          currentTimer.isInputMode = true
          currentTimer.isCountingUp = false
          currentTimer.selectedMode = null
          currentTimer.labelId = preservedLabelId
          console.log(`[STREAM DECK] ✅ Timer ${currentTimerId} now in input mode with time: "${currentTimer.input}"`)
        } else if (currentTimer.isInputMode) {
          currentTimer.input = value.toString()
          console.log(`[STREAM DECK] ✅ Set input to: "${currentTimer.input}"`)
        } else {
          console.log(`[STREAM DECK] ❌ SetTime failed - timer not in input mode and not finished`)
        }
      } else {
        console.log(`[STREAM DECK] ❌ SetTime failed - no timer or no value`)
      }
      break

    case "setLabel":
      // Handle both labelIndex (1-based) and value (direct label ID) parameters
      if (labelIndex !== undefined) {
        // Stream Deck sends 1-based labelIndex
        const labels = getAllLabels()
        const label = labels[labelIndex - 1] // labelIndex is 1-based
        if (label) {
          const targetTimerId = offlineState.selectedTimer
          offlineState.timers[targetTimerId].labelId = label.id
          console.log(
            `[STREAM DECK] ✅ Set label for timer ${targetTimerId}: "${label.text}" (ID: "${label.id}", index ${labelIndex})`,
          )
        } else {
          console.log(`[STREAM DECK] ❌ Label index ${labelIndex} not found (available: ${labels.length} labels)`)
        }
      } else if (value !== undefined) {
        // Direct label ID or index value
        const labels = getAllLabels()

        // Try as 1-based index first
        if (typeof value === "number" && value > 0 && value <= labels.length) {
          const label = labels[value - 1]
          const targetTimerId = offlineState.selectedTimer
          offlineState.timers[targetTimerId].labelId = label.id
          console.log(
            `[STREAM DECK] ✅ Set label for timer ${targetTimerId}: "${label.text}" (ID: "${label.id}", value as index ${value})`,
          )
        } else {
          // Try as direct label ID
          const label = labels.find((l) => l.id === value)
          if (label) {
            const targetTimerId = offlineState.selectedTimer
            offlineState.timers[targetTimerId].labelId = label.id
            console.log(
              `[STREAM DECK] ✅ Set label for timer ${targetTimerId}: "${label.text}" (direct ID: "${label.id}")`,
            )
          } else {
            console.log(`[STREAM DECK] ❌ Label not found for value: ${value}`)
          }
        }
      } else {
        console.log(`[STREAM DECK] ❌ SetLabel failed - no labelIndex or value provided`)
      }
      break

    case "updateTime":
      if (currentTimer && value !== undefined && !currentTimer.isInputMode) {
        const oldTime = currentTimer.timeLeft
        currentTimer.timeLeft = Math.max(0, value)
        console.log(`[STREAM DECK] ✅ Updated time: ${oldTime}s → ${currentTimer.timeLeft}s`)

        if (currentTimer.timeLeft === 0) {
          const preservedLabelId = currentTimer.labelId
          currentTimer.isRunning = false
          currentTimer.isInputMode = true
          currentTimer.input = ""
          currentTimer.selectedMode = null
          currentTimer.labelId = preservedLabelId
          console.log(`[STREAM DECK] ✅ Timer reached 0, switched to input mode`)
        }
      } else {
        console.log(`[STREAM DECK] ❌ UpdateTime failed - timer in input mode or no value`)
      }
      break

    case "timerFinished":
      // Handle timer completion - STAY AT 00:00:00 and DON'T restart
      if (currentTimer) {
        const preservedLabelId = currentTimer.labelId
        currentTimer.input = ""
        currentTimer.timeLeft = 0
        currentTimer.isRunning = false // STOP the timer
        currentTimer.isInputMode = false // DON'T go back to input mode - stay in finished state
        currentTimer.isCountingUp = false
        currentTimer.selectedMode = null
        currentTimer.labelId = preservedLabelId
        console.log(
          `[STREAM DECK] ✅ Timer ${currentTimerId} finished naturally - staying at 00:00:00 in finished state (label preserved: "${preservedLabelId}")`,
        )
        // Stop server-side countdown
        stopServerCountdown(currentTimerId)
      } else {
        console.log(`[STREAM DECK] ❌ TimerFinished failed - timer not found`)
      }
      break

    // REMOVED: pauseResume case - no longer supported
    // REMOVED: resume case - now handled by "start"

    default:
      console.log(`[STREAM DECK] ❌ Unknown action: ${action}`)
      break
  }

  // Show the AFTER state for comparison
  if (currentTimer && beforeState) {
    console.log(`[STREAM DECK] 📊 State changes for timer ${currentTimerId}:`)
    if (beforeState.isRunning !== currentTimer.isRunning) {
      console.log(`[STREAM DECK] 📊   isRunning: ${beforeState.isRunning} → ${currentTimer.isRunning}`)
    }
    if (beforeState.isInputMode !== currentTimer.isInputMode) {
      console.log(`[STREAM DECK] 📊   isInputMode: ${beforeState.isInputMode} → ${currentTimer.isInputMode}`)
    }
    if (beforeState.timeLeft !== currentTimer.timeLeft) {
      console.log(`[STREAM DECK] 📊   timeLeft: ${beforeState.timeLeft} → ${currentTimer.timeLeft}`)
    }
    if (beforeState.input !== currentTimer.input) {
      console.log(`[STREAM DECK] 📊   input: "${beforeState.input}" → "${currentTimer.input}"`)
    }
    if (beforeState.selectedMode !== currentTimer.selectedMode) {
      console.log(`[STREAM DECK] 📊   selectedMode: ${beforeState.selectedMode} → ${currentTimer.selectedMode}`)
    }
    if (beforeState.labelId !== currentTimer.labelId) {
      console.log(`[STREAM DECK] 📊   labelId: "${beforeState.labelId}" → "${currentTimer.labelId}"`)
    }
  }

  // At the end, before returning, increment version
  stateVersion++ // Increment version on every change
  console.log(`[STREAM DECK] 📊 State version incremented to: ${stateVersion}`)

  // Update all timer statuses
  const timersWithStatus = offlineState.timers.map(updateTimerStatus)
  offlineState.timers = timersWithStatus

  const selectedTimerStatus = timersWithStatus[offlineState.selectedTimer]?.status || "input"
  const timer1Status = timersWithStatus[0]?.status || "input"
  const timer2Status = timersWithStatus[1]?.status || "input"

  console.log(
    `[STREAM DECK] 📊 Final status - Selected: ${selectedTimerStatus}, Timer1: ${timer1Status}, Timer2: ${timer2Status}`,
  )
  console.log("=".repeat(80))

  // IMMEDIATE RESPONSE with status information
  const response = NextResponse.json({
    success: true,
    timers: timersWithStatus,
    selectedTimer: offlineState.selectedTimer,
    version: stateVersion,
    selectedTimerStatus: selectedTimerStatus,
    timer1Status: timer1Status,
    timer2Status: timer2Status,
  })

  // Add CORS headers for network access
  if (ALLOW_NETWORK_ACCESS) {
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  }

  return response
}

export async function OPTIONS() {
  if (ALLOW_NETWORK_ACCESS) {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }
  return new Response(null, { status: 405 })
}
