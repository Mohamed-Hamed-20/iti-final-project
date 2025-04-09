import { Types } from "mongoose";
import { IReview } from "../../../DB/interfaces/review.interface";
import courseModel from "../../../DB/models/courses.model";
import EnrollmentModel from "../../../DB/models/enrollment.model";
import ReviewModel from "../../../DB/models/review.model";
import userModel from "../../../DB/models/user.model";
import ApiPipeline from "../../../utils/apiFeacture";
import S3Instance from "../../../utils/aws.sdk.s3";
const reviewfields = [
  "referenceId",
  "referenceType",
  "user",
  "rating",
  "comment",
  "createdAt",
];
class ReviewService {
  async createReview(userId: string, reviewData: Partial<IReview>) {
    // Check if user exists and is a regular user
    const user = await userModel.findById(userId);
    if (!user || user.role !== "user") {
      throw new Error("Only regular users can submit reviews");
    }

    // Check if reference exists and user is eligible to review
    if (reviewData.referenceType === "course") {
      const course = await courseModel.findById(reviewData.referenceId);
      if (!course) {
        throw new Error("Course not found");
      }

      // Check if user is enrolled in the course
      const isEnrolled = await EnrollmentModel.findOne({
        userId: userId,
        courseId: reviewData.referenceId?.toString(),
        status: { $in: ["active", "completed"] },
        paymentStatus: "completed",
      });

      if (!isEnrolled) {
        throw new Error("You must be enrolled in the course to review it");
      }
    } else if (reviewData.referenceType === "instructor") {
      const instructor = await userModel.findOne({
        _id: reviewData.referenceId,
        role: "instructor",
      });
      if (!instructor) {
        throw new Error("Instructor not found");
      }

      // Check if user has taken any course from this instructor
      const instructorCourses = await courseModel.find({
        instructorId: reviewData.referenceId,
      });
      if (!instructorCourses.length) {
        throw new Error("Instructor has no courses");
      }

      // Check if user has enrolled in any of the instructor's courses
      const hasEnrolledCourse = await EnrollmentModel.findOne({
        userId: userId,
        courseId: {
          $in: instructorCourses.map((course) => course._id.toString()),
        },
        status: { $in: ["active", "completed"] },
        paymentStatus: "completed",
      });

      if (!hasEnrolledCourse) {
        throw new Error(
          "You must take a course from this instructor to review them"
        );
      }
    }

    // Create the review
    const review = await ReviewModel.create({
      ...reviewData,
      userId: userId,
    });

    return review;
  }

  async getReviews(filters: Partial<IReview>) {
    const reviews = await ReviewModel.find(filters)
      .populate("userId", "firstName lastName avatar")
      .populate("course")
      .populate("instructor");
    return reviews;
  }

  async getReviewById(reviewId: string) {
    const review = await ReviewModel.findById(reviewId)
      .populate("userId", "firstName lastName avatar")
      .populate("course")
      .populate("instructor");
    if (!review) {
      throw new Error("Review not found");
    }
    return review;
  }

  async updateReview(
    reviewId: string,
    userId: string,
    updateData: Partial<IReview>
  ) {
    const review = await ReviewModel.findOne({ _id: reviewId, userId });
    if (!review) {
      throw new Error(
        "Review not found or you are not authorized to update it"
      );
    }

    Object.assign(review, updateData);
    await review.save();

    return review;
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await ReviewModel.findOneAndDelete({
      _id: reviewId,
      userId,
    });
    if (!review) {
      throw new Error(
        "Review not found or you are not authorized to delete it"
      );
    }
    return review;
  }

  async getReviewStats(
    referenceId: string,
    referenceType: "course" | "instructor"
  ) {
    const pipeline = new ApiPipeline()
      .addStage({
        $match: { referenceId: new Types.ObjectId(referenceId), referenceType },
      })
      .lookUp(
        {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          isArray: false,
        },
        {
          firstName: 1,
          lastName: 1,
          email: 1,
          bio: 1,
          avatar: 1,
        }
      )
      .projection({
        defaultFields: reviewfields,
        allowFields: reviewfields,
        select: undefined,
      })
      .build();

    const reviews = await ReviewModel.aggregate(pipeline);

    const s3Instance = new S3Instance();
    let totalUsersReviews = reviews.length;
    let TotalRating = 0;
    const updatePromises = reviews.map(async (review: IReview) => {
      if (review && review.user && review.user.avatar) {
        review.user.url = await s3Instance.getFile(review.user.avatar);
      }
      console.log(review.rating);

      TotalRating = TotalRating + review.rating;
      console.log(TotalRating);

      return review;
    });
    const updatedReviews = await Promise.all(updatePromises);
    let avarageReviews = TotalRating / totalUsersReviews;

    return {
      totalReviews: totalUsersReviews,
      avarageReviews,
      reviews: updatedReviews,
    };
  }
}

export default new ReviewService();
