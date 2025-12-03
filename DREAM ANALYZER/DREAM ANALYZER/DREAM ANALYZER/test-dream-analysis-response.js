const axios = require('axios');

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function testDreamAnalysis() {
  console.log('🧪 Testing Dream Analysis Response\n');

  // You'll need a valid token
  const token = process.argv[2];
  
  if (!token) {
    console.log('❌ Please provide a token as argument:');
    console.log('   node test-dream-analysis-response.js YOUR_TOKEN');
    return;
  }

  try {
    console.log('Sending dream analysis request...\n');
    
    const response = await axios.post(
      `${API_URL}/api/chatbot/analyze`,
      {
        text: 'I dreamed I was flying over a beautiful ocean with dolphins swimming below'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    console.log('✅ Response received!\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const data = response.data;

    // Check top-level fields
    console.log('📊 Top-Level Fields:');
    console.log('   success:', data.success);
    console.log('   summary:', data.summary ? '✅ Present' : '❌ Missing');
    console.log('   themes:', data.themes ? `✅ ${data.themes.length} themes` : '❌ Missing');
    console.log('   keywords:', data.keywords ? `✅ ${data.keywords.length} keywords` : '❌ Missing');
    console.log('   emotions:', data.emotions ? '✅ Present' : '❌ Missing');
    console.log('   stressScore:', data.stressScore);
    console.log('   happinessScore:', data.happinessScore);
    console.log('   suggestions:', data.suggestions ? `✅ ${data.suggestions.length} suggestions` : '❌ Missing');
    console.log('');

    // Check sections
    console.log('📋 Sections Object:');
    if (data.sections) {
      const sectionKeys = Object.keys(data.sections);
      console.log(`   ✅ Sections present: ${sectionKeys.length} keys`);
      console.log('');
      
      const requiredSections = [
        'yourDream',
        'introduction',
        'overview',
        'keySymbolsAndElements',
        'psychologicalInterpretation',
        'culturalContext',
        'connectionsToWakingLife',
        'summaryAndAdvice'
      ];

      requiredSections.forEach(section => {
        const exists = data.sections[section] !== undefined && data.sections[section] !== null;
        const hasContent = exists && (
          typeof data.sections[section] === 'string' ? data.sections[section].length > 0 :
          Array.isArray(data.sections[section]) ? data.sections[section].length > 0 :
          true
        );
        
        const status = hasContent ? '✅' : '❌';
        console.log(`   ${status} ${section}: ${hasContent ? 'Present' : 'MISSING'}`);
        
        if (hasContent && typeof data.sections[section] === 'string') {
          const preview = data.sections[section].substring(0, 60) + '...';
          console.log(`      Preview: ${preview}`);
        } else if (hasContent && Array.isArray(data.sections[section])) {
          console.log(`      Count: ${data.sections[section].length} items`);
        }
      });
    } else {
      console.log('   ❌ Sections object is MISSING!');
    }
    console.log('');

    // Check remedies
    console.log('💊 Remedies:');
    if (data.remedies && Array.isArray(data.remedies)) {
      console.log(`   ✅ ${data.remedies.length} remedies present`);
      data.remedies.forEach((remedy, i) => {
        console.log(`   ${i + 1}. ${remedy}`);
      });
    } else {
      console.log('   ❌ Remedies missing');
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════\n');

    // Summary
    const allSectionsPresent = data.sections && 
      data.sections.yourDream &&
      data.sections.introduction &&
      data.sections.overview &&
      data.sections.keySymbolsAndElements &&
      data.sections.psychologicalInterpretation &&
      data.sections.culturalContext &&
      data.sections.connectionsToWakingLife &&
      data.sections.summaryAndAdvice;

    if (allSectionsPresent) {
      console.log('✅ SUCCESS: All sections are present and populated!');
      console.log('✅ The chatbot is providing complete analysis.');
    } else {
      console.log('❌ FAILURE: Some sections are missing!');
      console.log('❌ Check backend logs for errors.');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNABORTED') {
      console.error('   Timeout: Request took too long');
    } else {
      console.error('   Error:', error.message);
    }
  }
}

testDreamAnalysis().catch(console.error);
