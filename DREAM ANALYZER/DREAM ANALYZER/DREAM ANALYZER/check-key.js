const axios = require('axios');

const API_KEY = 'sk-yVAcIgLBeCINhBgKoWJwxzxsPLG5ZX0Y4nH4kKaWGV3ZNYOQ';

async function checkAPIKey() {
  try {
    console.log('Checking API key...');
    const response = await axios.get('https://api.stability.ai/v1/user/account', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ API Key is valid!');
    console.log('Account Information:');
    console.log('Email:', response.data.email);
    console.log('ID:', response.data.id);
    console.log('Tier:', response.data.tier);
    
  } catch (error) {
    console.error('❌ Error checking API key:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

checkAPIKey();
