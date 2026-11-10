
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function analyzeDreamWithAI(content, mood, intensity, userContext = {}) {
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('Dream content is required');
  }

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from environment variables');
  }

  const systemPrompt = `
You are an expert dream interpretation assistant.
Analyze dreams using modern psychology, Jungian and Freudian
perspectives, cultural symbolism, and emotional context.

Be thoughtful, detailed, supportive, and avoid presenting
interpretations as certain predictions or medical diagnoses.

Return ONLY valid JSON with these exact fields:
{
  "introduction": "2-3 sentence introduction",
  "overview": "Summary of the dream",
  "keySymbols": [
    {"symbol": "Symbol name", "meaning": "Detailed meaning"}
  ],
  "psychological": "Detailed psychological interpretation",
  "cultural": "Cultural and symbolic interpretation",
  "connections": "Connections to waking life",
  "summary": "Summary and practical suggestions"
}
`;

  const userPrompt = `
Analyze this dream:

Dream: ${content}

User context:
Mood: ${mood || 'Neutral'}
Intensity: ${intensity || 5}/10
Age: ${userContext.age || 'Not specified'}
Gender: ${userContext.gender || 'Not specified'}
Occupation: ${userContext.fieldOfWork || 'Not specified'}

Provide a personalized analysis based on the supplied information.
`;

  try {
    console.log('Calling Gemini API for dream analysis...');

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      },
      {
        params: { key: GEMINI_API_KEY },
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const aiResponse =
      response.data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('') || '';

    if (!aiResponse) {
      throw new Error('Gemini returned an empty response');
    }

    const analysis = JSON.parse(aiResponse);

    const requiredFields = [
      'introduction',
      'overview',
      'keySymbols',
      'psychological',
      'cultural',
      'connections',
      'summary'
    ];

    for (const field of requiredFields) {
      if (analysis[field] === undefined || analysis[field] === null) {
        throw new Error(`Gemini response is missing field: ${field}`);
      }
    }

    if (!Array.isArray(analysis.keySymbols)) {
      analysis.keySymbols = [];
    }

    const keySymbols = analysis.keySymbols;

    const result = {
      interpretation: analysis.overview || analysis.introduction,
      suggestions: [
        'Maintain a dream journal to identify recurring themes.',
        'Reflect on emotions connected to your dream.',
        'Consider how recent experiences may relate to the dream.',
        'Explore the meaning of important dream symbols.'
      ],
      emotionalInsights: analysis.psychological,
      mentalState: analysis.overview,
      culturalContext: analysis.cultural,
      connectionsToWakingLife: analysis.connections,
      symbolism: keySymbols,
      patterns: keySymbols.map(item => item.symbol).filter(Boolean),
      confidence: 85,
      detailedAnalysis: {
        introduction: analysis.introduction,
        overview: analysis.overview,
        keySymbolsAndElements: keySymbols,
        psychologicalInterpretation: analysis.psychological,
        culturalContext: analysis.cultural,
        connectionsToWakingLife: analysis.connections,
        summaryAndInsights: analysis.summary,
        raw: JSON.stringify(analysis, null, 2)
      }
    };

    console.log('Gemini dream analysis completed successfully.');
    return result;

  } catch (error) {
    console.error(
      'Gemini API error:',
      error.response?.data || error.message
    );

    throw new Error(
      error.response?.data?.error?.message ||
      error.message ||
      'Dream analysis failed'
    );
  }
}

// Existing image-generation placeholder.
// Image generation needs a separate hosted image API integration.
async function generateDreamImage(prompt) {
  throw new Error('Image generation API is not configured yet');
}

async function extractMoodLevelsFromText(text) {
  return { happiness: 5, stress: 5 };
}

async function interpretDreamText(text) {
  return 'Dream interpretation';
}

module.exports = {
  analyzeDreamWithAI,
  generateDreamImage,
  extractMoodLevelsFromText,
  interpretDreamText
};
