import { Router, Request, Response } from 'express';

const router = Router();

// Simple SSE test endpoint
router.get('/test-sse', (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering
<<<<<<< Updated upstream

  // Send initial connection message
  res.write('data: {"type": "connected", "message": "SSE connection established"}\n\n');
  if ((res as any).flush) (res as any).flush();

  let counter = 0;
  const startTime = Date.now();

  const interval = setInterval(() => {
    counter++;
    const elapsed = Date.now() - startTime;

=======
  
  // Send initial connection message
  res.write('data: {"type": "connected", "message": "SSE connection established"}\n\n');
  if ((res as any).flush) (res as any).flush();
  
  let counter = 0;
  const startTime = Date.now();
  
  const interval = setInterval(() => {
    counter++;
    const elapsed = Date.now() - startTime;
    
>>>>>>> Stashed changes
    const data = {
      type: 'chunk',
      counter,
      elapsed,
<<<<<<< Updated upstream
      message: `Chunk ${counter} at ${elapsed}ms`,
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if ((res as any).flush) (res as any).flush();

    console.log(`[SSE Test] Sent chunk ${counter} at ${elapsed}ms`);

=======
      message: `Chunk ${counter} at ${elapsed}ms`
    };
    
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if ((res as any).flush) (res as any).flush();
    
    console.log(`[SSE Test] Sent chunk ${counter} at ${elapsed}ms`);
    
>>>>>>> Stashed changes
    // Send 10 chunks then close
    if (counter >= 10) {
      clearInterval(interval);
      res.write('data: {"type": "complete", "message": "Stream complete"}\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
      console.log(`[SSE Test] Stream complete after ${elapsed}ms`);
    }
  }, 200); // Send every 200ms
<<<<<<< Updated upstream

=======
  
>>>>>>> Stashed changes
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    console.log('[SSE Test] Client disconnected');
  });
});

<<<<<<< Updated upstream
export default router;
=======
export default router;
>>>>>>> Stashed changes
