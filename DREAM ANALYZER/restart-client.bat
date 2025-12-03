@echo off
echo Restarting Frontend Client...
echo =============================

echo Stopping any existing React processes...
taskkill /f /im node.exe >nul 2>&1

timeout /t 2 /nobreak > nul

echo Starting Frontend Client...
cd DREAM ANALYZER\DREAM ANALYZER\DREAM ANALYZER\client
npm start

echo Frontend client restarted!
