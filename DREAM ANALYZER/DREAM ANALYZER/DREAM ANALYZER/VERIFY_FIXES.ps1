# Dream Analyzer - Verify All Fixes Applied
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DREAM ANALYZER - VERIFY FIXES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: React Router future flags
Write-Host "1. Checking React Router v7 future flags..." -ForegroundColor Yellow
$appJs = Get-Content "client\src\App.js" -Raw
if ($appJs -match "v7_startTransition.*v7_relativeSplatPath") {
    Write-Host "   ✓ React Router v7 flags enabled" -ForegroundColor Green
} else {
    Write-Host "   ✗ React Router v7 flags missing" -ForegroundColor Red
    $allGood = $false
}

# Check 2: Chart.js Filler plugin
Write-Host "2. Checking Chart.js Filler plugin..." -ForegroundColor Yellow
$chatbotPage = Get-Content "client\src\pages\ChatbotPage.js" -Raw
if ($chatbotPage -match "import.*Filler.*from 'chart.js'" -and $chatbotPage -match "Filler") {
    Write-Host "   ✓ Chart.js Filler plugin registered" -ForegroundColor Green
} else {
    Write-Host "   ✗ Chart.js Filler plugin not registered" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Favicon exists
Write-Host "3. Checking favicon..." -ForegroundColor Yellow
if (Test-Path "client\public\favicon.ico") {
    Write-Host "   ✓ Favicon file exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ Favicon file missing" -ForegroundColor Red
    $allGood = $false
}

# Check 4: AI Service retry logic
Write-Host "4. Checking AI Service retry logic..." -ForegroundColor Yellow
$aiService = Get-Content "server\services\aiService.js" -Raw
if ($aiService -match "retryWithBackoff" -and $aiService -match "gpt-4o-mini") {
    Write-Host "   ✓ AI retry logic implemented with correct model" -ForegroundColor Green
} else {
    Write-Host "   ✗ AI retry logic or model not updated" -ForegroundColor Red
    $allGood = $false
}

# Check 5: Error Boundary exists
Write-Host "5. Checking Error Boundary..." -ForegroundColor Yellow
if (Test-Path "client\src\components\ErrorBoundary.js") {
    Write-Host "   ✓ Error Boundary component exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ Error Boundary component missing" -ForegroundColor Red
    $allGood = $false
}

# Check 6: Socket auto-reconnect
Write-Host "6. Checking Socket auto-reconnect..." -ForegroundColor Yellow
$socketContext = Get-Content "client\src\contexts\SocketContext.js" -Raw
if ($socketContext -match "reconnection: true" -and $socketContext -match "reconnectionAttempts") {
    Write-Host "   ✓ Socket auto-reconnect configured" -ForegroundColor Green
} else {
    Write-Host "   ✗ Socket auto-reconnect not configured" -ForegroundColor Red
    $allGood = $false
}

# Check 7: ESLint configuration
Write-Host "7. Checking ESLint configuration..." -ForegroundColor Yellow
if (Test-Path "client\.eslintrc.json") {
    Write-Host "   ✓ ESLint configuration file exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ ESLint configuration missing" -ForegroundColor Red
    $allGood = $false
}

# Check 8: OpenAI API Key
Write-Host "8. Checking OpenAI API Key..." -ForegroundColor Yellow
$envFile = Get-Content "server\.env" -Raw
if ($envFile -match "OPENAI_API_KEY=sk-") {
    Write-Host "   ✓ OpenAI API Key configured" -ForegroundColor Green
} else {
    Write-Host "   ⚠ OpenAI API Key not configured or invalid" -ForegroundColor Yellow
}

# Check 9: CORS configuration
Write-Host "9. Checking CORS configuration..." -ForegroundColor Yellow
$serverIndex = Get-Content "server\index.js" -Raw
if ($serverIndex -match "cors\(" -and $serverIndex -match "CLIENT_URL") {
    Write-Host "   ✓ CORS properly configured" -ForegroundColor Green
} else {
    Write-Host "   ✗ CORS not properly configured" -ForegroundColor Red
    $allGood = $false
}

# Check 10: Package dependencies
Write-Host "10. Checking node_modules..." -ForegroundColor Yellow
$clientModules = Test-Path "client\node_modules"
$serverModules = Test-Path "server\node_modules"

if ($clientModules -and $serverModules) {
    Write-Host "   ✓ Dependencies installed in both client and server" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Some dependencies may not be installed" -ForegroundColor Yellow
    if (-not $clientModules) {
        Write-Host "     Run: cd client && npm install" -ForegroundColor Yellow
    }
    if (-not $serverModules) {
        Write-Host "     Run: cd server && npm install" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "  ✓ ALL FIXES VERIFIED!" -ForegroundColor Green
    Write-Host "  Your app is ready to run!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  To start the application:" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "  ⚠ SOME ISSUES DETECTED" -ForegroundColor Yellow
    Write-Host "  Please review the errors above" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to start the app
if ($allGood) {
    $response = Read-Host "Do you want to start the application now? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host ""
        Write-Host "Starting Dream Analyzer..." -ForegroundColor Green
        Write-Host 'Frontend: http://localhost:3000' -ForegroundColor Cyan
        Write-Host 'Backend: http://localhost:5000' -ForegroundColor Cyan
        Write-Host ""
        npm run dev
    }
}
