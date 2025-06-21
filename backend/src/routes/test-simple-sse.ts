import { Router, Request, Response } from 'express';

const router = Router();

// Simple SSE test endpoint that works without auth
router.get('/simple-sse', (req: Request, res: Response) => {
  console.log('[Simple SSE] Client connected');

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial data
  res.write('data: {"type": "start", "message": "SSE connection established"}\n\n');

  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    const data = {
      type: 'content',
      data: `This is chunk ${counter}`,
      timestamp: new Date().toISOString(),
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);
    console.log(`[Simple SSE] Sent chunk ${counter}`);

    if (counter >= 5) {
      clearInterval(interval);
      res.write('data: {"type": "complete", "message": "Stream complete"}\n\n');
      res.end();
      console.log('[Simple SSE] Stream complete');
    }
  }, 500);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval);
    console.log('[Simple SSE] Client disconnected');
  });
});

export default router;
