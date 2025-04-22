// /api/api-test.js
// A simple script to test your API endpoints

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const endpoints = [
  '/api/content/featured?limit=2',
  '/api/content/1',
  '/api/videos',
  '/api/auth/access-check'
];

async function testEndpoint(url) {
  console.log(`Testing: ${url}`);
  try {
    const response = await fetch(`${BASE_URL}${url}`);
    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    console.log(`Status: ${status}`);
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(`Response body: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    }
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
  }
  console.log('-'.repeat(50));
}

async function runTests() {
  console.log('Starting API endpoint tests...');
  console.log('='.repeat(50));
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('All tests completed.');
}

runTests();