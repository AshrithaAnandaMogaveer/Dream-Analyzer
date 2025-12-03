# Dream Analyzer System Verification Script
# This script checks if all components are properly configured

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dream Analyzer System Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: Node.js installed
Write-Host "✓ Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found!" -ForegroundColor Red
    $allGood = $false
}

# Check 2: MongoDB running
Write-Host "✓ Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue
    if ($mongoTest.TcpTestSucceeded) {
        Write-Host "  ✅ MongoDB is running on port 27017" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  MongoDB not detected on port 27017" -ForegroundColor Yellow
        Write-Host "     Start MongoDB before running the app" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not check MongoDB status" -ForegroundColor Yellow
}

# Check 3: Server dependencies
Write-Host "✓ Checking server dependencies..." -ForegroundColor Yellow
if (Test-Path "server\node_modules") {
    Write-Host "  ✅ Server dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ Server dependencies missing! Run: cd server && npm install" -ForegroundColor Red
    $allGood = $false
}

# Check 4: Client dependencies
Write-Host "✓ Checking client dependencies..." -ForegroundColor Yellow
if (Test-Path "client\node_modules") {
    Write-Host "  ✅ Client dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ Client dependencies missing! Run: cd client && npm install" -ForegroundColor Red
    $allGood = $false
}

# Check 5: Environment files
Write-Host "✓ Checking environment files..." -ForegroundColor Yellow
if (Test-Path "server\.env") {
    Write-Host "  ✅ Server .env file exists" -ForegroundColor Green
    
    # Check for OpenAI API key
    $envContent = Get-Content "server\.env" -Raw
    if ($envContent -match "OPENAI_API_KEY=sk-") {
        Write-Host "  ✅ OpenAI API key configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  OpenAI API key not configured" -ForegroundColor Yellow
        Write-Host "     Add your API key to server\.env" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Server .env file missing" -ForegroundColor Yellow
}

if (Test-Path "client\.env") {
    Write-Host "  ✅ Client .env file exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Client .env file missing (optional)" -ForegroundColor Yellow
}

# Check 6: Key files
Write-Host "✓ Checking key files..." -ForegroundColor Yellow
$keyFiles = @(
    "client\src\App.js",
    "client\src\contexts\AuthContext.js",
    "client\src\contexts\SocketContext.js",
    "client\src\pages\CommunityPage.js",
    "server\index.js",
    "server\services\aiService.js",
    "server\models\CommunityPost.js"
)

$missingFiles = @()
foreach ($file in $keyFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host "  ✅ All key files present" -ForegroundColor Green
} else {
    Write-Host "  ❌ Missing files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "     - $file" -ForegroundColor Red
    }
    $allGood = $false
}

# Check 7: Port availability
Write-Host "✓ Checking port availability..." -ForegroundColor Yellow
$port3000 = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
$port5000 = Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue

if (-not $port3000.TcpTestSucceeded) {
    Write-Host "  ✅ Port 3000 available for React" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Port 3000 already in use" -ForegroundColor Yellow
}

if (-not $port5000.TcpTestSucceeded) {
    Write-Host "  ✅ Port 5000 available for Node.js" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Port 5000 already in use" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ✅ SYSTEM READY TO RUN!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Start the application with:" -ForegroundColor White
    Write-Host "  1. cd server; npm start" -ForegroundColor Cyan
    Write-Host "  2. cd client; npm start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Or use: npm run dev (from root)" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  PLEASE FIX ISSUES ABOVE" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if fixes document exists
if (Test-Path "ALL_FIXES_COMPLETE.md") {
    Write-Host "📄 See ALL_FIXES_COMPLETE.md for detailed fix information" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
