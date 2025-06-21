import { Response } from 'express';
import { CourseService } from '../services/courseService';
import {
  BaseController,
  AuthenticatedRequest,
  asyncHandler,
  CrudHelpers,
  PaginationResult,
} from '../utils/controllerHelpers';
import type { Course, CreateCourseData, UpdateCourseData, CourseFilters } from '../types/course';

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
        const result = await this.courseService.getCourses(enhancedFilters);
        return {
          data: result.courses,
          total: result.total,
          page: result.page,
          limit: result.limit,
        };
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

  createCourse = CrudHelpers.createCreateHandler<Course, CreateCourseData>(
    {
      create: (data: CreateCourseData, userId: string) =>
        this.courseService.createCourse({
          ...data,
          userId,
          settings: data.settings as Record<string, unknown>,
        }),
    },
    (body, userId) => ({ ...body, userId }),
    'Course'
  );

  updateCourse = CrudHelpers.createUpdateHandler<Course, UpdateCourseData>(
    {
      update: (id: string, data: UpdateCourseData, _userId: string) =>
        this.courseService.updateCourse(id, {
          ...data,
          settings: data.settings as Record<string, unknown>,
        }),
      checkOwnership: (id: string, userId: string) =>
        this.courseService.checkCourseOwnership(id, userId),
    },
    'Course'
  );

  deleteCourse = CrudHelpers.createDeleteHandler(
    {
      delete: async (id: string, _userId: string) => {
        await this.courseService.deleteCourse(id);
      },
      checkOwnership: (id: string, userId: string) =>
        this.courseService.checkCourseOwnership(id, userId),
    },
    'Course'
  );

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
