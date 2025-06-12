import { Request, Response } from 'express';
import { CourseService } from '../services/courseService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class CourseController {
  private courseService: CourseService;

  constructor() {
    this.courseService = new CourseService();
  }

  getCourses = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const filters = {
        ...req.query,
        // Include user's own courses and public courses
        userIdOrPublic: userId,
      };

      const { courses, total, page, limit } = await this.courseService.getCourses(filters);

      res.json({
        success: true,
        data: courses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error getting courses:', error);
      throw new AppError('Failed to retrieve courses', 500);
    }
  };

  getCourse = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      const course = await this.courseService.getCourse(courseId, userId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }

      res.json({
        success: true,
        data: course,
      });
    } catch (error) {
      logger.error('Error getting course:', error);
      throw new AppError('Failed to retrieve course', 500);
    }
  };

  createCourse = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseData = {
        ...req.body,
        userId,
      };

      const course = await this.courseService.createCourse(courseData);

      res.status(201).json({
        success: true,
        data: course,
        message: 'Course created successfully',
      });
    } catch (error) {
      logger.error('Error creating course:', error);
      throw new AppError('Failed to create course', 500);
    }
  };

  updateCourse = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      // Check ownership
      const canUpdate = await this.courseService.checkCourseOwnership(courseId, userId);
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this course',
        });
      }

      const course = await this.courseService.updateCourse(courseId, req.body);

      res.json({
        success: true,
        data: course,
        message: 'Course updated successfully',
      });
    } catch (error) {
      logger.error('Error updating course:', error);
      throw new AppError('Failed to update course', 500);
    }
  };

  deleteCourse = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      // Check ownership
      const canDelete = await this.courseService.checkCourseOwnership(courseId, userId);
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this course',
        });
      }

      await this.courseService.deleteCourse(courseId);

      res.json({
        success: true,
        message: 'Course deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting course:', error);
      throw new AppError('Failed to delete course', 500);
    }
  };

  archiveCourse = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      // Check ownership
      const canUpdate = await this.courseService.checkCourseOwnership(courseId, userId);
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to archive this course',
        });
      }

      const course = await this.courseService.updateCourse(courseId, { isArchived: true });

      res.json({
        success: true,
        data: course,
        message: 'Course archived successfully',
      });
    } catch (error) {
      logger.error('Error archiving course:', error);
      throw new AppError('Failed to archive course', 500);
    }
  };

  unarchiveCourse = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      // Check ownership
      const canUpdate = await this.courseService.checkCourseOwnership(courseId, userId);
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to unarchive this course',
        });
      }

      const course = await this.courseService.updateCourse(courseId, { isArchived: false });

      res.json({
        success: true,
        data: course,
        message: 'Course unarchived successfully',
      });
    } catch (error) {
      logger.error('Error unarchiving course:', error);
      throw new AppError('Failed to unarchive course', 500);
    }
  };

  duplicateCourse = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      // Check if user can access the course
      const course = await this.courseService.getCourse(courseId, userId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }

      const duplicatedCourse = await this.courseService.duplicateCourse(courseId, userId);

      res.status(201).json({
        success: true,
        data: duplicatedCourse,
        message: 'Course duplicated successfully',
      });
    } catch (error) {
      logger.error('Error duplicating course:', error);
      throw new AppError('Failed to duplicate course', 500);
    }
  };

  getCourseStats = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      // Check if user can access the course
      const course = await this.courseService.getCourse(courseId, userId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }

      const stats = await this.courseService.getCourseStats(courseId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting course stats:', error);
      throw new AppError('Failed to retrieve course statistics', 500);
    }
  };
}
