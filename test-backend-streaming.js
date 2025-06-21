async function testBackendStreaming() {
  console.log('Testing backend streaming endpoint...');
<<<<<<< Updated upstream

=======
  
>>>>>>> Stashed changes
  // First login to get a token
  const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'tadies@gmail.com',
<<<<<<< Updated upstream
      password: 'Test123456!', // You'll need to replace with actual password
=======
      password: 'Test123456!'  // You'll need to replace with actual password
>>>>>>> Stashed changes
    }),
  });

  if (!loginResponse.ok) {
    console.error('Login failed:', loginResponse.status);
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.access_token;
  console.log('Got auth token');

  // Now test the streaming endpoint
  const response = await fetch('http://localhost:3001/api/v1/learn/explain/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
<<<<<<< Updated upstream
      Authorization: `Bearer ${token}`,
=======
      'Authorization': `Bearer ${token}`,
>>>>>>> Stashed changes
    },
    body: JSON.stringify({
      fileId: 'a0b9c8d7-6e5f-4a3b-2c1d-9e8f7a6b5c4d',
      topicId: 'JavaScript Basics',
      mode: 'explain',
    }),
  });

  if (!response.ok) {
    console.error('Stream response not OK:', response.status, response.statusText);
    const error = await response.text();
    console.error('Error:', error);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;
  let firstChunkTime = null;
  const startTime = Date.now();

  console.log('Starting to read stream from backend...');
<<<<<<< Updated upstream

  while (true) {
    const { done, value } = await reader.read();

=======
  
  while (true) {
    const { done, value } = await reader.read();
    
>>>>>>> Stashed changes
    if (done) {
      console.log('Stream complete');
      break;
    }

    if (!firstChunkTime) {
      firstChunkTime = Date.now() - startTime;
      console.log(`First chunk received after ${firstChunkTime}ms`);
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const event = line.slice(7);
        console.log(`Event: ${event}`);
      } else if (line.startsWith('data: ')) {
        chunkCount++;
        const data = line.slice(6);
<<<<<<< Updated upstream

        try {
          const parsed = JSON.parse(data);
          const elapsed = Date.now() - startTime;

          if (parsed.type === 'content' && parsed.data) {
            console.log(
              `Chunk ${chunkCount} (${elapsed}ms):`,
              parsed.data.substring(0, 50) + '...'
            );
=======
        
        try {
          const parsed = JSON.parse(data);
          const elapsed = Date.now() - startTime;
          
          if (parsed.type === 'content' && parsed.data) {
            console.log(`Chunk ${chunkCount} (${elapsed}ms):`, parsed.data.substring(0, 50) + '...');
>>>>>>> Stashed changes
          } else if (parsed.type === 'complete') {
            console.log(`Complete signal received after ${elapsed}ms`);
          } else if (parsed.type === 'error') {
            console.log(`Error:`, parsed);
          } else {
            console.log(`Chunk ${chunkCount} (${elapsed}ms):`, parsed);
          }
        } catch (error) {
          console.log(`Chunk ${chunkCount} (raw):`, data);
        }
      }
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`\nTotal streaming time: ${totalTime}ms`);
  console.log(`Total chunks received: ${chunkCount}`);
}

<<<<<<< Updated upstream
testBackendStreaming().catch(console.error);
=======
testBackendStreaming().catch(console.error);
>>>>>>> Stashed changes
