import { Router } from 'express';
import { debugFileStorage, listAllFilesInBucket } from '../utils/storageDebug';

const router = Router();

// Debug endpoint for file storage issues
router.get('/storage/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log('Debug request for file:', fileId);
    await debugFileStorage(fileId);

    res.json({
      message: 'Debug information logged to console',
      fileId,
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Debug endpoint to list all files in bucket
router.get('/storage-list', async (_req, res) => {
  try {
    console.log('Listing all files in bucket...');
    await listAllFilesInBucket();

    res.json({
      message: 'Bucket contents logged to console',
    });
  } catch (error) {
    console.error('Storage list endpoint error:', error);
    res.status(500).json({
      error: 'Storage list failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
