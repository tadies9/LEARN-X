import { Router, Request, Response } from 'express';

const router = Router();

// Test SSE streaming
router.get('/stream-test', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log('[Test Stream] Starting stream...');

  // Send initial message
  res.write('event: message\n');
  res.write('data: {"type":"start","data":"Starting explanation..."}\n\n');

  // Simulate streaming content
  let count = 0;
  const interval = setInterval(() => {
    count++;

    if (count <= 5) {
      res.write('event: message\n');
      res.write(
        `data: {"type":"content","data":"This is chunk ${count} of the explanation. "}\n\n`
      );
      console.log(`[Test Stream] Sent chunk ${count}`);
    } else {
      res.write('event: message\n');
      res.write('data: {"type":"complete","data":"Stream complete"}\n\n');
      console.log('[Test Stream] Stream complete');
      clearInterval(interval);
      res.end();
    }
  }, 500);

  // Handle client disconnect
  req.on('close', () => {
    console.log('[Test Stream] Client disconnected');
    clearInterval(interval);
  });
});

export default router;
