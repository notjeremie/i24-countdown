@echo off
echo i24 Countdown - PM2 Status
echo ==========================
echo.

pm2 list
echo.
echo Recent logs:
echo -----------
pm2 logs i24-countdown-prod --lines 10 2>nul
pm2 logs i24-countdown-dev --lines 10 2>nul

echo.
echo Commands:
echo - pm2 restart i24-countdown-prod (restart production)
echo - pm2 logs i24-countdown-prod (view logs)
echo - pm2 monit (monitoring dashboard)
echo.
pause
