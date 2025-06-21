// Use native fetch in Node.js 18+

async function testStreaming() {
  console.log('Testing Python AI service streaming...');
<<<<<<< Updated upstream

=======
  
>>>>>>> Stashed changes
  const response = await fetch('http://localhost:8001/api/v1/ai/generate-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: 'What is JavaScript?',
      content_type: 'explanation',
      topic: 'JavaScript Basics',
      difficulty: 'beginner',
      stream: true,
      model: 'gpt-4o',
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    console.error('Response not OK:', response.status, response.statusText);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;

  console.log('Starting to read stream...');
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

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        chunkCount++;
        const data = line.slice(6);
<<<<<<< Updated upstream

=======
        
>>>>>>> Stashed changes
        if (data === '[DONE]') {
          console.log('Received [DONE] signal');
          return;
        }

        try {
          const chunk = JSON.parse(data);
<<<<<<< Updated upstream
          console.log(
            `Chunk ${chunkCount}:`,
            chunk.content ? chunk.content.substring(0, 50) + '...' : chunk
          );
=======
          console.log(`Chunk ${chunkCount}:`, chunk.content ? chunk.content.substring(0, 50) + '...' : chunk);
>>>>>>> Stashed changes
        } catch (error) {
          console.log(`Chunk ${chunkCount} (raw):`, data);
        }
      }
    }
  }
}

<<<<<<< Updated upstream
testStreaming().catch(console.error);
=======
testStreaming().catch(console.error);
>>>>>>> Stashed changes
