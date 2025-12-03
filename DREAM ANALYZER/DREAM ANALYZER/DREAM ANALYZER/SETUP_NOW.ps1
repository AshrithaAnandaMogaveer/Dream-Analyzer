# Dream Analyzer - Automated Setup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DREAM ANALYZER - AUTOMATED SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get API Key
Write-Host "Step 1: OpenAI API Key Required" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host "1. Opening OpenAI API Keys page in browser..." -ForegroundColor White
Start-Process "https://platform.openai.com/api-keys"
Write-Host ""
Write-Host "2. Log in and create a new secret key" -ForegroundColor White
Write-Host "3. Copy the key (starts with 'sk-')" -ForegroundColor White
Write-Host ""

$apiKey = Read-Host "Paste your OpenAI API key here"

if ($apiKey -eq "" -or $apiKey -eq "PLEASE_ADD_YOUR_OPENAI_KEY_HERE") {
    Write-Host ""
    Write-Host "❌ ERROR: Valid API key required!" -ForegroundColor Red
    Write-Host "Please get your key from: https://platform.openai.com/api-keys" -ForegroundColor Red
    pause
    exit
}

# Step 2: Update .env file
Write-Host ""
Write-Host "Step 2: Configuring Environment" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$envPath = "server\.env"
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace 'OPENAI_API_KEY=.*', "OPENAI_API_KEY=$apiKey"
Set-Content $envPath $envContent

Write-Host "✓ API key configured successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Install dependencies if needed
Write-Host "Step 3: Checking Dependencies" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

if (-not (Test-Path "server\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor White
    Set-Location server
    npm install
    Set-Location ..
    Write-Host "✓ Backend dependencies installed!" -ForegroundColor Green
}

if (-not (Test-Path "client\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor White
    Set-Location client
    npm install
    Set-Location ..
    Write-Host "✓ Frontend dependencies installed!" -ForegroundColor Green
}

Write-Host ""

# Step 4: Start servers
Write-Host "Step 4: Starting Servers" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host ""

Write-Host "Starting Backend Server (Port 5000)..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; npm start"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Two PowerShell windows opened:" -ForegroundColor White
Write-Host "  1. Backend (server) - http://localhost:5000" -ForegroundColor Cyan
Write-Host "  2. Frontend (client) - http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Browser will open automatically in a few seconds..." -ForegroundColor White
Write-Host ""
Write-Host "To test:" -ForegroundColor Yellow
Write-Host "  1. Go to http://localhost:3000/chatbot" -ForegroundColor White
Write-Host "  2. Create account / Log in" -ForegroundColor White
Write-Host "  3. Type: 'I was flying over mountains'" -ForegroundColor White
Write-Host "  4. AI should mention 'flying' and 'mountains'" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
pause
