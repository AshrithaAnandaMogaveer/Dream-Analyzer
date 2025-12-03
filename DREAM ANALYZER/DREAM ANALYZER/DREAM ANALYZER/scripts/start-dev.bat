@echo off
echo Starting Dream Analyzer Development Environment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing server dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error installing server dependencies
        pause
        exit /b 1
    )
)

if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    npm install
    if %errorlevel% neq 0 (
        echo Error installing client dependencies
        pause
        exit /b 1
    )
    cd ..
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy "env.example" ".env" >nul 2>&1
    if %errorlevel% neq 0 (
        echo Warning: Could not create .env file. Please create it manually.
    )
)

echo Starting development servers...
echo.
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start both servers concurrently
npm run dev
