# PowerShell script to start the countdown server
Write-Host "Starting i24 Countdown Server..." -ForegroundColor Green
Write-Host ""
Write-Host "OBS Browser Source URL: http://localhost:3000/network-display" -ForegroundColor Yellow
Write-Host "Stream Deck API URL: http://localhost:3000/api/offline" -ForegroundColor Yellow
Write-Host ""

# Get the script directory and navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# Build and start the application
Write-Host "Building application..." -ForegroundColor Blue
npm run build

Write-Host "Starting server..." -ForegroundColor Blue
npm start
