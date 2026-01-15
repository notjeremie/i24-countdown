"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, ArrowLeft, Save, Monitor } from "lucide-react"
import { useRouter } from "next/navigation"

interface Computer {
  id: string
  name: string
  ip: string
  port: string
}

export default function ComputersAdminPage() {
  const [computers, setComputers] = useState<Computer[]>([])
  const [newComputer, setNewComputer] = useState({ name: "", ip: "", port: "3000" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingComputer, setEditingComputer] = useState({ name: "", ip: "", port: "3000" })
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // Load computers from localStorage on mount
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

  // Save computers to localStorage
  const saveComputers = (updatedComputers: Computer[]) => {
    localStorage.setItem("countdown-computers", JSON.stringify(updatedComputers))
    setComputers(updatedComputers)
  }

  const addComputer = () => {
    if (!newComputer.name.trim() || !newComputer.ip.trim()) return

    const computer: Computer = {
      id: Date.now().toString(),
      name: newComputer.name.trim(),
      ip: newComputer.ip.trim(),
      port: newComputer.port.trim() || "3000",
    }

    const updated = [...computers, computer]
    saveComputers(updated)
    setNewComputer({ name: "", ip: "", port: "3000" })
  }

  const updateComputer = (id: string) => {
    if (!editingComputer.name.trim() || !editingComputer.ip.trim()) return

    const updated = computers.map((comp) =>
      comp.id === id
        ? {
            ...comp,
            name: editingComputer.name.trim(),
            ip: editingComputer.ip.trim(),
            port: editingComputer.port.trim() || "3000",
          }
        : comp,
    )
    saveComputers(updated)
    setEditingId(null)
    setEditingComputer({ name: "", ip: "", port: "3000" })
  }

  const deleteComputer = (id: string) => {
    if (!confirm("Are you sure you want to delete this computer?")) return
    const updated = computers.filter((comp) => comp.id !== id)
    saveComputers(updated)
  }

  const startEditing = (computer: Computer) => {
    setEditingId(computer.id)
    setEditingComputer({ name: computer.name, ip: computer.ip, port: computer.port })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingComputer({ name: "", ip: "", port: "3000" })
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/admin")}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Computer Management</h1>
          </div>
        </div>

        {/* Add New Computer */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Add New Computer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                value={newComputer.name}
                onChange={(e) => setNewComputer({ ...newComputer, name: e.target.value })}
                placeholder="Computer name (e.g., Studio A)"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Input
                value={newComputer.ip}
                onChange={(e) => setNewComputer({ ...newComputer, ip: e.target.value })}
                placeholder="IP address (e.g., 192.168.1.100)"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Input
                value={newComputer.port}
                onChange={(e) => setNewComputer({ ...newComputer, port: e.target.value })}
                placeholder="Port (default: 3000)"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                onClick={addComputer}
                disabled={!newComputer.name.trim() || !newComputer.ip.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Computer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Computers List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Configured Computers ({computers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {computers.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No computers configured. Add your first computer above.
              </div>
            ) : (
              <div className="space-y-4">
                {computers.map((computer) => (
                  <div
                    key={computer.id}
                    className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg border border-gray-600"
                  >
                    <Monitor className="w-6 h-6 text-blue-400" />

                    <div className="flex-1">
                      {editingId === computer.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <Input
                            value={editingComputer.name}
                            onChange={(e) => setEditingComputer({ ...editingComputer, name: e.target.value })}
                            placeholder="Computer name"
                            className="bg-gray-600 border-gray-500 text-white"
                          />
                          <Input
                            value={editingComputer.ip}
                            onChange={(e) => setEditingComputer({ ...editingComputer, ip: e.target.value })}
                            placeholder="IP address"
                            className="bg-gray-600 border-gray-500 text-white"
                          />
                          <Input
                            value={editingComputer.port}
                            onChange={(e) => setEditingComputer({ ...editingComputer, port: e.target.value })}
                            placeholder="Port"
                            className="bg-gray-600 border-gray-500 text-white"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(computer)}
                          className="cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors"
                        >
                          <div className="text-yellow-400 font-bold text-lg">{computer.name}</div>
                          <div className="text-gray-300">
                            http://{computer.ip}:{computer.port}
                          </div>
                          <div className="text-gray-500 text-sm">Click to edit</div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {editingId === computer.id ? (
                        <>
                          <Button
                            onClick={() => updateComputer(computer.id)}
                            disabled={!editingComputer.name.trim() || !editingComputer.ip.trim()}
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
                        </>
                      ) : (
                        <Button
                          onClick={() => deleteComputer(computer.id)}
                          size="sm"
                          variant="outline"
                          className="bg-red-900/30 border-red-500 text-red-400 hover:bg-red-900/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Usage Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-gray-300">
              <p>Configure computers here to use them in the Multi-Display page:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Add each computer with a descriptive name and its network IP address</li>
                <li>Make sure each computer is running the countdown app on the specified port</li>
                <li>
                  Go to <strong>/multi-display</strong> to select which computers to display
                </li>
                <li>Use dropdown menus to choose from your configured computers</li>
              </ol>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
                <div className="text-blue-400 text-sm font-bold mb-2">💡 Network Setup Tips:</div>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• All computers should be on the same network</li>
                  <li>• Use static IP addresses or DHCP reservations for consistency</li>
                  <li>• Default port is 3000, change if needed</li>
                  <li>• Test connectivity by visiting http://IP:PORT in a browser</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
