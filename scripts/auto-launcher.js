const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")

console.log("🚀 i24 Countdown Auto-Launcher")
console.log("================================")
console.log("")
console.log("📺 OBS Browser Source URL: http://localhost:3000/network-display")
console.log("🎛️  Stream Deck API URL: http://localhost:3000/api/offline")
console.log("")

// Get project root directory
const projectRoot = path.join(__dirname, "..")

// Check if we're in development or production
const isDev = process.argv.includes("--dev")
const command = isDev ? "dev" : "start"

console.log(`🔧 Mode: ${isDev ? "Development" : "Production"}`)
console.log("")

// Build first if production
if (!isDev) {
  console.log("📦 Building application...")
  const buildProcess = spawn("npm", ["run", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  })

  buildProcess.on("close", (code) => {
    if (code === 0) {
      startServer()
    } else {
      console.error("❌ Build failed")
      process.exit(1)
    }
  })
} else {
  startServer()
}

function startServer() {
  console.log("🌐 Starting server...")
  console.log("")

  const serverProcess = spawn("npm", ["run", command], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  })

  serverProcess.on("close", (code) => {
    console.log(`Server exited with code ${code}`)
  })

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down server...")
    serverProcess.kill("SIGINT")
    process.exit(0)
  })
}
