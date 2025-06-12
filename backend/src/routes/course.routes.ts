import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { CourseController } from '../controllers/courseController';
import { validateRequest } from '../middleware/validateRequest';
import {
  createCourseSchema,
  updateCourseSchema,
  courseSearchSchema,
} from '../validations/course.validation';

const router = Router();
const courseController = new CourseController();

// All routes require authentication
router.use(authenticateUser);

// Course CRUD operations
router.get('/', validateRequest(courseSearchSchema, 'query'), courseController.getCourses);

router.get('/:id', courseController.getCourse);

router.post('/', validateRequest(createCourseSchema), courseController.createCourse);

router.patch('/:id', validateRequest(updateCourseSchema), courseController.updateCourse);

router.delete('/:id', courseController.deleteCourse);

// Course actions
router.post('/:id/archive', courseController.archiveCourse);
router.post('/:id/unarchive', courseController.unarchiveCourse);
router.post('/:id/duplicate', courseController.duplicateCourse);

// Course statistics
router.get('/:id/stats', courseController.getCourseStats);

export default router;
