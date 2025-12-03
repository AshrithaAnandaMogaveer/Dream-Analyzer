const axios = require('axios');

async function testDreamAnalysis() {
  console.log('🔍 Testing Dream Analysis with LM Studio...\n');
  
  const LM_STUDIO_URL = 'http://192.168.31.35:1234/v1/chat/completions';
  const dreamText = "I was flying over a beautiful ocean";
  
  const systemPrompt = 'You are a dream interpreter. Respond with valid JSON only.';
  const userPrompt = `Analyze this dream in JSON format:\n\n{"sections": {"yourDream": "brief summary", "introduction": "2 sentences", "overview": "2 sentences", "keySymbolsAndElements": [{"symbol": "name", "meaning": "short meaning"}], "psychologicalInterpretation": "2 sentences", "culturalContext": "1 sentence", "connectionsToWakingLife": "2 sentences", "summaryAndAdvice": "2 sentences"}, "emotions": {"joy": 0.0, "fear": 0.0, "anxiety": 0.0, "calmness": 0.0, "sadness": 0.0, "excitement": 0.0}, "remedies": ["tip 1", "tip 2", "tip 3"]}\n\nDream: "${dreamText}"`;
  
  try {
    console.log('⏱️ Starting at:', new Date().toLocaleTimeString());
    console.log('📝 Dream:', dreamText);
    console.log('🔧 Max tokens: 800');
    console.log('⏱️ Timeout: 120 seconds\n');
    
    const startTime = Date.now();
    
    const response = await axios.post(LM_STUDIO_URL, {
      model: 'llama-2-7b-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    }, {
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('⏱️ Finished at:', new Date().toLocaleTimeString());
    console.log(`✅ Success in ${duration} seconds!\n`);
    
    const content = response.data?.choices?.[0]?.message?.content;
    console.log('📥 Response:');
    console.log(content);
    console.log('\n📊 Response length:', content?.length || 0, 'characters');
    
    // Try to parse JSON
    try {
      const parsed = JSON.parse(content);
      console.log('✅ Valid JSON!');
      console.log('📋 Sections:', Object.keys(parsed.sections || {}));
    } catch (e) {
      console.log('❌ Not valid JSON:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ECONNABORTED') {
      console.error('\n⚠️ Timeout! The model is taking too long.');
      console.error('Solutions:');
      console.error('1. Enable GPU in LM Studio (Settings → Hardware → GPU Offload)');
      console.error('2. Reduce max_tokens to 400-500');
      console.error('3. Use a faster model (TinyLlama, Phi-2)');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️ Cannot connect to LM Studio');
      console.error('Make sure LM Studio server is running on port 1234');
    } else {
      console.error('\nFull error:', error);
    }
  }
}

testDreamAnalysis();
