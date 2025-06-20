const https = require('https');
const http = require('http');

// Test the streaming endpoint
async function testStream() {
  // First, let's test without auth to see the exact response
  const testData = JSON.stringify({
    fileId: '9c908e3b-a832-45cc-8b8c-baa1d93600ec',
    topicId: 'test topic',
    mode: 'explain'
  });

  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/learn/explain/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': testData.length,
      // We'll add auth token here if needed
      'Authorization': 'Bearer dummy-token-for-test'
    }
  };

  console.log('Testing URL:', `http://${options.hostname}:${options.port}${options.path}`);
  console.log('Request body:', testData);

  const req = http.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('\n--- Stream Data ---\n');

    res.on('data', (chunk) => {
      console.log('Chunk:', chunk.toString());
    });

    res.on('end', () => {
      console.log('\n--- Stream Ended ---');
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
  });

  req.write(testData);
  req.end();
}

testStream();