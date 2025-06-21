import { Router } from 'express';
import dashboardRoutes from './dashboard';

const router = Router();

// Mount admin sub-routes
router.use('/dashboard', dashboardRoutes);

// Future admin routes can be added here:
// router.use('/users', userManagementRoutes);
// router.use('/content', contentManagementRoutes);
// router.use('/system', systemConfigRoutes);

export default router;
