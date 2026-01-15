@echo off
echo Setting up PM2 for i24 Countdown (Production Mode)
echo ================================================
echo.

cd /d "%~dp0.."

echo Step 1: Building the application...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Stopping any existing PM2 processes...
pm2 delete i24-countdown-prod 2>nul
pm2 delete i24-countdown-dev 2>nul

echo.
echo Step 3: Starting production server with PM2...
pm2 start ecosystem.config.js --only i24-countdown-prod

echo.
echo Step 4: Saving PM2 configuration...
pm2 save

echo.
echo ✅ Setup complete!
echo.
echo The server is now running in production mode and will auto-start with Windows.
echo.
echo URLs:
echo - OBS Browser Source: http://localhost:3000/network-display
echo - Stream Deck API: http://localhost:3000/api/offline
echo.
echo PM2 Commands:
echo - pm2 list (show status)
echo - pm2 restart i24-countdown-prod
echo - pm2 logs i24-countdown-prod (show logs)
echo - pm2 monit (monitoring dashboard)
echo.
pause
