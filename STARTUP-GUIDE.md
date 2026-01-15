# i24 Countdown - Automatic Startup Guide

This guide shows you how to automatically start the countdown server without manually opening a browser.

## Quick Start Options

### Option 1: Double-Click Batch File (Easiest)
1. Double-click `scripts/start-countdown-server.bat`
2. A console window will open showing the server status
3. Once you see "Ready", the server is running
4. Configure OBS browser source to: `http://localhost:3000/network-display`
5. Configure Stream Deck API to: `http://localhost:3000/api/offline`

### Option 2: Silent Background Launch
1. Double-click `scripts/silent-launcher.vbs`
2. No console window will appear
3. A small popup will confirm the server is starting
4. The server runs completely in the background

### Option 3: Windows Startup (Auto-start with computer)
1. Press `Win + R`, type `shell:startup`, press Enter
2. Copy `scripts/start-countdown-server.bat` to this folder
3. The server will start automatically when Windows boots

### Option 4: Windows Service (Most Professional)
1. Right-click `scripts/install-as-windows-service.bat`
2. Select "Run as Administrator"
3. Follow the prompts to install as a Windows service
4. The service will start automatically with Windows and restart if it crashes

## OBS Studio Setup

1. Add a new **Browser Source**
2. Set URL to: `http://localhost:3000/network-display`
3. Set Width: `1920` Height: `1080` (or your preferred resolution)
4. Check "Shutdown source when not visible" for better performance
5. Check "Refresh browser when scene becomes active" for reliability

## Stream Deck Setup

All your existing Stream Deck buttons will work exactly the same:
- API URL: `http://localhost:3000/api/offline`
- All commands remain unchanged (start, pause, numbers, labels, etc.)

## Troubleshooting

### Server Won't Start
- Make sure Node.js is installed
- Run `npm install` in the project folder first
- Check if port 3000 is already in use

### OBS Shows "Page Not Found"
- Wait a few seconds for the server to fully start
- Refresh the browser source in OBS
- Check the console window for any error messages

### Stream Deck Commands Not Working
- Verify the server is running (check console window)
- Test the API URL in a browser: `http://localhost:3000/api/offline`
- Make sure your Stream Deck buttons use POST method with JSON content

## Advanced Configuration

### Change Port (if 3000 is in use)
1. Create a `.env.local` file in the project root
2. Add: `PORT=3001` (or any other port)
3. Update your OBS and Stream Deck URLs accordingly

### Network Access (for multiple computers)
1. Edit `app/api/offline/route.ts`
2. Change `ALLOW_NETWORK_ACCESS = true`
3. Use your computer's IP address instead of localhost
4. Example: `http://192.168.1.100:3000/network-display`

## Recommended Workflow

For live broadcast use:
1. Use **Option 4** (Windows Service) for maximum reliability
2. Set up OBS with the browser source
3. Configure all your Stream Deck buttons
4. Test everything before going live
5. The system will automatically restart if there are any issues

The server runs completely headless - you never need to open a browser manually!
