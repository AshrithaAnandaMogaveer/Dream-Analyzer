@echo off
echo Checking Backend Status...
echo ========================

echo Testing backend health endpoint...
curl -s http://localhost:5000/api/health >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Backend server is running on localhost:5000
    curl -s http://localhost:5000/api/health
    echo.
) else (
    echo ❌ Backend server is NOT running on localhost:5000
    echo.
    echo Please ensure the backend server is running:
    echo 1. Open a new terminal/command prompt
    echo 2. Navigate to the server directory:
    echo    cd "DREAM ANALYZER\DREAM ANALYZER\DREAM ANALYZER\server"
    echo 3. Start the server:
    echo    npm start
    echo.
)

echo Press any key to continue...
pause > nul
