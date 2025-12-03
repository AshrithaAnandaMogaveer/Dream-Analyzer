@echo off
echo Restarting Backend Server...
echo ==========================

echo Stopping any existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1

timeout /t 2 /nobreak > nul

echo Starting Backend Server...
cd DREAM ANALYZER\DREAM ANALYZER\DREAM ANALYZER\server
npm start

echo Backend server restarted!
