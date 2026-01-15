// Global label management
export interface Label {
  id: string
  text: string
  order: number
}

// Initialize with some default labels
const defaultLabels: Label[] = [
  { id: "1", text: "", order: 1 }, // Empty label first
  { id: "2", text: "VTR", order: 2 },
  { id: "3", text: "BREAK", order: 3 },
  { id: "4", text: "LIVE", order: 4 },
  { id: "5", text: "SPORT", order: 5 },
  { id: "6", text: "TALK", order: 6 },
  { id: "7", text: "Q&A", order: 7 },
]

// In-memory storage (in production, this would be a database)
const labels: Label[] = [...defaultLabels]

export function getAllLabels(): Label[] {
  return labels.sort((a, b) => a.order - b.order)
}

export function getLabelById(id: string): Label | undefined {
  return labels.find((label) => label.id === id)
}

export function addLabel(text: string): Label {
  const newLabel: Label = {
    id: Date.now().toString(),
    text: text.slice(0, 10), // Limit to 10 characters
    order: Math.max(...labels.map((l) => l.order), 0) + 1,
  }
  labels.push(newLabel)
  return newLabel
}

export function updateLabel(id: string, text: string): Label | null {
  const label = labels.find((l) => l.id === id)
  if (label) {
    label.text = text.slice(0, 10)
    return label
  }
  return null
}

export function deleteLabel(id: string): boolean {
  const index = labels.findIndex((l) => l.id === id)
  if (index !== -1) {
    labels.splice(index, 1)
    return true
  }
  return false
}

export function reorderLabels(labelIds: string[]): void {
  labelIds.forEach((id, index) => {
    const label = labels.find((l) => l.id === id)
    if (label) {
      label.order = index + 1
    }
  })
}
