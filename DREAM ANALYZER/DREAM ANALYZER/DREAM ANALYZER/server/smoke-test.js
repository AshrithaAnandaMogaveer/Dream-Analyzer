/*
  Smoke test for Dream Analyzer backend.
  Usage:
    node server/smoke-test.js
  Notes:
    - Requires backend running on http://localhost:5000
    - Works without OPENAI_API_KEY (falls back to deterministic analysis/image)
*/

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';

async function jfetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    },
    ...opts,
  });
  let body = null;
  try { body = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, body };
}

function logResult(name, ok, info) {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${name}`);
  if (!ok && info) {
    console.log('  Details:', typeof info === 'string' ? info : JSON.stringify(info));
  }
}

(async () => {
  try {
    // 1) Register (unique email) or fallback to login if exists
    const email = `smoke_${Date.now()}@example.com`;
    const password = 'testpass123';

    let r = await jfetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Smoke Tester', email, password })
    });
    if (!r.ok && r.status !== 400) {
      logResult('Register', false, r.body);
      return;
    }
    logResult('Register', true);

    // 2) Login
    r = await jfetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (!r.ok || !r.body?.token || !r.body?.user?.id) {
      logResult('Login', false, r.body);
      return;
    }
    const token = r.body.token;
    const userId = r.body.user.id;
    logResult('Login', true);

    // 3) Analyze dream
    const dreamText = 'Last night I was flying over a vast shimmering ocean while being chased by shadows, my heart racing with fear before a warm sunrise brought deep calm and relief as I floated gently above the waves.';
    const analyzePath = `/api/chatbot/analyze?text=${encodeURIComponent(dreamText)}`;
    r = await jfetch(analyzePath, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: dreamText, userId })
    });
    const analyzed = r.body?.data || r.body; // backward-compatible
    if (!r.ok || !analyzed?.id || !analyzed?.emotions) {
      logResult('/api/chatbot/analyze', false, r.body);
      return;
    }
    const analysisId = analyzed.id;
    const imagePrompt = analyzed.imagePrompt;
    logResult('/api/chatbot/analyze', true);
    // verify interpretationDetails exists
    const interp = analyzed.interpretationDetails || r.body?.interpretationDetails;
    if (!interp) {
      logResult('interpretationDetails presence', false, analyzed);
      return;
    }
    logResult('interpretationDetails presence', true);

    // 4) Generate image (persists imageUrl)
    const genPath = `/api/chatbot/generate-image?analysisId=${encodeURIComponent(analysisId)}&imagePrompt=${encodeURIComponent(imagePrompt)}`;
    r = await jfetch(genPath, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imagePrompt, userId, analysisId })
    });
    if (!r.ok || (!r.body?.imageUrl && !r.body?.image)) {
      logResult('/api/chatbot/generate-image', false, r.body);
      return;
    }
    logResult('/api/chatbot/generate-image', true);

    // 4b) Generate image again with the exact same prompt (should be served from cache)
    let r2 = await jfetch(genPath, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imagePrompt, userId, analysisId })
    });
    if (!r2.ok || r2.body?.cacheHit !== true) {
      logResult('/api/chatbot/generate-image (cache)', false, r2.body);
      return;
    }
    logResult('/api/chatbot/generate-image (cache)', true);

    // 5) Save dream entry to diary
    const title = 'Smoke Test Dream';
    r = await jfetch('/api/dream-diary/diary/save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title,
        content: dreamText,
        analysisId,
        mood: 'neutral',
        intensity: 6,
        tags: ['ocean','flying'],
        isPublic: false
      })
    });
    if (!r.ok || !(r.body?._id || r.body?.id)) {
      logResult('/api/dream-diary/diary/save', false, r.body);
      return;
    }
    logResult('/api/dream-diary/diary/save', true);

    // 5b) Suggestion & Meditation blocks backend validation (recommendations + videos)
    r = await jfetch('/api/dream-diary/meditation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        dreamKeywords: r.body?.themes || ['ocean','flying'],
        emotions: r.body?.emotions || { calmness: 0.5 },
        stressLevel: 5
      })
    });
    if (!r.ok || (!Array.isArray(r.body?.recommendations) && !Array.isArray(r.body?.youtubeVideos))) {
      logResult('/api/dream-diary/meditation', false, r.body);
      return;
    }
    logResult('/api/dream-diary/meditation', true);

    // 6) Fetch diary
    r = await jfetch('/api/dream-diary/diary', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok || !Array.isArray(r.body?.analyses)) {
      logResult('/api/dream-diary/diary (GET)', false, r.body);
      return;
    }
    logResult('/api/dream-diary/diary (GET)', true);

    // 7) Analytics
    r = await jfetch('/api/dream-diary/analytics/sleep', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok || !r.body) {
      logResult('/api/dream-diary/analytics/sleep', false, r.body);
      return;
    }
    logResult('/api/dream-diary/analytics/sleep', true);

    // 8) Routine upsert + entry + summary
    await jfetch('/api/dream-diary/routine', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Night Routine', habits: [{ name: 'Breathing', goalPerDay: 1 }] })
    });
    // Mark done today
    await jfetch('/api/dream-diary/routine/entry', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: [{ name: 'Breathing', done: true, impactMental: 3, impactPhysical: 0 }], notes: 'smoke' })
    });
    // Mark missed today to test update path as well
    await jfetch('/api/dream-diary/routine/entry', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: [{ name: 'Breathing', done: false, impactMental: 0, impactPhysical: 0 }], notes: 'missed' })
    });
    r = await jfetch('/api/dream-diary/routine/summary', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok || !r.body) {
      logResult('/api/dream-diary/routine/*', false, r.body);
      return;
    }
    logResult('/api/dream-diary/routine/*', true);

    // Note: Endpoints above emit 'routine:updated' and 'diary:updated' events; we cannot capture sockets here,
    // but successful responses imply server emitted without error.

    console.log('\nValidation Report: All core endpoints passed.');
  } catch (e) {
    console.error('Smoke test error:', e);
  }
})();
