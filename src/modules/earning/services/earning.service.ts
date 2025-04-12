import Queue from "bull";
import e, { Request, Response, NextFunction } from "express";
import EarningsModel from "../../../DB/models/earning.model";
import { Types } from "mongoose";
import { EARNING_PERCENTAGE, REDIS } from "../../../config/env";
import courseModel from "../../../DB/models/courses.model";
import EnrollmentModel from "../../../DB/models/enrollment.model";
import ReviewModel from "../../../DB/models/review.model";
import ApiPipeline from "../../../utils/apiFeacture";
import { CustomError } from "../../../utils/errorHandling";

export const getInstructorEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const instructorId = req.user?.id;

  const earnings = await EarningsModel.findOne({ instructorId });
  res.status(200).json(earnings);
};

const PaymentQueue = new Queue("update-instructor-earnings", {
  redis: { host: REDIS.HOST, port: REDIS.PORT },
});

export const bulkUpdateInstructorEarnings = async (
  instructorId: Types.ObjectId,
  totalAmount: number
) => {
  if (!instructorId || typeof totalAmount !== "number") {
    throw new CustomError("instructorId and totalAmount are required", 500);
  }
  await PaymentQueue.add(
    {
      instructorId,
      totalAmount,
    },
    { attempts: 1, backoff: 5000, removeOnComplete: true, removeOnFail: true }
  );
};

PaymentQueue.process(async (job) => {
  const { instructorId, totalAmount } = job.data;

  if (!instructorId || typeof totalAmount !== "number") {
    throw new CustomError("instructorId and totalAmount are required", 500);
  }

  const instructorEarnings = await EarningsModel.findOne({ instructorId });
  if (!instructorEarnings) {
    const newEarnings = await EarningsModel.create({
      instructorId,
      totalInstructorEarnings:
        totalAmount * (EARNING_PERCENTAGE.INSTRUCTOR / 100),
      totalAdminEarnings: totalAmount * (EARNING_PERCENTAGE.ADMIN / 100),
    });

    return newEarnings;
  }

  instructorEarnings.totalInstructorEarnings +=
    totalAmount * (EARNING_PERCENTAGE.INSTRUCTOR / 100);
  instructorEarnings.totalAdminEarnings +=
    totalAmount * (EARNING_PERCENTAGE.ADMIN / 100);

  const updatedInstructorEarnings = await instructorEarnings.save();
  return updatedInstructorEarnings;
});

// Handle job failures
PaymentQueue.on("failed", async (job, err) => {
  await EarningsModel.findOneAndDelete({ instructorId: job.data.instructorId });
  console.error(
    `Job failed for update instructor earnings ${job.data.instructorId}: ${err.message}`
  );
});

// Handle successful job completion
PaymentQueue.on("completed", async (job) => {
  console.log(
    `earnign updated success completed for: ${job.data.instructorId}`
  );
});

export const instructorSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const instructorId = req.user?.id;

  const pipline = new ApiPipeline()
    .matchId({
      field: "instructorId",
      Id: instructorId,
    })
    .lookUp(
      {
        from: "reviews",
        localField: "_id",
        foreignField: "referenceId",
        as: "courseReviews",
        matchFields: {
          referenceType: "course",
        },
        isArray: true,
      },
      {
        userId: 1,
        referenceId: 1,
        referenceType: 1,
        rating: 1,
        comment: 1,
      }
    )
    .lookUp(
      {
        from: "reviews",
        localField: "instructorId",
        foreignField: "referenceId",
        as: "instructorReviews",
        matchFields: {
          referenceType: "instructor",
        },
        isArray: true,
      },
      {
        userId: 1,
        referenceId: 1,
        referenceType: 1,
        rating: 1,
        comment: 1,
      }
    )
    .lookUp(
      {
        from: "enrollments",
        localField: "_id",
        foreignField: "courseId",
        as: "enrollments",
        isArray: true,
        matchFields: {
          status: "completed",
        },
      },
      {
        userId: 1,
        courseId: 1,
        status: 1,
        paymentStatus: 1,
        comment: 1,
      }
    )
    .addStage({
      $group: {
        _id: null,
        totalCourses: { $sum: 1 },
        totalPendingCourses: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
          },
        },
        totalApprovedCourses: {
          $sum: {
            $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
          },
        },
        totalStudents: { $sum: { $size: "$enrollments" } },
        courseAverageRating: { $avg: "$rating" },
        instructorAverageRating: { $avg: "$instructorReviews.rating" },
      },
    })
    .addStage({
      $project: {
        _id: 0,
        totalCourses: 1,
        totalPendingCourses: 1,
        totalApprovedCourses: 1,
        totalStudents: 1,
        totalEarnings: 1,
        courseAverageRating: { $round: ["$courseAverageRating", 1] },
        instructorAverageRating: { $round: ["$instructorAverageRating", 1] },
      },
    })
    .build();

  const [summary, earnings] = await Promise.all([
    courseModel.aggregate(pipline),
    EarningsModel.findOne({ instructorId }).exec(),
  ]);

  return res.status(200).json({
    status: "success",
    data: summary[0] || {
      totalCourses: 0,
      totalPendingCourses: 0,
      totalApprovedCourses: 0,
      totalStudents: 0,
      totalEarnings: 0,
      courseAverageRating: 0,
      instructorAverageRating: 0,
    },
    earnings,
  });
};
