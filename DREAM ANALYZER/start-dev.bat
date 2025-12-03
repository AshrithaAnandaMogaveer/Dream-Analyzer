@echo off
echo Starting Dream Analyzer Development Environment
echo =============================================

echo Starting Backend Server...
start "Backend Server" cmd /k "cd DREAM ANALYZER\DREAM ANALYZER\DREAM ANALYZER\server && npm start"

timeout /t 5 /nobreak > nul

echo Starting Frontend Client...
start "Frontend Client" cmd /k "cd DREAM ANALYZER\DREAM ANALYZER\DREAM ANALYZER\client && npm start"

echo Development environment started!
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
