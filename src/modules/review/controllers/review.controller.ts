import { NextFunction, Request, Response } from "express";
import reviewService from "../services/review.service";
import ReviewModel from "../../../DB/models/review.model";
import { CustomError } from "../../../utils/errorHandling";
import EnrollmentModel from "../../../DB/models/enrollment.model";
import courseModel from "../../../DB/models/courses.model";
import userModel from "../../../DB/models/user.model";

class ReviewController {
  // async createReview(req: Request, res: Response, next: NextFunction) {
  //   const userId = req.user?._id;
  //   if (!userId) throw new Error("User not authenticated");

  //   const chkreview = await ReviewModel.findOne({
  //     userId: req.user?._id,
  //     referenceId: req.body.referenceId,
  //   });

  //   if (chkreview) {
  //     return next(new CustomError("Review Is Already Exist", 400));
  //   }

  //   const review = await reviewService.createReview(
  //     userId.toString(),
  //     req.body
  //   );

  //   res.status(201).json({
  //     status: "success",
  //     message: "Review created successfully",
  //     data: review,
  //   });
  // }

  async createReviewForcourse(req: Request, res: Response, next: NextFunction) {
    const { rating, comment, referenceType, courseId } = req.body;
    // check if referenceType is course
    if (referenceType !== "course") {
      return next(
        new CustomError(
          "Invalid Reference Type this api to add review for courses",
          400
        )
      );
    }

    const course = await courseModel.findById(courseId);

    if (!course) {
      return next(new CustomError("Course not found", 404));
    }

    // check if user is enrolled in the course
    const isEnrolled = await EnrollmentModel.findOne({
      userId: req.user?._id,
      courseId: courseId,
      paymentStatus: "completed",
    });

    if (!isEnrolled) {
      return next(
        new CustomError(
          "You are not enrolled in this course To add review",
          400
        )
      );
    }

    // check if created Review for this course
    const isReviewExist = await ReviewModel.findOne({
      userId: req.user?._id,
      referenceId: courseId,
      referenceType: "course",
    });

    if (isReviewExist) {
      return next(
        new CustomError("you already created Review for this course", 400)
      );
    }

    const newReviewDoc = new ReviewModel({
      userId: req.user?._id,
      referenceId: courseId,
      referenceType: "course",
      rating,
      comment,
    });

    const [newReview, updatecourse] = await Promise.all([
      newReviewDoc.save(),
      courseModel
        .findByIdAndUpdate(
          { _id: courseId },
          {
            $inc: {
              rating: rating,
              totalRating: 1,
            },
          },
          {
            new: true,
            lean: true,
          }
        )
        .select("title price status instructorId rating totalRating"),
    ]);

    return res.status(200).json({
      message: "Review added successfully",
      statusCode: 200,
      success: true,
      data: { newReview, updatecourse },
    });
  }

  async createReviewForInstructor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { rating, comment, referenceType, instructorId } = req.body;
    // check if referenceType is course
    if (referenceType !== "instructor") {
      return next(
        new CustomError(
          "Invalid Reference Type this api to add review for instructor",
          400
        )
      );
    }

    const instructor = await userModel
      .findOne({
        _id: instructorId,
        role: "instructor",
        verificationStatus: "approved",
      })
      .select("firstName lastName role verificationStatus rating totalRating");

    if (!instructor) {
      return next(new CustomError("Instructor not found", 404));
    }

    // check if user is enrolled in the course
    const isEnrolled = await EnrollmentModel.findOne({
      userId: req.user?._id,
      instructorId: instructorId,
      paymentStatus: "completed",
    }).select("userId instructorId courseId status paymentStatus");

    if (!isEnrolled) {
      return next(
        new CustomError(
          "You are not buy any course from this instructor To add review",
          400
        )
      );
    }

    // check if created Review for this course
    const isReviewExist = await ReviewModel.findOne({
      userId: req.user?._id,
      referenceId: instructorId,
      referenceType: "instructor",
    });

    if (isReviewExist) {
      return next(
        new CustomError("you already created Review for this instructor", 400)
      );
    }

    const newReviewDoc = new ReviewModel({
      userId: req.user?._id,
      referenceId: instructorId,
      referenceType: "instructor",
      rating,
      comment,
    });

    // update course rating and totalRating
    const [newReview, updateinstructor] = await Promise.all([
      newReviewDoc.save(),
      userModel
        .findByIdAndUpdate(
          { _id: instructorId },
          {
            $inc: {
              rating: rating,
              totalRating: 1,
            },
          },
          {
            new: true,
            lean: true,
          }
        )
        .select(
          "firstName lastName role verificationStatus rating totalRating"
        ),
    ]);

    return res.status(200).json({
      message: "Review added successfully",
      statusCode: 200,
      success: true,
      data: { newReview, updateinstructor },
    });
  }

  async updateReviewForCourse(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { rating, comment, referenceType } = req.body;
    const userId = req.user?._id;

    if (referenceType !== "course") {
      return next(
        new CustomError(
          "Invalid Reference Type this api to update review for courses",
          400
        )
      );
    }

    const review = await ReviewModel.findById(id);

    if (!review) {
      return next(new CustomError("Review not found", 404));
    }

    if (String(review.userId) !== String(userId)) {
      return next(
        new CustomError("You are not authorized to update this review", 403)
      );
    }

    let newRating = rating ? rating - review.rating : 0;

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    console.log({ newRating: rating, previousRating: review.rating });

    const [updatedReview, updatedCourse] = await Promise.all([
      review.save(),
      courseModel
        .findByIdAndUpdate(
          { _id: review.referenceId },
          { $inc: { rating: newRating } },
          {
            new: true,
            lean: true,
          }
        )
        .select("title price status instructorId rating totalRating"),
    ]);

    res.status(200).json({
      message: "Review updated successfully",
      statusCode: 200,
      success: true,
      data: { updatedReview, updatedCourse },
    });
  }

  async updateReviewForInstructor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { id } = req.params;
    const { rating, comment, instructorId, referenceType } = req.body;
    const userId = req.user?._id;

    if (referenceType !== "instructor") {
      return next(
        new CustomError(
          "Invalid Reference Type this api to update review for instructor",
          400
        )
      );
    }

    const review = await ReviewModel.findById(id);

    if (!review) {
      return next(new CustomError("Review not found", 404));
    }

    if (String(review.userId) !== String(userId)) {
      return next(
        new CustomError("You are not authorized to update this review", 403)
      );
    }

    let newRating = rating ? rating - review.rating : 0;

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    console.log({ newRating: rating, previousRating: review.rating });

    const [updatedReview, updatedInstructor] = await Promise.all([
      review.save(),
      userModel
        .findByIdAndUpdate(
          { _id: review.referenceId },
          {
            $inc: {
              rating: newRating,
            },
          },
          {
            new: true,
            lean: true,
          }
        )
        .select(
          "firstName lastName role verificationStatus rating totalRating"
        ),
    ]);
    return res.status(200).json({
      message: "Review updated successfully",
      statusCode: 200,
      success: true,
      data: { updatedReview, updatedInstructor },
    });
  }

  async getReviewsForCourse(req: Request, res: Response) {
    const { courseId } = req.params;

    const reviews = await ReviewModel.find({
      referenceId: courseId,
      referenceType: "course",
    }).populate("userId", "firstName lastName");

    return res.status(200).json({
      message: "Reviews retrieved successfully",
      statusCode: 200,
      success: true,
      data: reviews,
    });
  }

  async deleteReview(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const userId = req.user?._id;

    const findReview = await ReviewModel.findById(id);

    if (!findReview) {
      return next(new CustomError("Review not found", 404));
    }

    if (String(findReview.userId) !== String(userId)) {
      return next(
        new CustomError("You are not authorized to delete this review", 403)
      );
    }

    if (findReview.referenceType === "course") {
      await courseModel.findByIdAndUpdate(findReview.referenceId, {
        $inc: { rating: -findReview.rating, totalRating: -1 },
      });
    } else {
      await userModel.findByIdAndUpdate(findReview.referenceId, {
        $inc: { rating: -findReview.rating, totalRating: -1 },
      });
    }

    const deletedReview = await ReviewModel.findByIdAndDelete(id);

    if (!deletedReview) {
      return next(
        new CustomError("Server Error : Please try again later", 500)
      );
    }

    return res.status(200).json({
      message: "Review deleted successfully",
      statusCode: 200,
      success: true,
      data: deletedReview,
    });
  }

  async getReviews(req: Request, res: Response) {
    const reviews = await reviewService.getReviews(req.query);

    res.status(200).json({
      status: "success",
      message: "Reviews retrieved successfully",
      data: reviews,
    });
  }
  async getReviewById(req: Request, res: Response) {
    const { id } = req.params;
    const review = await ReviewModel.findById(id).populate(
      "userId",
      "firstName lastName"
    );

    res.status(200).json({
      status: "success",
      message: "Review retrieved successfully",
      data: review,
    });
  }
  async getReviewStats(req: Request, res: Response) {
    const { referenceId, referenceType } = req.params;
    const stats = await reviewService.getReviewStats(
      referenceId,
      referenceType as "course" | "instructor"
    );

    res.status(200).json({
      status: "success",
      message: "Review statistics retrieved successfully",
      data: stats,
    });
  }
}

export default new ReviewController();
