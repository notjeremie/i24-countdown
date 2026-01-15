import { type NextRequest, NextResponse } from "next/server"
import { getAllLabels, addLabel, updateLabel, deleteLabel, reorderLabels } from "@/lib/labels"

export async function GET() {
  try {
    const labels = getAllLabels()
    return NextResponse.json({ success: true, labels })
  } catch (error) {
    console.error("Failed to get labels:", error)
    return NextResponse.json({ error: "Failed to get labels" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, id, text, labelIds } = await request.json()

    switch (action) {
      case "add":
        if (!text || typeof text !== "string") {
          return NextResponse.json({ error: "Text is required" }, { status: 400 })
        }
        const newLabel = addLabel(text)
        const labelsAfterAdd = getAllLabels()
        return NextResponse.json({ success: true, labels: labelsAfterAdd, newLabel })

      case "update":
        if (!id || !text || typeof text !== "string") {
          return NextResponse.json({ error: "ID and text are required" }, { status: 400 })
        }
        const updatedLabel = updateLabel(id, text)
        if (!updatedLabel) {
          return NextResponse.json({ error: "Label not found" }, { status: 404 })
        }
        const labelsAfterUpdate = getAllLabels()
        return NextResponse.json({ success: true, labels: labelsAfterUpdate, updatedLabel })

      case "delete":
        if (!id) {
          return NextResponse.json({ error: "ID is required" }, { status: 400 })
        }
        const deleted = deleteLabel(id)
        if (!deleted) {
          return NextResponse.json({ error: "Label not found" }, { status: 404 })
        }
        const labelsAfterDelete = getAllLabels()
        return NextResponse.json({ success: true, labels: labelsAfterDelete })

      case "reorder":
        if (!Array.isArray(labelIds)) {
          return NextResponse.json({ error: "Label IDs array is required" }, { status: 400 })
        }
        reorderLabels(labelIds)
        const labelsAfterReorder = getAllLabels()
        return NextResponse.json({ success: true, labels: labelsAfterReorder })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Labels API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
