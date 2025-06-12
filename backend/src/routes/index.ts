import { Router } from 'express';
import authRoutes from './auth.routes';
import personaRoutes from './persona';
import analyticsRoutes from './analytics';
// import userRoutes from './user.routes';
// import courseRoutes from './course.routes';
// import fileRoutes from './file.routes';
// import aiRoutes from './ai.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/persona', personaRoutes);
router.use('/analytics', analyticsRoutes);
// router.use('/users', userRoutes);
// router.use('/courses', courseRoutes);
// router.use('/files', fileRoutes);
// router.use('/ai', aiRoutes);

// API info
router.get('/', (_, res) => {
  res.json({
    message: 'LEARN-X API v1.0',
    endpoints: {
      auth: '/auth',
      persona: '/persona',
      analytics: '/analytics',
      users: '/users',
      courses: '/courses',
      files: '/files',
      ai: '/ai',
    },
  });
});

export default router;