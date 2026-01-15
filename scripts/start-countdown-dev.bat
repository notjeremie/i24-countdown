@echo off
echo Starting i24 Countdown Server (Development Mode)...
echo.
echo The server will start automatically with hot reload.
echo You can close this window once you see "Ready" message.
echo.
echo OBS Browser Source URL: http://localhost:3000/network-display
echo Stream Deck API URL: http://localhost:3000/api/offline
echo.

cd /d "%~dp0.."
npm run dev

pause
