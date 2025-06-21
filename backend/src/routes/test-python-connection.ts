import { Router, Request, Response } from 'express';
import { pythonAIClient } from '../services/ai/PythonAIClient';

const router = Router();

router.get('/test-python-connection', async (_req: Request, res: Response) => {
  try {
    console.log('[Test] Testing Python AI connection...');
<<<<<<< Updated upstream

=======
    
>>>>>>> Stashed changes
    // Test basic connection with a simple request
    const generator = pythonAIClient.generateContent({
      content: 'Hello, this is a test.',
      content_type: 'explanation',
      difficulty: 'beginner',
      stream: true,
<<<<<<< Updated upstream
      user_id: 'test-user',
=======
      user_id: 'test-user'
>>>>>>> Stashed changes
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let chunkCount = 0;
    console.log('[Test] Starting to process chunks...');

    for await (const chunk of generator) {
      chunkCount++;
      console.log(`[Test] Received chunk ${chunkCount}:`, chunk);
<<<<<<< Updated upstream

=======
      
>>>>>>> Stashed changes
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ type: 'error', data: chunk.error })}\n\n`);
        res.end();
        return;
      }

      if (chunk.content) {
        res.write(`data: ${JSON.stringify({ type: 'content', data: chunk.content })}\n\n`);
        if ((res as any).flush) (res as any).flush();
      }

      if (chunk.done) {
        console.log(`[Test] Stream complete after ${chunkCount} chunks`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        res.end();
        return;
      }
    }
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
  } catch (error) {
    console.error('[Test] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

<<<<<<< Updated upstream
export default router;
=======
export default router;
>>>>>>> Stashed changes
