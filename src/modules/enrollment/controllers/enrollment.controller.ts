import { Request, Response } from 'express';
import enrollmentService from '../services/enrollment.service';

class EnrollmentController {
  async enrollInCourse(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    const enrollment = await enrollmentService.enrollInCourse(
      userId.toString(),
      req.body.courseId
    );

    res.status(201).json({
      status: 'success',
      message: 'Successfully enrolled in course',
      data: enrollment
    });
  }

  async getEnrollments(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    const enrollments = await enrollmentService.getEnrollments(
      userId.toString(),
      req.query
    );

    res.status(200).json({
      status: 'success',
      message: 'Enrollments retrieved successfully',
      data: enrollments
    });
  }

  async getEnrollmentById(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    const enrollment = await enrollmentService.getEnrollmentById(
      userId.toString(),
      req.params.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Enrollment retrieved successfully',
      data: enrollment
    });
  }

  async updateProgress(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    const enrollment = await enrollmentService.updateProgress(
      userId.toString(),
      req.params.id,
      req.body.progress
    );

    res.status(200).json({
      status: 'success',
      message: 'Progress updated successfully',
      data: enrollment
    });
  }

  async cancelEnrollment(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    const enrollment = await enrollmentService.cancelEnrollment(
      userId.toString(),
      req.params.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Enrollment cancelled successfully',
      data: enrollment
    });
  }

  async getEnrollmentStats(req: Request, res: Response) {
    const stats = await enrollmentService.getEnrollmentStats(req.params.courseId);

    res.status(200).json({
      status: 'success',
      message: 'Enrollment statistics retrieved successfully',
      data: stats
    });
  }
}

export default new EnrollmentController(); 