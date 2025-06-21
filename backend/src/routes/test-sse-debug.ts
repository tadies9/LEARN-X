import { Router, Request, Response } from 'express';

const router = Router();

// Debug SSE streaming with detailed logging
router.get('/debug-stream', (req: Request, res: Response) => {
  console.log('[SSE Debug] Client connected');
<<<<<<< Updated upstream

=======
  
>>>>>>> Stashed changes
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
<<<<<<< Updated upstream

  // Disable Node.js buffering
  res.socket?.setNoDelay(true);
  res.socket?.setKeepAlive(true);

  // Write 2KB comment to force any proxy buffering to flush
  res.write(':' + ' '.repeat(2048) + '\n\n');

  console.log('[SSE Debug] Headers sent, starting stream...');

  let count = 0;
  const startTime = Date.now();

  const sendChunk = () => {
    count++;
    const elapsed = Date.now() - startTime;

    const data = {
      type: 'content',
      data: `Chunk ${count} at ${elapsed}ms`,
      timestamp: new Date().toISOString(),
    };

    console.log(`[SSE Debug] Sending chunk ${count} at ${elapsed}ms`);

    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);

=======
  
  // Disable Node.js buffering
  res.socket?.setNoDelay(true);
  res.socket?.setKeepAlive(true);
  
  // Write 2KB comment to force any proxy buffering to flush
  res.write(':' + ' '.repeat(2048) + '\n\n');
  
  console.log('[SSE Debug] Headers sent, starting stream...');
  
  let count = 0;
  const startTime = Date.now();
  
  const sendChunk = () => {
    count++;
    const elapsed = Date.now() - startTime;
    
    const data = {
      type: 'content',
      data: `Chunk ${count} at ${elapsed}ms`,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[SSE Debug] Sending chunk ${count} at ${elapsed}ms`);
    
    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    
>>>>>>> Stashed changes
    // Force flush if available
    if ((res as any).flush) {
      (res as any).flush();
      console.log('[SSE Debug] Flushed');
    }
<<<<<<< Updated upstream

=======
    
>>>>>>> Stashed changes
    if (count >= 10) {
      res.write(`event: message\n`);
      res.write(`data: {"type":"complete","elapsed":${elapsed}}\n\n`);
      res.end();
      console.log(`[SSE Debug] Stream complete after ${elapsed}ms`);
    } else {
      setTimeout(sendChunk, 100); // Send every 100ms
    }
  };
<<<<<<< Updated upstream

  // Start sending after a small delay
  setTimeout(sendChunk, 10);

=======
  
  // Start sending after a small delay
  setTimeout(sendChunk, 10);
  
>>>>>>> Stashed changes
  // Handle client disconnect
  req.on('close', () => {
    console.log('[SSE Debug] Client disconnected');
  });
});

<<<<<<< Updated upstream
export default router;
=======
export default router;
>>>>>>> Stashed changes
