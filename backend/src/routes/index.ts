import { Router } from 'express';
import authRoutes from './auth.routes';
import personaRoutes from './persona';
import analyticsRoutes from './analytics';
import courseRoutes from './course.routes';
import moduleRoutes from './module.routes';
import { fileRoutes } from './fileRoutes';
import notificationRoutes from './notification.routes';
// import userRoutes from './user.routes';
import aiRoutes from './ai.routes';
import sessionRoutes from './session.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/persona', personaRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/courses', courseRoutes);
router.use('/modules', moduleRoutes);
router.use('/', fileRoutes); // File routes are mixed between /files and /modules
router.use('/notifications', notificationRoutes);
// router.use('/users', userRoutes);
router.use('/ai', aiRoutes);
router.use('/sessions', sessionRoutes);

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
      ai: '/ai',
    },
  });
});

export default router;
