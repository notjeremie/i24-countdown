@echo off
echo Rebuilding and Restarting i24 Countdown
echo =======================================
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
echo Step 2: Restarting PM2 process...
pm2 restart i24-countdown-prod

echo.
echo ✅ Rebuild and restart complete!
echo.
echo The server is now running the latest version.
echo.
pause
