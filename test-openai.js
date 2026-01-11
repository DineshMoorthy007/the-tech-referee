// Simple test to verify OpenAI API key and connection
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    
    // Check if API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return;
    }
    
    console.log('API key is set, length:', process.env.OPENAI_API_KEY.length);
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 2,
    });

    console.log('Making test API call...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, API is working!" in exactly those words.'
        }
      ],
      max_tokens: 50,
      temperature: 0
    });

    const response = completion.choices[0]?.message?.content;
    console.log('OpenAI response:', response);
    
    if (response && response.includes('Hello, API is working!')) {
      console.log('✅ OpenAI API is working correctly');
    } else {
      console.log('⚠️ OpenAI API responded but with unexpected content');
    }
    
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
    if (error.type) {
      console.error('Error type:', error.type);
    }
  }
}

testOpenAI();