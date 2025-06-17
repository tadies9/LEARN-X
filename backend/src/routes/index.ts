import { Router } from 'express';
import authRoutes from './auth.routes';
import personaRoutes from './persona';
import analyticsRoutes from './analytics';
import courseRoutes from './course.routes';
import moduleRoutes from './module.routes';
import { fileRoutes } from './fileRoutes';
import notificationRoutes from './notification.routes';
// import userRoutes from './user.routes';
// Removed old AI routes - use aiLearnRoutes instead
import sessionRoutes from './session.routes';
import aiLearnRoutes from './aiLearnRoutes';
import learnOutlineRoute from './learnOutlineRoute';
import searchRoutes from './searchRoutes';
import savedContentRoutes from './savedContentRoutes';
import { healthRoutes } from './healthRoutes';
import dashboardRoutes from './dashboard';

const router = Router();

// Test endpoint for learn routes
router.get('/learn-test', (_req, res) => {
  res.json({ success: true, message: 'Learn test route working!' });
});

// Test endpoint for module files (bypasses all middleware)
router.get('/test-module-files/:moduleId', async (req, res) => {
  try {
    // Direct test endpoint - getting files for module
    const { FileService } = await import('../services/fileService');
    const fileService = new FileService();

    // Use a hardcoded user ID for testing
    const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a';
    const files = await fileService.getModuleFiles(req.params.moduleId, userId);

    res.json({
      success: true,
      data: files,
      debug: {
        moduleId: req.params.moduleId,
        userId,
        fileCount: files.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: { moduleId: req.params.moduleId },
    });
  }
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/persona', personaRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/courses', courseRoutes);
router.use('/modules', moduleRoutes);
router.use('/notifications', notificationRoutes);
// router.use('/users', userRoutes);
router.use('/learn/outline', learnOutlineRoute); // Outline generation route
router.use('/learn', aiLearnRoutes); // AI learning routes with advanced personalization
router.use('/sessions', sessionRoutes);
router.use('/search', searchRoutes); // Vector search routes
router.use('/saved', savedContentRoutes); // Saved content routes
router.use('/dashboard', dashboardRoutes); // Dashboard statistics and activity routes
router.use('/', healthRoutes); // Health and monitoring routes
router.use('/', fileRoutes); // File routes are mixed between /files and /modules - mount last

// API info
router.get('/', (_, res) => {
  res.json({
    message: 'LEARN-X API v1.0',
    endpoints: {
      auth: '/auth',
      persona: '/persona',
      analytics: '/analytics',
      courses: '/courses',
      modules: '/modules',
      users: '/users',
      files: '/files',
      learn: '/learn',
      health: '/health',
    },
  });
});

export default router;
