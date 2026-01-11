// Debug script to test the API endpoint
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/referee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tech1: 'React',
        tech2: 'Vue'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log('Parsed JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Failed to parse as JSON:', e.message);
      }
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testAPI();