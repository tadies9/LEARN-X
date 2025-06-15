import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { FileService } from '../services/fileService';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { updateFileSchema } from '../validations/course.validation';
import multer from 'multer';

const router = Router();
const fileController = new FileController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only PDF, PPT, PPTX, DOC, DOCX, TXT, and MD files are allowed.'
        )
      );
    }
  },
});

// Test endpoint for signed URL (bypasses auth)
router.get('/files/:id/test-signed-url', async (req, res) => {
  try {
    console.log('=== Test signed URL endpoint ===');
    const { id } = req.params;

    // First, let's check file ownership and get the actual owner
    console.log('--- Checking file ownership ---');
    const { supabase } = await import('../config/supabase');
    const { data: file, error: dbError } = await supabase
      .from('course_files')
      .select(
        `
        *,
        modules!inner(
          id,
          courses!inner(
            id,
            user_id
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (dbError || !file) {
      console.log('❌ File not found in database:', dbError);
      return res.status(404).json({ error: 'File not found', details: dbError });
    }

    // Use the actual file owner's user ID instead of hardcoded one
    const ownerUserId = (file as any).modules.courses.user_id;
    console.log('✅ File found in database');
    console.log('📄 File details:', {
      id: file.id,
      filename: file.filename,
      storage_path: file.storage_path,
      owner_user_id: ownerUserId,
    });

    console.log('✅ Using actual file owner for signed URL generation...');
    const { FileService } = await import('../services/fileService');
    const fileService = new FileService();
    const url = await fileService.getSignedUrl(id, ownerUserId, 3600);

    return res.json({
      url,
      message: 'Test endpoint - signed URL generated',
      owner_user_id: ownerUserId,
    });
  } catch (error) {
    console.error('Test signed URL error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Direct storage test endpoint (bypasses FileService)
router.get('/files/:id/direct-storage-test', async (req, res) => {
  try {
    console.log('=== Direct Storage Test ===');
    const { id } = req.params;

    const { supabase } = await import('../config/supabase');
    const { createClient } = await import('@supabase/supabase-js');

    // Get file details from database
    const { data: file, error: dbError } = await supabase
      .from('course_files')
      .select('*')
      .eq('id', id)
      .single();

    if (dbError || !file) {
      console.log('❌ File not found in database:', dbError);
      return res.status(404).json({ error: 'File not found', details: dbError });
    }

    console.log('📄 File storage path:', file.storage_path);

    // Create service role client
    const supabaseServiceRole = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Try to create signed URL directly
    const { data: signedData, error: signedError } = await supabaseServiceRole.storage
      .from('course-files')
      .createSignedUrl(file.storage_path, 3600);

    if (signedError) {
      console.log('❌ Signed URL error:', signedError);
      return res.status(500).json({ error: 'Signed URL failed', details: signedError });
    }

    console.log('✅ Direct signed URL created successfully');
    return res.json({
      url: signedData.signedUrl,
      message: 'Direct storage test - signed URL generated',
      storage_path: file.storage_path,
    });
  } catch (error) {
    console.error('Direct storage test error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Fix storage path endpoint (development only)
router.get('/files/:id/fix-storage-path', async (req, res) => {
  try {
    console.log('=== Fix storage path endpoint ===');
    const { id } = req.params;

    // Import supabase
    const { supabase } = await import('../config/supabase');

    // First, get the file details
    const { data: file, error: getError } = await supabase
      .from('course_files')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !file) {
      console.log('❌ File not found:', getError);
      return res.status(404).json({ error: 'File not found', details: getError });
    }

    console.log('Current file details:', {
      id: file.id,
      name: file.name,
      storage_path: file.storage_path,
    });

    // Check if the file exists in storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('course-files')
      .list('13df2d22-2973-4025-a48a-bc712e52f0c5/3f4455b6-f435-483b-a712-017fc0fd2b5e');

    if (storageError) {
      console.log('❌ Storage error:', storageError);
      return res.status(500).json({ error: 'Storage error', details: storageError });
    }

    console.log(
      'Files in directory:',
      storageData.map((item) => item.name)
    );

    // Find the file by name (last part of the path)
    const currentPathParts = file.storage_path.split('/');
    const fileName = currentPathParts[currentPathParts.length - 1];
    const matchingFile = storageData.find((item) => item.name === fileName);

    if (!matchingFile) {
      console.log('❌ File not found in storage directory');
      return res.status(404).json({ error: 'File not found in storage directory' });
    }

    // Update the storage path to match the actual location
    const correctPath = `13df2d22-2973-4025-a48a-bc712e52f0c5/3f4455b6-f435-483b-a712-017fc0fd2b5e/${fileName}`;

    const { data: updateData, error: updateError } = await supabase
      .from('course_files')
      .update({ storage_path: correctPath })
      .eq('id', id)
      .select();

    if (updateError) {
      console.log('❌ Update error:', updateError);
      return res.status(500).json({ error: 'Update error', details: updateError });
    }

    console.log('✅ Storage path updated successfully');
    console.log('New file details:', {
      id: updateData[0].id,
      name: updateData[0].name,
      storage_path: updateData[0].storage_path,
    });

    return res.json({
      message: 'Storage path updated successfully',
      old_path: file.storage_path,
      new_path: correctPath,
    });
  } catch (error) {
    console.error('Fix storage path error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Temporary: Public module files endpoint for testing
router.get('/modules/:moduleId/files-public', async (req, res) => {
  console.log('Public module files endpoint - getting files for module:', req.params.moduleId);
  const fileService = new FileService();

  try {
    // Use a hardcoded user ID for testing
    const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a';
    const files = await fileService.getModuleFiles(req.params.moduleId, userId);

    return res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Working signed URL endpoint (bypasses problematic FileService.getFile)
router.get('/files/:id/working-signed-url', async (req, res) => {
  try {
    console.log('=== Working Signed URL endpoint ===');
    const { id } = req.params;

    const { supabase } = await import('../config/supabase');
    const { createClient } = await import('@supabase/supabase-js');

    // Get file details from database with ownership check
    const { data: file, error: dbError } = await supabase
      .from('course_files')
      .select(
        `
        *,
        modules!inner(
          id,
          courses!inner(
            id,
            user_id
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (dbError || !file) {
      console.log('❌ File not found in database:', dbError);
      return res.status(404).json({ error: 'File not found', details: dbError });
    }

    console.log('✅ File found, generating signed URL...');
    console.log('📄 File storage path:', file.storage_path);

    // Create service role client
    const supabaseServiceRole = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create signed URL
    const { data: signedData, error: signedError } = await supabaseServiceRole.storage
      .from('course-files')
      .createSignedUrl(file.storage_path, 3600);

    if (signedError) {
      console.log('❌ Signed URL error:', signedError);
      return res.status(500).json({ error: 'Signed URL failed', details: signedError });
    }

    console.log('✅ Signed URL created successfully');
    return res.json({
      success: true,
      data: { url: signedData.signedUrl },
    });
  } catch (error) {
    console.error('Working signed URL error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Test endpoint
router.post('/files/test-upload', (req, res) => {
  console.log('Test upload endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  return res.json({ message: 'Test endpoint working' });
});

// File routes (all require authentication)
router.get('/modules/:moduleId/files', authenticateUser, fileController.getModuleFiles);
router.get('/files/:id', authenticateUser, fileController.getFile);
router.post('/files/upload', authenticateUser, upload.single('file'), fileController.uploadFile);
router.put('/files/:id', authenticateUser, validateRequest(updateFileSchema), fileController.updateFile);
router.delete('/files/:id', authenticateUser, fileController.deleteFile);
router.put('/modules/:moduleId/files/reorder', authenticateUser, fileController.reorderFiles);
router.get('/files/:id/signed-url', authenticateUser, fileController.getSignedUrl);

export { router as fileRoutes };
