import { RequestHandler, Router } from "express";
import { Roles } from "../../../DB/interfaces/user.interface";
import { isAuth } from "../../../middleware/auth";
import { valid } from "../../../middleware/validation";
import { asyncHandler } from "../../../utils/errorHandling";
import reviewController from "../controllers/review.controller";
import {
  createReviewForCourseSchema,
  createReviewSchema,
  reviewIdSchema,
  updateReviewForCourseSchema,
  updateReviewForInstructorSchema,
  updateReviewSchema,
} from "../validation/review.validation";

const router = Router();

// Create review (only users can create reviews) // مريم
router.post(
  "/instructor",
  valid(createReviewSchema) as RequestHandler,
  isAuth([Roles.User]),
  asyncHandler(reviewController.createReviewForInstructor)
);

// Create review (only users can create reviews) // ME
router.post(
  "/course",
  valid(createReviewForCourseSchema) as RequestHandler,
  isAuth([Roles.User]),
  asyncHandler(reviewController.createReviewForcourse)
);

// Get all reviews (accessible by all authenticated users)
router.get("/", asyncHandler(reviewController.getReviews));

// Get review by ID (accessible by all authenticated users)
router.get(
  "/:id",
  valid(reviewIdSchema) as RequestHandler,
  asyncHandler(reviewController.getReviewById)
);

// Get review statistics for a course or instructor
router.get(
  "/stats/:referenceType/:referenceId",
  valid(reviewIdSchema) as RequestHandler,
  asyncHandler(reviewController.getReviewStats)
);

// Update review (only the review owner can update)
router.patch(
  "/course/:id",
  valid(updateReviewForCourseSchema) as RequestHandler,
  isAuth([Roles.User]),
  asyncHandler(reviewController.updateReviewForCourse)
);

// Update review (only the review owner can update)
router.patch(
  "/instructor/:id",
  valid(updateReviewForInstructorSchema) as RequestHandler,
  isAuth([Roles.User]),
  asyncHandler(reviewController.updateReviewForInstructor)
);

// Delete review (only the review owner can delete)
router.delete(
  "/:id",
  valid(reviewIdSchema) as RequestHandler,
  isAuth([Roles.User]),
  asyncHandler(reviewController.deleteReview)
);

export default router;
