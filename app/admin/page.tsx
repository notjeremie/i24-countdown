"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Settings, Tags } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const router = useRouter()

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
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
        </div>

        {/* Admin Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={() => router.push("/admin/labels")}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <Tags className="w-6 h-6" />
                Label Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Manage timer labels, configure Stream Deck commands, and view keyboard shortcuts.
              </p>
            </CardContent>
          </Card>

          <Card
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={() => router.push("/admin/computers")}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <Settings className="w-6 h-6" />
                Computer Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Configure computer IPs and names for multi-display functionality.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
