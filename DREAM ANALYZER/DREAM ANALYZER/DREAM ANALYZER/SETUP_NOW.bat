@echo off
echo ========================================
echo DREAM ANALYZER - QUICK SETUP
echo ========================================
echo.

echo Step 1: Get your OpenAI API Key
echo ----------------------------------------
echo 1. Open this link in your browser:
echo    https://platform.openai.com/api-keys
echo.
echo 2. Log in or create account
echo 3. Click "Create new secret key"
echo 4. Copy the key (starts with sk-)
echo.
pause

echo.
echo Step 2: Enter your API key
echo ----------------------------------------
set /p APIKEY="Paste your OpenAI API key here: "

echo.
echo Updating .env file...
powershell -Command "(Get-Content server\.env) -replace 'OPENAI_API_KEY=.*', 'OPENAI_API_KEY=%APIKEY%' | Set-Content server\.env"

echo.
echo ✓ API key configured!
echo.

echo Step 3: Starting servers...
echo ----------------------------------------
echo.

echo Starting Backend Server...
start cmd /k "cd server && npm start"

timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start cmd /k "cd client && npm start"

echo.
echo ========================================
echo ✓ SETUP COMPLETE!
echo ========================================
echo.
echo Two terminal windows opened:
echo 1. Backend (server) - Port 5000
echo 2. Frontend (client) - Port 3000
echo.
echo Browser will open automatically at:
echo http://localhost:3000
echo.
echo Go to /chatbot and test your dreams!
echo.
pause
