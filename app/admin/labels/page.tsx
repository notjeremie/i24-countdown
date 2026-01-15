"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, GripVertical, Save, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface Label {
  id: string
  text: string
  order: number
}

export default function LabelsAdminPage() {
  const [labels, setLabels] = useState<Label[]>([])
  const [newLabelText, setNewLabelText] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

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
    } finally {
      setIsLoading(false)
    }
  }

  const addLabel = async () => {
    if (!newLabelText.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", text: newLabelText.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setLabels(data.labels)
        setNewLabelText("")
      }
    } catch (error) {
      console.error("Failed to add label:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateLabel = async (id: string, text: string) => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id, text: text.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setLabels(data.labels)
        setEditingId(null)
        setEditingText("")
      }
    } catch (error) {
      console.error("Failed to update label:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteLabel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this label?")) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      })

      if (response.ok) {
        const data = await response.json()
        setLabels(data.labels)
      }
    } catch (error) {
      console.error("Failed to delete label:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (label: Label) => {
    setEditingId(label.id)
    setEditingText(label.text)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingText("")
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action()
    } else if (e.key === "Escape") {
      cancelEditing()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading labels...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold">Label Management</h1>
          </div>
        </div>

        {/* Add New Label */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Add New Label</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                placeholder="Enter label text (max 10 characters)"
                maxLength={10}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                onKeyPress={(e) => handleKeyPress(e, addLabel)}
              />
              <Button
                onClick={addLabel}
                disabled={!newLabelText.trim() || isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Label
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Labels List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Current Labels ({labels.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {labels.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No labels configured. Add your first label above.</div>
            ) : (
              <div className="space-y-2">
                {labels.map((label, index) => (
                  <div
                    key={label.id}
                    className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg border border-gray-600"
                  >
                    {/* Drag Handle */}
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />

                    {/* Order Number */}
                    <div className="w-8 text-center text-gray-400 font-mono">{index + 1}</div>

                    {/* Label Text */}
                    <div className="flex-1">
                      {editingId === label.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            maxLength={10}
                            className="bg-gray-600 border-gray-500 text-white"
                            onKeyPress={(e) => handleKeyPress(e, () => updateLabel(label.id, editingText))}
                            autoFocus
                          />
                          <Button
                            onClick={() => updateLabel(label.id, editingText)}
                            disabled={!editingText.trim() || isSaving}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            size="sm"
                            variant="outline"
                            className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(label)}
                          className="cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors"
                        >
                          <div className="text-yellow-400 font-bold text-lg">{label.text}</div>
                          <div className="text-gray-400 text-sm">Click to edit</div>
                        </div>
                      )}
                    </div>

                    {/* Stream Deck Info */}
                    <div className="text-right">
                      <div className="text-gray-300 text-sm font-mono">Label {index + 1}</div>
                      <div className="text-gray-500 text-xs">Stream Deck ID</div>
                    </div>

                    {/* Delete Button */}
                    {editingId !== label.id && (
                      <Button
                        onClick={() => deleteLabel(label.id)}
                        disabled={isSaving}
                        size="sm"
                        variant="outline"
                        className="bg-red-900/30 border-red-500 text-red-400 hover:bg-red-900/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stream Deck Commands */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Stream Deck Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-gray-300">
              <p>Use these API calls in your Stream Deck buttons. All commands use POST method to:</p>
              <div className="bg-gray-900 p-2 rounded font-mono text-green-400 text-center">
                http://localhost:3000/api/offline
              </div>

              {/* UPDATED: Simplified Timer Control */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">⏱️ Timer Control (SIMPLIFIED)</h4>
                <div className="bg-gray-900 p-4 rounded-lg p-4 mb-4">
                  <div className="text-gray-300 text-sm font-bold mb-2">🎉 NEW SIMPLIFIED COMMANDS:</div>
                  <div className="text-gray-300 text-xs space-y-1">
                    <div>
                      • <strong>START button</strong> = Start timer from input OR Resume paused timer
                    </div>
                    <div>
                      • <strong>PAUSE button</strong> = Only pause running timer
                    </div>
                    <div>• No more confusing pause/resume toggle!</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">START / RESUME:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "start"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">
                      • Starts timer from input mode
                      <br />• OR resumes paused timer
                      <br />• Smart: works in both situations!
                    </div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-orange-400 mb-2 font-bold">PAUSE ONLY:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "pause"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">
                      • Only pauses running timer
                      <br />• Does nothing if not running
                      <br />• Simple and predictable!
                    </div>
                  </div>
                </div>
              </div>

              {/* Label Commands */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🏷️ Label Commands</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Set Label for Selected Timer:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "setLabel",
  "labelIndex": 1
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">
                      Replace labelIndex with 1-{labels.length}. Works on currently selected timer.
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="text-blue-400 text-sm font-bold mb-1">💡 How it works:</div>
                  <div className="text-gray-300 text-xs">
                    1. First use "selectTimer" to choose Timer 1 (timerId: 0) or Timer 2 (timerId: 1)
                    <br />
                    2. Then use "setLabel" with the desired labelIndex
                    <br />
                    3. The label will be applied to whichever timer is currently selected
                  </div>
                </div>
              </div>

              {/* Timer Selection */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🎯 Timer Selection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Select Timer 1:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "selectTimer",
  "timerId": 0
}`}
                    </div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Select Timer 2:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "selectTimer",
  "timerId": 1
}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Number Input */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🔢 Number Input</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="bg-gray-900 p-3 rounded-lg text-center">
                      <div className="text-green-400 mb-1 font-bold">{num}</div>
                      <div className="text-gray-300 text-sm font-mono">
                        {`{
  "action": "number",
  "value": ${num}
}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Commands */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🔧 Other Commands</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Reset:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "reset"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Stops and clears selected timer</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-red-400 mb-2 font-bold">Reset Both:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "resetBoth"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Stops and clears BOTH timers at once</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Backspace:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "backspace"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Removes last entered digit</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Set Time Directly:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "setTime",
  "value": "123045"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Sets time as 12:30:45</div>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🔄 Mode Selection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Count UP Mode:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "modeUp"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Timer counts upward from entered time</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Count DOWN Mode:</div>
                    <div className="text-gray-300 text-sm font-mono">
                      {`{
  "action": "modeDown"
}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Timer counts down to zero (default)</div>
                  </div>
                </div>
              </div>

              {/* API Response Status */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">📡 API Response Status</h4>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="text-green-400 mb-2 font-bold">Response includes status fields:</div>
                  <div className="text-gray-300 text-sm font-mono">
                    {`{
  "success": true,
  "timers": [
    {
      "id": 0,
      "status": "playing", // "input", "playing", "paused", "finished"
      ...
    }
  ],
  "selectedTimerStatus": "playing",
  "timer1Status": "playing",
  "timer2Status": "paused"
}`}
                  </div>
                  <div className="text-gray-500 text-xs mt-2">
                    Use these status fields in Stream Deck for conditional button states
                  </div>
                </div>
              </div>

              {/* Usage Notes */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-white font-bold mb-3">📝 Usage Notes:</h4>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>
                    • <strong>Timer IDs:</strong> Timer 1 = 0, Timer 2 = 1
                  </li>
                  <li>
                    • <strong>Label Index:</strong> Labels are numbered 1, 2, 3... in the order shown above
                  </li>
                  <li>
                    • <strong>Time Format:</strong> Enter as HHMMSS (e.g., "123045" = 12:30:45)
                  </li>
                  <li>
                    • <strong>Auto Count Up:</strong> If you press START with 00:00:00, it automatically counts UP
                  </li>
                  <li>
                    • <strong>Selected Timer:</strong> Most commands affect the currently selected timer
                  </li>
                  <li>
                    • <strong>Labels Persist:</strong> Labels are preserved when timers finish or reset
                  </li>
                  <li>
                    • <strong>NEW: Smart START:</strong> One button for both starting and resuming!
                  </li>
                </ul>
              </div>

              {/* Quick Setup Guide */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-white font-bold mb-3">🚀 Quick Setup Guide:</h4>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <ol className="text-sm text-gray-300 space-y-2">
                    <li>
                      <strong>1.</strong> Create Stream Deck buttons for each command above
                    </li>
                    <li>
                      <strong>2.</strong> Use "System: Website" action in Stream Deck
                    </li>
                    <li>
                      <strong>3.</strong> Set Method to "POST" and Content-Type to "application/json"
                    </li>
                    <li>
                      <strong>4.</strong> Copy the JSON payload into the request body
                    </li>
                    <li>
                      <strong>5.</strong> Test each button to ensure it works correctly
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-gray-300">
              <p>Use these keyboard shortcuts when controlling timers from the desktop interface:</p>

              {/* Navigation */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🎯 Timer Navigation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Arrow Up ↑</div>
                    <div className="text-gray-500 text-sm">Select previous timer</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Arrow Down ↓</div>
                    <div className="text-gray-500 text-sm">Select next timer</div>
                  </div>
                </div>
              </div>

              {/* Number Input */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🔢 Time Input</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="bg-gray-900 p-3 rounded-lg text-center">
                      <div className="text-green-400 mb-1 font-bold">{num}</div>
                      <div className="text-gray-500 text-xs">Add digit</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">🔄 Mode Selection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">+ (Plus/NumPad+)</div>
                    <div className="text-gray-500 text-sm">Select COUNT UP mode</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">- (Minus/NumPad-)</div>
                    <div className="text-gray-500 text-sm">Select COUNT DOWN mode</div>
                  </div>
                </div>
              </div>

              {/* Timer Control */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">⏱️ Timer Control</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Enter</div>
                    <div className="text-gray-500 text-sm">Start timer (input mode) or Pause/Resume (running)</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Backspace</div>
                    <div className="text-gray-500 text-sm">Remove last digit (input mode)</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Delete</div>
                    <div className="text-gray-500 text-sm">Reset timer completely</div>
                  </div>
                </div>
              </div>

              {/* Special Behaviors */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center">⚡ Special Behaviors</h4>
                <div className="space-y-3">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Number key on running timer</div>
                    <div className="text-gray-500 text-sm">Stops timer and switches to input mode with that number</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Enter with 00:00:00</div>
                    <div className="text-gray-500 text-sm">Automatically starts counting UP from zero</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-green-400 mb-2 font-bold">Click timer display</div>
                    <div className="text-gray-500 text-sm">Select timer (input mode) or Reset timer (running mode)</div>
                  </div>
                </div>
              </div>

              {/* Usage Notes */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-white font-bold mb-3">📝 Usage Notes:</h4>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>
                    • <strong>Time Format:</strong> Enter time as HHMMSS (e.g., type "123045" for 12:30:45)
                  </li>
                  <li>
                    • <strong>Selected Timer:</strong> Yellow ring indicates which timer will receive keyboard input
                  </li>
                  <li>
                    • <strong>Auto Mode:</strong> If no mode selected, defaults to COUNT DOWN
                  </li>
                  <li>
                    • <strong>Labels:</strong> Use dropdown or click label area to assign labels to timers
                  </li>
                  <li>
                    • <strong>Visual States:</strong> Red = countdown, Green = count up, Gray = finished/paused
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
