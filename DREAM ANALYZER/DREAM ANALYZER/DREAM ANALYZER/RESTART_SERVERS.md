# RESTART SERVERS - CRITICAL

## ⚠️ YOU MUST RESTART BOTH SERVERS FOR CHANGES TO TAKE EFFECT

### Step 1: Stop Current Servers
1. Go to terminal running backend (server)
2. Press `Ctrl + C` to stop
3. Go to terminal running frontend (client)
4. Press `Ctrl + C` to stop

### Step 2: Clear Cache (Important!)
```bash
# In server directory
cd server
rm -rf node_modules/.cache
npm cache clean --force

# In client directory
cd client
rm -rf node_modules/.cache
npm cache clean --force
```

### Step 3: Restart Backend
```bash
cd server
npm start
```
Wait for: "Server running on port 5000"

### Step 4: Restart Frontend
```bash
cd client
npm start
```
Wait for: "Compiled successfully"

### Step 5: Clear Browser Cache
1. Open browser
2. Press `Ctrl + Shift + Delete`
3. Clear cache and cookies
4. Or use `Ctrl + Shift + R` for hard refresh

### Step 6: Test
1. Go to http://localhost:3000/chatbot
2. Log in
3. Type: "I was flying over mountains feeling happy"
4. Check if AI mentions "flying" and "mountains"
5. Click "Generate Image"
6. Check layout - should not overlap

## If Still Not Working:

### Check 1: Verify Files Saved
```bash
# Check aiService.js has new prompt
grep -n "ACTUAL dream content" server/services/aiService.js

# Check CSS has new grid
grep -n "45% 55%" client/src/pages/ChatbotPage.css
```

### Check 2: Check Console Errors
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### Check 3: Verify API Key
```bash
# In server/.env file
OPENAI_API_KEY=your-actual-key-here
```

### Check 4: Test Backend Directly
```bash
# Test analytics endpoint
curl -X POST http://localhost:5000/api/analytics/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "I was flying and feeling scared"}'

# Should return happiness and stress levels
```

## Expected Behavior After Restart:

✅ AI uses actual keywords from dream
✅ Analytics shows precise happiness/stress
✅ Layout doesn't overlap
✅ Image generates without buffering
✅ Each dream gets unique analysis

## If STILL Not Working:

Send me:
1. Console errors (F12 → Console)
2. Network errors (F12 → Network)
3. Server terminal output
4. Screenshot of the issue
