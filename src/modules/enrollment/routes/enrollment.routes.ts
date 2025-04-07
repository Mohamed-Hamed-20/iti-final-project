import { RequestHandler, Router } from "express";
import { Roles } from "../../../DB/interfaces/user.interface";
import { isAuth } from "../../../middleware/auth";
import { valid } from "../../../middleware/validation";
import { asyncHandler } from "../../../utils/errorHandling";
import enrollmentController from '../controllers/enrollment.controller';
import { createEnrollmentSchema, updateEnrollmentSchema } from '../validation/enrollment.validation';

const router = Router();

// All routes require authentication
router.use(isAuth([Roles.User]));

// Enroll in a course
router.post(
  '/',
  valid(createEnrollmentSchema) as RequestHandler,
  asyncHandler(enrollmentController.enrollInCourse)
);

// Get user's enrollments
router.get(
  '/',
  asyncHandler(enrollmentController.getEnrollments)
);

// Get specific enrollment
router.get(
  '/:id',
  asyncHandler(enrollmentController.getEnrollmentById)
);

// Update enrollment progress
router.patch(
  '/:id/progress',
  valid(updateEnrollmentSchema) as RequestHandler,
  asyncHandler(enrollmentController.updateProgress)
);

// Cancel enrollment
router.delete(
  '/:id',
  asyncHandler(enrollmentController.cancelEnrollment)
);

// Get enrollment stats for a course (accessible by instructors and admins)
router.get(
  '/stats/:courseId',
  isAuth([Roles.Instructor, Roles.Admin]),
  asyncHandler(enrollmentController.getEnrollmentStats)
);

export default router; 