// Test the explain streaming endpoint with detailed timing

async function testExplainStream() {
  console.log('Testing explain streaming endpoint...');

  const startTime = Date.now();
  let firstChunkTime = null;
  let chunkTimes = [];

  try {
    const response = await fetch('http://localhost:3001/api/v1/test-stream/stream-test');

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let contentAccumulator = '';

    console.log('Starting to read stream...');

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('\nStream complete');
        break;
      }

      const currentTime = Date.now() - startTime;

      if (!firstChunkTime) {
        firstChunkTime = currentTime;
        console.log(`\nFirst chunk received after ${firstChunkTime}ms`);
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          chunkCount++;
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            chunkTimes.push(currentTime);

            if (parsed.type === 'content' && parsed.data) {
              contentAccumulator += parsed.data;
              console.log(`Chunk ${chunkCount} at ${currentTime}ms: "${parsed.data}"`);
            } else {
              console.log(`Chunk ${chunkCount} at ${currentTime}ms:`, parsed);
            }
          } catch (error) {
            console.log(`Chunk ${chunkCount} (parse error):`, data);
          }
        }
      }
    }

    // Calculate statistics
    const totalTime = Date.now() - startTime;
    const avgTimeBetweenChunks =
      chunkTimes.length > 1
        ? (chunkTimes[chunkTimes.length - 1] - chunkTimes[0]) / (chunkTimes.length - 1)
        : 0;

    console.log('\n=== Streaming Statistics ===');
    console.log(`Total time: ${totalTime}ms`);
    console.log(`First chunk latency: ${firstChunkTime}ms`);
    console.log(`Total chunks: ${chunkCount}`);
    console.log(`Average time between chunks: ${avgTimeBetweenChunks.toFixed(2)}ms`);
    console.log(`Total content length: ${contentAccumulator.length} characters`);
    console.log('\nContent received:', contentAccumulator);
  } catch (error) {
    console.error('Streaming error:', error);
  }
}

testExplainStream().catch(console.error);
