import { Response } from 'express';
import { CourseService } from '../services/courseService';
import {
  BaseController,
  AuthenticatedRequest,
  asyncHandler,
  CrudHelpers,
  PaginationResult,
} from '../utils/controllerHelpers';
import type { Course, CreateCourseInput, UpdateCourseInput, CourseFilters } from '../types/course';

interface CourseStats {
  moduleCount: number;
  totalFiles: number;
  totalFileSize: number;
  fileTypes: Record<string, number>;
  processingStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  estimatedDuration: number;
}

export class RefactoredCourseController extends BaseController {
  private courseService: CourseService;

  constructor() {
    super();
    this.courseService = new CourseService();
  }

  // Use the CRUD helper for standard operations
  getCourses = CrudHelpers.createGetListHandler<Course, CourseFilters>(
    {
      getList: async (
        filters: CourseFilters,
        userId: string
      ): Promise<PaginationResult<Course>> => {
        const enhancedFilters = {
          ...filters,
          userIdOrPublic: userId, // Include user's courses and public courses
        };
        return this.courseService.getCourses(enhancedFilters);
      },
    },
    (query, userId) => ({
      ...query,
      userIdOrPublic: userId,
    })
  );

  getCourse = CrudHelpers.createGetByIdHandler<Course>(
    {
      getById: (courseId: string, userId: string) => this.courseService.getCourse(courseId, userId),
    },
    'Course'
  );

  createCourse = CrudHelpers.createCreateHandler<Course, CreateCourseInput>(
    {
      create: (data: CreateCourseInput, userId: string) =>
        this.courseService.createCourse({
          ...data,
          userId,
        }),
    },
    (body, userId) => ({ ...body, userId }),
    'Course'
  );

  updateCourse = CrudHelpers.createUpdateHandler<Course, UpdateCourseInput>(
    this.courseService,
    'Course'
  );

  deleteCourse = CrudHelpers.createDeleteHandler(this.courseService, 'Course');

  // Custom actions using the base controller utilities
  archiveCourse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const courseId = req.params.id;

    const hasOwnership = await this.courseService.checkCourseOwnership(courseId, userId);
    if (!hasOwnership) {
      return this.sendForbidden(res, 'archive this course');
    }

    const course = await this.courseService.updateCourse(courseId, { isArchived: true });
    this.sendSuccess(res, course, 'Course archived successfully');
  });

  unarchiveCourse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const courseId = req.params.id;

    const hasOwnership = await this.courseService.checkCourseOwnership(courseId, userId);
    if (!hasOwnership) {
      return this.sendForbidden(res, 'unarchive this course');
    }

    const course = await this.courseService.updateCourse(courseId, { isArchived: false });
    this.sendSuccess(res, course, 'Course unarchived successfully');
  });

  duplicateCourse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const courseId = req.params.id;

    // Check if user can access the course
    const course = await this.courseService.getCourse(courseId, userId);
    if (!course) {
      return this.sendNotFound(res, 'Course');
    }

    const duplicatedCourse = await this.courseService.duplicateCourse(courseId, userId);
    this.sendSuccess(res, duplicatedCourse, 'Course duplicated successfully', 201);
  });

  getCourseStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = this.getUserId(req);
    const courseId = req.params.id;

    // Check if user can access the course
    const course = await this.courseService.getCourse(courseId, userId);
    if (!course) {
      return this.sendNotFound(res, 'Course');
    }

    const stats = await this.courseService.getCourseStats(courseId);
    this.sendSuccess(res, stats);
  });
}
