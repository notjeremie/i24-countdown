// Shared room storage
export const rooms = new Map<string, any>()

// Generate a random 6-character room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Get default timer state
export function getDefaultTimerState() {
  return {
    timers: [
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
    ],
    selectedTimer: 0,
  }
}
