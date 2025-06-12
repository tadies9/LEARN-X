import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { ModuleController } from '../controllers/moduleController';
import { validateRequest } from '../middleware/validateRequest';
import {
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
} from '../validations/module.validation';

const router = Router();
const moduleController = new ModuleController();

// All routes require authentication
router.use(authenticateUser);

// Module CRUD operations
router.get('/course/:courseId', moduleController.getModules);
router.get('/:id', moduleController.getModule);

router.post('/', validateRequest(createModuleSchema), moduleController.createModule);

router.patch('/:id', validateRequest(updateModuleSchema), moduleController.updateModule);

router.delete('/:id', moduleController.deleteModule);

// Module actions
router.post('/:id/publish', moduleController.publishModule);

router.post('/:id/unpublish', moduleController.unpublishModule);

router.post('/reorder', validateRequest(reorderModulesSchema), moduleController.reorderModules);

// Module files
router.get('/:id/files', moduleController.getModuleFiles);

export default router;
