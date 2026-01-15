// Initialize with default rooms
export const rooms = new Map<string, any>([
  [
    "CTRLFR",
    {
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
      ],
      selectedTimer: 0,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    },
  ],
  [
    "CTRLEN",
    {
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
      ],
      selectedTimer: 0,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    },
  ],
])

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
    ],
    selectedTimer: 0,
  }
}

// Get list of default rooms
export function getDefaultRooms() {
  return [
    { code: "CTRLFR", name: "Control Room FR" },
    { code: "CTRLEN", name: "Control Room EN" },
  ]
}
