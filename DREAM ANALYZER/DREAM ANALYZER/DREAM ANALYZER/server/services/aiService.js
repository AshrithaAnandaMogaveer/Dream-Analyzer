const axios = require('axios');

// LM Studio Configuration - ONLY LOCAL LLM
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL || 'local-model';

console.log('🔧 LM Studio Configuration:');
console.log('   URL:', LM_STUDIO_URL);
console.log('   Model:', LM_STUDIO_MODEL);

// Analyze dream with LM Studio ONLY
async function analyzeDreamWithAI(content, mood, intensity, userContext = {}) {
  console.log('🔵 analyzeDreamWithAI called - Using LM Studio ONLY');
  console.log('� Drieam text length:', content.length);
  
  // Input validation
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Dream content is required');
  }

  try {
    const systemPrompt = `You are a professional dream interpreter and behavioral psychologist. Analyze dreams with expertise in Jungian and Freudian analysis, cross-cultural symbolism, and modern cognitive psychology.

Respond with a valid JSON object containing these exact fields:
{
  "introduction": "A warm, engaging 2-3 sentence introduction",
  "overview": "A concise 2-3 sentence summary of main themes",
  "keySymbols": [{"symbol": "Symbol name", "meaning": "Detailed explanation"}, {"symbol": "Symbol 2", "meaning": "Explanation 2"}],
  "psychological": "2-3 paragraphs of psychological analysis",
  "cultural": "1-2 paragraphs on cultural/mythological significance",
  "connections": "1-2 paragraphs connecting dream to waking life",
  "summary": "Concise summary with 2-3 practical suggestions"
}

Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Analyze this dream:

"${content}"

Context:
- Mood: ${mood || 'Neutral'} (${intensity || 5}/10)
- Age: ${userContext.age || 'Not specified'}
- Gender: ${userContext.gender || 'Not specified'}
- Occupation: ${userContext.fieldOfWork || 'Not specified'}

Provide comprehensive analysis in JSON format.`;

    console.log('� Sendting request to LM Studio...');
    const startTime = Date.now();

    // Call LM Studio directly with axios
    const response = await axios.post(LM_STUDIO_URL, {
      model: LM_STUDIO_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      stream: false
    }, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ LM Studio response received in ${duration}ms`);

    // Extract response content
    const aiResponse = response.data?.choices?.[0]?.message?.content || '{}';
    console.log('📥 Response length:', aiResponse.length);
    console.log('📥 First 200 chars:', aiResponse.substring(0, 200));

    // Parse JSON response
    let analysis;
    try {
      // Remove markdown code blocks if present
      let cleanContent = aiResponse.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '');
      }
      
      analysis = JSON.parse(cleanContent);
      console.log('✅ Successfully parsed JSON response');
      console.log('📊 Response keys:', Object.keys(analysis));
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError.message);
      console.error('Raw response:', aiResponse.substring(0, 500));
      throw new Error('Failed to parse LM Studio response as JSON');
    }

    // Validate required fields
    const requiredFields = ['introduction', 'overview', 'keySymbols', 'psychological', 'cultural', 'connections', 'summary'];
    for (const field of requiredFields) {
      if (!analysis[field]) {
        console.warn(`⚠️ Missing required field: ${field}`);
      }
    }
    
    // Ensure keySymbols is an array
    if (!Array.isArray(analysis.keySymbols)) {
      console.warn('⚠️ keySymbols is not an array, converting to array');
      analysis.keySymbols = [];
    }

    // Map to expected format
    const keySymbols = analysis.keySymbols || [];
    
    const result = {
      interpretation: analysis.overview || analysis.introduction || 'Dream analysis completed',
      suggestions: [
        'Keep a dream journal to track patterns',
        'Reflect on how this dream relates to your current life',
        'Consider discussing this dream with someone you trust',
        'Explore the cultural significance of key symbols',
        'Note connections between your dream and recent experiences'
      ],
      emotionalInsights: analysis.psychological || '',
      mentalState: analysis.overview || '',
      culturalContext: analysis.cultural || '',
      connectionsToWakingLife: analysis.connections || '',
      symbolism: keySymbols,
      patterns: ['Pattern analysis'],
      confidence: 85,
      detailedAnalysis: {
        introduction: analysis.introduction || '',
        overview: analysis.overview || '',
        keySymbolsAndElements: keySymbols,
        psychologicalInterpretation: analysis.psychological || '',
        culturalContext: analysis.cultural || '',
        connectionsToWakingLife: analysis.connections || '',
        summaryAndInsights: analysis.summary || '',
        raw: JSON.stringify(analysis, null, 2)
      }
    };

    console.log('✅ Analysis formatted successfully');
    return result;

  } catch (error) {
    console.error('❌ LM Studio Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to LM Studio. Make sure:');
      console.error('   1. LM Studio is running');
      console.error('   2. A model is loaded');
      console.error('   3. Server is started on port 1234');
      throw new Error('LM Studio is not running or not accessible at ' + LM_STUDIO_URL);
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('❌ LM Studio request timed out');
      throw new Error('LM Studio request timed out - model may be too slow or not responding');
    }
    
    throw error;
  }
}

// Generate dream image (stub - returns fallback)
async function generateDreamImage(prompt) {
  console.log('🎨 Image generation requested:', prompt);
  return '/fallback.svg';
}

// Extract mood levels (stub)
async function extractMoodLevelsFromText(text) {
  return { happiness: 5, stress: 5 };
}

// Interpret dream text (stub)
async function interpretDreamText(text) {
  return 'Dream interpretation';
}

module.exports = {
  analyzeDreamWithAI,
  generateDreamImage,
  extractMoodLevelsFromText,
  interpretDreamText
};
