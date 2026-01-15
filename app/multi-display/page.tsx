"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  status: "input" | "playing" | "paused" | "finished"
}

interface Label {
  id: string
  text: string
  order: number
}

interface ServerConnection {
  url: string
  name: string
  timers: Timer[]
  labels: Label[]
  selectedTimer: number
  isConnected: boolean
  connectionStatus: string
  lastVersion: number
  debugInfo: string
}

interface Computer {
  id: string
  name: string
  ip: string
  port: string
}

export default function MultiComputerDisplay() {
  const [server1, setServer1] = useState<ServerConnection>({
    url: "",
    name: "Computer 1",
    timers: [],
    labels: [],
    selectedTimer: 0,
    isConnected: false,
    connectionStatus: "Not connected",
    lastVersion: -1,
    debugInfo: "",
  })

  const [server2, setServer2] = useState<ServerConnection>({
    url: "",
    name: "Computer 2",
    timers: [],
    labels: [],
    selectedTimer: 0,
    isConnected: false,
    connectionStatus: "Not connected",
    lastVersion: -1,
    debugInfo: "",
  })

  const [server3, setServer3] = useState<ServerConnection>({
    url: "",
    name: "Computer 3",
    timers: [],
    labels: [],
    selectedTimer: 0,
    isConnected: false,
    connectionStatus: "Not connected",
    lastVersion: -1,
    debugInfo: "",
  })

  const [inputUrl1, setInputUrl1] = useState("")
  const [inputUrl2, setInputUrl2] = useState("")
  const [inputUrl3, setInputUrl3] = useState("")
  const [inputName1, setInputName1] = useState("Computer 1")
  const [inputName2, setInputName2] = useState("Computer 2")
  const [inputName3, setInputName3] = useState("Computer 3")
  const [showSetup, setShowSetup] = useState(true)

  const [computers, setComputers] = useState<Computer[]>([])
  const [selectedComputer1, setSelectedComputer1] = useState<string>("")
  const [selectedComputer2, setSelectedComputer2] = useState<string>("")
  const [selectedComputer3, setSelectedComputer3] = useState<string>("")

  const intervalRef1 = useRef<NodeJS.Timeout | null>(null)
  const intervalRef2 = useRef<NodeJS.Timeout | null>(null)
  const intervalRef3 = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("countdown-computers")
    if (saved) {
      try {
        setComputers(JSON.parse(saved))
      } catch (error) {
        console.error("Failed to load computers:", error)
      }
    }
  }, [])

  const handleComputerSelect = (computerId: string, slot: 1 | 2 | 3) => {
    const computer = computers.find((c) => c.id === computerId)
    if (!computer) return

    const url = `http://${computer.ip}:${computer.port}`

    if (slot === 1) {
      setSelectedComputer1(computerId)
      setInputUrl1(url)
      setInputName1(computer.name)
    } else if (slot === 2) {
      setSelectedComputer2(computerId)
      setInputUrl2(url)
      setInputName2(computer.name)
    } else if (slot === 3) {
      setSelectedComputer3(computerId)
      setInputUrl3(url)
      setInputName3(computer.name)
    }
  }

  const getLabelText = (labelId: string, labels: Label[]) => {
    if (!labelId) return ""
    const label = labels.find((l) => l.id === labelId)
    return label ? label.text : ""
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

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

  const isTimerFinished = (timer: Timer) => {
    return !timer.isRunning && !timer.isInputMode && timer.timeLeft === 0
  }

  const connectToServer = async (serverUrl: string, serverName: string, serverNumber: 1 | 2 | 3) => {
    const setServer = serverNumber === 1 ? setServer1 : serverNumber === 2 ? setServer2 : setServer3

    try {
      setServer((prev) => ({ ...prev, connectionStatus: "Connecting..." }))

      const testUrl = serverUrl.endsWith("/") ? `${serverUrl}api/offline` : `${serverUrl}/api/offline`

      const response = await fetch(testUrl, {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[Server ${serverNumber}] Connection data:`, data)

      if (data.success && data.timers) {
        setServer((prev) => ({
          ...prev,
          url: serverUrl,
          name: serverName,
          timers: data.timers,
          labels: data.labels || [],
          selectedTimer: data.selectedTimer || 0,
          lastVersion: data.version || 0,
          isConnected: true,
          connectionStatus: "Connected",
        }))

        startPolling(testUrl, serverNumber)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error(`[Server ${serverNumber}] Connection failed:`, error)

      let errorMessage = "Connection failed"
      if (error.message.includes("Failed to fetch")) {
        errorMessage = "Network error - Check if server is running and accessible"
      } else if (error.message.includes("CORS")) {
        errorMessage = "CORS error - Server may need CORS configuration"
      } else if (error.message.includes("HTTP")) {
        errorMessage = error.message
      } else {
        errorMessage = `Error: ${error.message}`
      }

      setServer((prev) => ({
        ...prev,
        connectionStatus: errorMessage,
        isConnected: false,
      }))
    }
  }

  const startPolling = (apiUrl: string, serverNumber: 1 | 2 | 3) => {
    const intervalRef = serverNumber === 1 ? intervalRef1 : serverNumber === 2 ? intervalRef2 : intervalRef3
    const setServer = serverNumber === 1 ? setServer1 : serverNumber === 2 ? setServer2 : setServer3

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    console.log(`[Server ${serverNumber}] Starting polling...`)

    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          mode: "cors",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()

          const debugStr = `V:${data.version || "none"} T1:${data.timers?.[0]?.timeLeft || "none"}/${data.timers?.[0]?.isRunning ? "RUN" : "STOP"} T2:${data.timers?.[1]?.timeLeft || "none"}/${data.timers?.[1]?.isRunning ? "RUN" : "STOP"}`

          if (data.success && data.timers) {
            setServer((prev) => ({
              ...prev,
              timers: data.timers,
              labels: data.labels || prev.labels,
              selectedTimer: data.selectedTimer || 0,
              lastVersion: data.version || 0,
              connectionStatus: "Connected",
              debugInfo: debugStr,
            }))
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.error(`[Server ${serverNumber}] Polling failed:`, error)
        setServer((prev) => ({
          ...prev,
          connectionStatus: "Connection lost",
          isConnected: false,
          debugInfo: "",
        }))
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 250)
  }

  const disconnect = () => {
    if (intervalRef1.current) {
      clearInterval(intervalRef1.current)
      intervalRef1.current = null
    }
    if (intervalRef2.current) {
      clearInterval(intervalRef2.current)
      intervalRef2.current = null
    }
    if (intervalRef3.current) {
      clearInterval(intervalRef3.current)
      intervalRef3.current = null
    }

    setServer1((prev) => ({
      ...prev,
      isConnected: false,
      connectionStatus: "Disconnected",
      timers: [],
      debugInfo: "",
    }))

    setServer2((prev) => ({
      ...prev,
      isConnected: false,
      connectionStatus: "Disconnected",
      timers: [],
      debugInfo: "",
    }))

    setServer3((prev) => ({
      ...prev,
      isConnected: false,
      connectionStatus: "Disconnected",
      timers: [],
      debugInfo: "",
    }))

    setShowSetup(true)
  }

  const connectAll = async () => {
    if (inputUrl1.trim()) {
      await connectToServer(inputUrl1.trim(), inputName1.trim() || "Computer 1", 1)
    }
    if (inputUrl2.trim()) {
      await connectToServer(inputUrl2.trim(), inputName2.trim() || "Computer 2", 2)
    }
    if (inputUrl3.trim()) {
      await connectToServer(inputUrl3.trim(), inputName3.trim() || "Computer 3", 3)
    }

    if (inputUrl1.trim() || inputUrl2.trim() || inputUrl3.trim()) {
      setShowSetup(false)
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef1.current) clearInterval(intervalRef1.current)
      if (intervalRef2.current) clearInterval(intervalRef2.current)
      if (intervalRef3.current) clearInterval(intervalRef3.current)
    }
  }, [])

  const renderTimerDisplay = (server: ServerConnection) => (
    <div className="flex-1">
      <div className="bg-gray-800 p-3 border-b border-gray-700 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${server.isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className="text-2xl font-bold">{server.name}</span>
          </div>
          <div className="text-xs text-gray-400">{server.connectionStatus}</div>
        </div>
        <div className="text-xs text-gray-500 mt-1">{server.url || "Not connected"}</div>
      </div>

      <div className="space-y-4">
        {server.timers.map((timer, index) => (
          <Card key={timer.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-center mb-3">
                <div className="text-yellow-400 text-lg font-bold min-h-[1.5rem]">
                  {getLabelText(timer.labelId, server.labels) || `Timer ${index + 1}`}
                </div>
              </div>

              <div className="text-center mb-3">
                <div
                  className={`font-mono font-bold p-4 rounded-lg border-2 text-5xl sm:text-6xl tracking-tight ${
                    timer.isInputMode
                      ? server.selectedTimer === timer.id
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
                  } ${server.selectedTimer === timer.id ? "ring-2 ring-yellow-400" : ""}`}
                >
                  {timer.isInputMode ? formatInput(timer.input) : formatTime(timer.timeLeft)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  if (showSetup) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-6">
            <h1 className="text-white text-2xl font-bold text-center">Multi-Computer Display</h1>

            <p className="text-gray-400 text-center">
              Connect to up to three countdown apps running on different computers to display them side by side
            </p>

            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-white text-sm font-medium">Computer 1</label>
                <Select value={selectedComputer1} onValueChange={(value) => handleComputerSelect(value, 1)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue
                      placeholder={computers.length > 0 ? "Select a computer" : "Configure computers in Admin first"}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {computers.length > 0 ? (
                      computers.map((computer) => (
                        <SelectItem key={computer.id} value={computer.id} className="text-white hover:bg-gray-600">
                          {computer.name} ({computer.ip}:{computer.port})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="text-gray-400">
                        No computers configured
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  placeholder="Display Name"
                  value={inputName1}
                  onChange={(e) => setInputName1(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <Input
                  type="text"
                  placeholder="http://192.168.1.100:3000"
                  value={inputUrl1}
                  onChange={(e) => setInputUrl1(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <div className="text-xs text-gray-500">
                  Status:{" "}
                  <span className={server1.connectionStatus.includes("failed") ? "text-red-400" : ""}>
                    {server1.connectionStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-white text-sm font-medium">Computer 2</label>
                <Select value={selectedComputer2} onValueChange={(value) => handleComputerSelect(value, 2)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue
                      placeholder={computers.length > 0 ? "Select a computer" : "Configure computers in Admin first"}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {computers.length > 0 ? (
                      computers.map((computer) => (
                        <SelectItem key={computer.id} value={computer.id} className="text-white hover:bg-gray-600">
                          {computer.name} ({computer.ip}:{computer.port})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="text-gray-400">
                        No computers configured
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  placeholder="Display Name"
                  value={inputName2}
                  onChange={(e) => setInputName2(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <Input
                  type="text"
                  placeholder="http://192.168.1.101:3000"
                  value={inputUrl2}
                  onChange={(e) => setInputUrl2(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <div className="text-xs text-gray-500">
                  Status:{" "}
                  <span className={server2.connectionStatus.includes("failed") ? "text-red-400" : ""}>
                    {server2.connectionStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-white text-sm font-medium">Computer 3 (Optional)</label>
                <Select value={selectedComputer3} onValueChange={(value) => handleComputerSelect(value, 3)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue
                      placeholder={computers.length > 0 ? "Select a computer" : "Configure computers in Admin first"}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {computers.length > 0 ? (
                      computers.map((computer) => (
                        <SelectItem key={computer.id} value={computer.id} className="text-white hover:bg-gray-600">
                          {computer.name} ({computer.ip}:{computer.port})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="text-gray-400">
                        No computers configured
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  placeholder="Display Name"
                  value={inputName3}
                  onChange={(e) => setInputName3(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <Input
                  type="text"
                  placeholder="http://192.168.1.102:3000"
                  value={inputUrl3}
                  onChange={(e) => setInputUrl3(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <div className="text-xs text-gray-500">
                  Status:{" "}
                  <span className={server3.connectionStatus.includes("failed") ? "text-red-400" : ""}>
                    {server3.connectionStatus}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={connectAll}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!inputUrl1.trim() && !inputUrl2.trim() && !inputUrl3.trim()}
            >
              Connect to Servers
            </Button>

            <div className="border-t border-gray-600 pt-4">
              <h3 className="text-white font-semibold mb-2">Setup Instructions:</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>
                  1. Configure computers in <strong>Admin → Computer Management</strong> (recommended)
                </li>
                <li>2. Or manually enter computer details below</li>
                <li>3. Run the countdown app on your computers</li>
                <li>4. Select from configured computers or enter URLs manually</li>
                <li>5. You can connect to 1, 2, or 3 computers as needed</li>
                <li>6. All timers will update in real-time</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const connectedServers = [server1, server2, server3].filter((server) => server.isConnected)
  const gridCols =
    connectedServers.length === 1
      ? "grid-cols-1"
      : connectedServers.length === 2
        ? "lg:grid-cols-2"
        : "xl:grid-cols-3 lg:grid-cols-2"

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">Multi-Computer Display</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSetup(true)}
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Settings
            </Button>
            <Button
              onClick={disconnect}
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Disconnect All
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className={`grid ${gridCols} gap-6`}>
            {server1.isConnected && renderTimerDisplay(server1)}
            {server2.isConnected && renderTimerDisplay(server2)}
            {server3.isConnected && renderTimerDisplay(server3)}
          </div>
        </div>
      </div>
    </div>
  )
}
