@echo off
echo Installing i24 Countdown as Windows Service...
echo.
echo This requires administrator privileges.
echo Right-click and "Run as Administrator" if needed.
echo.

cd /d "%~dp0.."

:: Install PM2 globally if not already installed
npm install -g pm2
npm install -g pm2-windows-service

:: Create PM2 ecosystem file
echo module.exports = { > ecosystem.config.js
echo   apps: [{ >> ecosystem.config.js
echo     name: 'i24-countdown', >> ecosystem.config.js
echo     script: 'npm', >> ecosystem.config.js
echo     args: 'start', >> ecosystem.config.js
echo     cwd: '%CD%', >> ecosystem.config.js
echo     instances: 1, >> ecosystem.config.js
echo     autorestart: true, >> ecosystem.config.js
echo     watch: false, >> ecosystem.config.js
echo     max_memory_restart: '1G', >> ecosystem.config.js
echo     env: { >> ecosystem.config.js
echo       NODE_ENV: 'production', >> ecosystem.config.js
echo       PORT: 3000 >> ecosystem.config.js
echo     } >> ecosystem.config.js
echo   }] >> ecosystem.config.js
echo }; >> ecosystem.config.js

:: Build the application
echo Building application...
npm run build

:: Install as Windows service
pm2-service-install
pm2 start ecosystem.config.js
pm2 save

echo.
echo ✅ Service installed successfully!
echo.
echo The i24 Countdown app will now start automatically with Windows.
echo.
echo URLs:
echo - OBS Browser Source: http://localhost:3000/network-display
echo - Stream Deck API: http://localhost:3000/api/offline
echo.
echo To manage the service:
echo - pm2 list (show status)
echo - pm2 restart i24-countdown
echo - pm2 stop i24-countdown
echo - pm2 delete i24-countdown (to remove)
echo.
pause
