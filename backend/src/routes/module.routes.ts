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

// Debug endpoint - development only
if (process.env.NODE_ENV === 'development') {
  router.get('/:id/files-debug', async (req, res) => {
    try {
      const moduleId = req.params.id;
      console.log('Debug: Getting files for module:', moduleId);

      const { supabase } = await import('../config/supabase');

      // First check if module exists
      const { data: moduleCheck, error: moduleError } = await supabase
        .from('modules')
        .select('id, title, course_id')
        .eq('id', moduleId)
        .single();

      console.log('Debug: Module check:', { moduleCheck, moduleError });

      // Get ALL files to see what's in the database
      const { data: allFiles, error: allError } = await supabase
        .from('course_files')
        .select('id, name, module_id, course_id')
        .order('created_at', { ascending: false });

      console.log('Debug: All files in database:', {
        totalCount: allFiles?.length || 0,
        error: allError,
      });

      // Get files for this specific module
      const { data: files, error } = await supabase
        .from('course_files')
        .select('*')
        .eq('module_id', moduleId);

      console.log('Debug: Raw query result:', {
        moduleId,
        fileCount: files?.length || 0,
        error,
      });

      if (files) {
        console.log(
          'Debug: Files found:',
          files.map((f) => ({
            id: f.id,
            name: f.name,
            module_id: f.module_id,
            course_id: f.course_id,
          }))
        );
      }

      // Check if there are files with matching course_id but different module_id
      if (moduleCheck && allFiles) {
        const courseFiles = allFiles.filter((f) => f.course_id === moduleCheck.course_id);
        const otherModuleFiles = courseFiles.filter((f) => f.module_id !== moduleId);

        console.log('Debug: Course file distribution:', {
          totalCourseFiles: courseFiles.length,
          thisModuleFiles: files?.length || 0,
          otherModuleFiles: otherModuleFiles.length,
          otherModules: [...new Set(otherModuleFiles.map((f) => f.module_id))],
        });
      }

      res.json({
        success: true,
        data: files || [],
        debug: {
          moduleId,
          moduleInfo: moduleCheck,
          fileCount: files?.length || 0,
          rawFiles: files,
          allFilesCount: allFiles?.length || 0,
          sampleAllFiles: allFiles?.slice(0, 5),
        },
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: { moduleId: req.params.id },
      });
    }
  });
}

export default router;
