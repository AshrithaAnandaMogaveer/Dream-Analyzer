// === ROBUST EXPRESS GET /api/dream-diary/history HANDLERS ===

// KNEX (PostgreSQL) Variant:
// router.get('/history', async (req, res) => {
//   try {
//     console.log('GET /api/dream-diary/history req.query:', req.query);
//     console.log('GET /api/dream-diary/history req.user:', req.user);
//     console.log('GET /api/dream-diary/history req.userId:', req.userId);

//     // Safely parse page/limit
//     const page = Math.max(1, parseInt(req.query.page, 10) || 1);
//     const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
//     const offset = (page - 1) * limit;

//     // Get userId from auth
//     const userId = req.userId || req.user?.id || req.headers['x-user-id'];
//     if (!userId) {
//       return res.status(401).json({ message: 'Missing user identity' });
//     }

//     // Parameterized queries prevent SQL injection
//     const rows = await db('history')
//       .where({ user_id: userId })
//       .orderBy('created_at', 'desc')
//       .limit(limit)
//       .offset(offset);

//     const [{ count }] = await db('history').where({ user_id: userId }).count('*');

//     return res.json({
//       history: rows,
//       meta: { page, limit, total: parseInt(count, 10) }
//     });
//   } catch (err) {
//     console.error('GET /history error:', err);
//     return res.status(500).json({
//       message: 'Internal server error',
//       ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
//     });
//   }
// });

// MONGOOSE (MongoDB) Variant: [IMPLEMENTED ABOVE]

// === ROBUST REACT saveToHistory & fetchHistory FUNCTIONS ===

// Copy this into your React component's saveToHistory function:
// Replace existing saveToHistory with this comprehensive version

async function saveToHistory(entry) {
  try {
    console.log('saveToHistory called with:', entry);

    // Show loading state (if your component has setSaving)
    // setSaving(true);

    const res = await fetch('/api/dream-diary/save-history', {
      method: 'POST',
      credentials: 'include', // Important: sends cookies for session auth
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}` // If using JWT
      },
      body: JSON.stringify(entry),
    });

    const data = await res.json();
    console.log('saveToHistory response:', res.status, data);

    if (!res.ok) {
      console.error('Save failed:', data);
      throw new Error(data?.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    // SUCCESS: Use server-returned savedRecord for accurate data
    const saved = data.savedRecord || data.entry || {
      id: data.entry?._id || 'temp-' + Date.now(),
      _id: data.entry?._id,
      title: data.entry?.summary || `Lifestyle Analysis: ${entry.dreamTitle || 'Snapshot'}`,
      analysis: data.entry?.metrics || entry.lifestyleAnalysisData || {},
      createdAt: data.entry?.createdAt || new Date().toISOString(),
      userId: data.entry?.user,
      type: 'lifestyle_analysis'
    };

    console.log('Applying optimistic update with:', saved);

    // OPTIMISTIC UPDATE: Add immediately to UI state (doesn't wait for DB)
    setHistory(prev => {
      // Prevent duplicates
      if (prev.some(item => item.id === saved.id || item._id === saved.id)) {
        console.log('Item already in history, skipping duplicate');
        return prev;
      }
      return [saved, ...prev]; // Add at beginning of list
    });

    // Show success feedback
    if (typeof toast !== 'undefined') toast.success('Saved to history');

    // BACKGROUND REFETCH: Update with server data (non-blocking)
    fetchHistory().catch(err => {
      console.warn('Background fetchHistory failed (item remains in UI):', err);
      // Don't remove optimistic item - user still sees their saved content
      // Optionally add a visual indicator: item.isUnconfirmed = true
    });

    // setSaving(false);
    return saved;

  } catch (err) {
    console.error('saveToHistory failed:', err);
    // setSaving(false);

    // Show user-friendly error
    if (typeof toast !== 'undefined') {
      toast.error(`Could not save: ${err.message}`);
    }

    throw err; // Re-throw for component error handling
  }
}

// Enhanced fetchHistory with comprehensive error handling:
async function fetchHistory(page = 1, limit = 10) {
  try {
    console.log('fetchHistory called with page:', page, 'limit:', limit);

    // setLoading(true);

    const res = await fetch(`/api/dream-diary/history?page=${page}&limit=${limit}`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      }
    });

    // Get raw response for debugging
    const body = await res.text();
    console.log('fetchHistory raw status:', res.status);
    console.log('fetchHistory raw body length:', body.length);

    let data;
    try {
      data = JSON.parse(body);
      console.log('fetchHistory parsed data:', data);
    } catch(e) {
      console.error('fetchHistory JSON parse error:', e);
      data = { error: 'Invalid JSON response', raw: body.slice(0, 500) };
    }

    if (!res.ok) {
      console.error('fetchHistory failed:', res.status, data);
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }

    // Set history data - handle different response formats
    const historyItems = data.history || data.data || [];
    setHistory(historyItems);
    console.log('fetchHistory success - set', historyItems.length, 'items');

    // Optionally update pagination state
    if (data.meta) {
      // setPaginationMeta(data.meta);
      console.log('fetchHistory meta:', data.meta);
    }

    // setLoading(false);
    return historyItems;

  } catch (err) {
    console.error('fetchHistory error:', err);
    // setLoading(false);

    if (typeof toast !== 'undefined') {
      toast.error(`Failed to load history: ${err.message}`);
    }

    throw err; // Re-throw for error boundaries
  }
}

// === 3 DATABASE VALIDATION QUERIES ===

// 1. Check MongoDB Collection (using mongo shell):
// Use this to verify the saved record exists and has correct user_id
/*
mongo
use dream_analyzer

// Query EnhancedLifestyleAnalysis collection (main collection for saves)
db.enhancedlifestyleanalyses.find({ user: "6925bd55607d6bb62a76438b" }).sort({ createdAt: -1 }).limit(5).pretty()

// If no results, check the older collection name:
db.enhancedLifestyleAnalysis.find({ user: "6925bd55607d6bb62a76438b" }).sort({ createdAt: -1 }).limit(5).pretty()

// Also check basic History collection:
db.histories.find({ userId: "6925bd55607d6bb62a76438b" }).sort({ createdAt: -1 }).limit(5).pretty()
*/

// 2. Check PostgreSQL Database (using psql):
// If using Knex/PostgreSQL instead of MongoDB:
/*
psql -d dream_analyzer

-- Query history table for user's records
SELECT id, user_id, content, created_at
FROM history
WHERE user_id = '6925bd55607d6bb62a76438b'
ORDER BY created_at DESC
LIMIT 10;

-- Count user's total records
SELECT COUNT(*) as total_records
FROM history
WHERE user_id = '6925bd55607d6bb62a76438b';
*/

// 3. Node.js Script Query (run as script):
// Create check_db.js with this content:
/*
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

(async () => {
  try {
    const userId = '6925bd55607d6bb62a76438b';

    // Check EnhancedLifestyleAnalysis
    const EnhancedLifestyleAnalysis = mongoose.model('EnhancedLifestyleAnalysis');
    const items = await EnhancedLifestyleAnalysis.find({ user: userId }).sort({ createdAt: -1 }).limit(3);
    console.log('EnhancedLifestyleAnalysis items:', items.length);
    items.forEach(item => console.log('- ID:', item._id, 'Summary:', item.summary, 'Created:', item.createdAt));

    // Check History as fallback
    const History = mongoose.model('History');
    const historyItems = await History.find({ userId }).sort({ createdAt: -1 }).limit(3);
    console.log('History items:', historyItems.length);

    process.exit(0);
  } catch (err) {
    console.error('DB Check Error:', err);
    process.exit(1);
  }
})();
*/

// === VALIDATION STEP-BY-STEP ===

// To fully validate the fix:
//
// 1. Apply the robust GET handler (already done above)
// 2. Copy saveToHistory & fetchHistory functions into your React component
// 3. Restart server
// 4. Perform a save operation and watch console logs
// 5. Check that saved item appears immediately in UI (optimistic update)
// 6. Open history page and verify GET request succeeds (200 not 500)
// 7. Run one of the DB queries above to confirm data persistence
//
// Expected successful flow:
// - POST /save-history: 201 Created with savedRecord
// - UI immediately shows new item at top of history
// - GET /history: 200 OK with array including new item
// - DB query shows record with correct user_id

// === CURSOR VALIDATION COMMANDS ===

// Test POST save operation:
// curl -X POST http://localhost:5000/api/dream-diary/save-history \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer YOUR_TOKEN_HERE" \
//   -d '{"dreamTitle":"Test","lifestyleAnalysisData":{"sleep":7,"mood":5}}'

// Test GET history operation:
// curl -X GET "http://localhost:5000/api/dream-diary/history?page=1&limit=10" \
//   -H "Authorization: Bearer YOUR_TOKEN_HERE"

// Expected response format for successful GET:
// {
//   "success": true,
//   "history": [
//     {
//       "id": "...",
//       "title": "Lifestyle Analysis: Test",
//       "analysis": {"sleep":7,"mood":5},
//       "createdAt": "2025-11-25T16:51:00.000Z",
//       "type": "lifestyle_analysis"
//     }
//   ],
//   "meta": {
//     "page": 1,
//     "limit": 10,
//     "total": 1,
//     "hasMore": false
//   }
// }

// === ROOT-CAUSE CHECKLIST ===

// Most Likely Causes (ordered by probability):
//
// 1. **userId Missing**: GET /history failed because req.userId was undefined, causing auth errors (401) or query failures
//    - Validation: Check server log "GET /history userId resolved to: undefined"
//    - Fix: Ensure auth middleware sets req.userId or fallback to req.user.id works
//
// 2. **EnhancedLifestyleAnalysis Model Not Found**: mongoose.model('EnhancedLifestyleAnalysis') threw because model wasn't registered
//    - Validation: Check server log "EnhancedLifestyleAnalysis query failed" with stack trace
//    - Fix: Import model in route file or use require('../models/EnhancedLifestyleAnalysis')
//
// 3. **Query Parameter Parsing**: page/limit passed as strings into MongoDB skip/limit, causing type errors
//    - Validation: Check logs show page: "1" (string) vs page: 1 (number)
//    - Fix: Always parseInt(req.query.page, 10) before using
//
// 4. **User ID Format Mismatch**: Save creates record with ObjectId but GET queries with string user ID
//    - Validation: DB query shows records exist but GET returns empty array
//    - Fix: Ensure consistent user ID handling in both save and fetch endpoints
//
// 5. **Response Format Inconsistency**: Frontend expects different JSON structure than server provides
//    - Validation: GET returns 200 but frontend console shows "Unexpected token" errors
//    - Fix: Ensure consistent response structure (data vs history properties)
