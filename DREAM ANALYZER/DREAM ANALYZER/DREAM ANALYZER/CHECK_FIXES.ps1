# Dream Analyzer - Simple Fix Verification
Write-Host "========================================"
Write-Host "  VERIFYING ALL FIXES"
Write-Host "========================================"
Write-Host ""

$passed = 0
$failed = 0

# Check 1: React Router
Write-Host "1. React Router v7 flags..." -NoNewline
if ((Get-Content "client\src\App.js" -Raw) -match "v7_startTransition") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 2: Chart.js Filler
Write-Host "2. Chart.js Filler plugin..." -NoNewline
if ((Get-Content "client\src\pages\ChatbotPage.js" -Raw) -match "Filler") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 3: Favicon
Write-Host "3. Favicon exists..." -NoNewline
if (Test-Path "client\public\favicon.ico") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 4: AI Retry Logic
Write-Host "4. AI retry logic..." -NoNewline
if ((Get-Content "server\services\aiService.js" -Raw) -match "retryWithBackoff") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 5: Error Boundary
Write-Host "5. Error Boundary..." -NoNewline
if (Test-Path "client\src\components\ErrorBoundary.js") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 6: Socket Reconnect
Write-Host "6. Socket auto-reconnect..." -NoNewline
if ((Get-Content "client\src\contexts\SocketContext.js" -Raw) -match "reconnection: true") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 7: ESLint
Write-Host "7. ESLint config..." -NoNewline
if (Test-Path "client\.eslintrc.json") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 8: OpenAI Key
Write-Host "8. OpenAI API Key..." -NoNewline
if ((Get-Content "server\.env" -Raw) -match "OPENAI_API_KEY=sk-") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " WARN" -ForegroundColor Yellow
}

# Check 9: CORS
Write-Host "9. CORS config..." -NoNewline
if ((Get-Content "server\index.js" -Raw) -match "cors\(") {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $failed++
}

# Check 10: Dependencies
Write-Host "10. Dependencies..." -NoNewline
if ((Test-Path "client\node_modules") -and (Test-Path "server\node_modules")) {
    Write-Host " PASS" -ForegroundColor Green
    $passed++
} else {
    Write-Host " WARN - Run: npm run install-all" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================"
Write-Host "  PASSED: $passed | FAILED: $failed"
Write-Host "========================================"
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All fixes verified! Ready to start." -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "Some fixes need attention." -ForegroundColor Red
}

Write-Host ""
