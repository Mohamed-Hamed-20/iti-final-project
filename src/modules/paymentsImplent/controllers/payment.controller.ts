import { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import { PaymentRequest } from "../../../DB/interfaces/paymentImplemt.interface";
import courseModel from "../../../DB/models/courses.model";
import EnrollmentModel from "../../../DB/models/enrollment.model";
import { TokenService } from "../../../utils/tokens";
import {
  stripePayment,
  TokenConfigration,
  welcome_message,
  FRONTEND,
} from "../../../config/env";
import { CustomError } from "../../../utils/errorHandling";
import {
  canceledTemplet,
  purchaseEmail,
  successTemplet,
} from "../../../utils/htmlTemplet";
import emailQueue from "../../../utils/email.Queue";
import S3Instance from "../../../utils/aws.sdk.s3";
import { ICourse } from "../../../DB/interfaces/courses.interface";
import { IEnrollment } from "../../../DB/interfaces/enrollment.interface";
import { Iuser } from "../../../DB/interfaces/user.interface";
import { addNewconversation } from "../../../utils/conversation.queue";
import { cartModel } from "../../../DB/models/cart.model";
import { Types } from "mongoose";
import { bulkUpdateInstructorEarnings } from "../../../utils/payment.queue";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export class PaymentController {
  constructor() {}

  async createPaymentLink(req: Request, res: Response, next: NextFunction) {
    const { courseId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return next(new CustomError("User not authenticated", 401));
    }

    // Check if course exists and get its details
    const course = await courseModel
      .findById(courseId)
      .select("instructorId title thumbnail price access_type");

    if (!course) {
      return next(new CustomError("Course not found", 404));
    }

    // Check if user is already enrolled
    const existingEnrollment = await EnrollmentModel.findOne({
      userId,
      courseId,
      paymentStatus: "completed", // Only check completed enrollments
    });

    if (existingEnrollment) {
      return next(
        new CustomError("You are already enrolled in this course", 400)
      );
    }

    // For free courses, create enrollment directly
    if (course.access_type === "free") {
      const enrollment = await EnrollmentModel.create({
        userId,
        courseId,
        instructorId: course.instructorId,
        enrollmentDate: new Date(),
        status: "active",
        amount: 0,
        progress: 0,
        paymentStatus: "completed",
      });

      return res.status(200).json({
        message: "Successfully enrolled in free course",
        statusCode: 200,
        success: true,
        enrollment,
      });
    }

    // Create a pending enrollment
    const enrollment = await EnrollmentModel.create({
      userId,
      courseId,
      instructorId: course.instructorId,
      enrollmentDate: new Date(),
      status: "active",
      progress: 0,
      amount: course.price,
      paymentStatus: "pending",
    });

    course.url = await new S3Instance().getFile(course.thumbnail);
    const token = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string,
      "1d"
    ).generateToken({
      enrollmentId: enrollment._id,
      userId: req.user?._id,
      courseId: course._id,
    });

    // For paid courses, create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: req.user?.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              images: course.url ? [course.url] : [],
              description: course.subTitle || `Enrollment for ${course.title}`,
            },
            unit_amount: course.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.protocol}://${req.headers.host}/api/v1/payment/success-payment/${token}`,
      cancel_url: `${req.protocol}://${req.headers.host}/api/v1/payment/cancel-payment/${token}`,
      metadata: {
        courseId: course._id.toString(),
        userId: userId.toString(),
      },
    });

    return res.status(200).json({
      message: "Payment link created successfully",
      statusCode: 200,
      success: true,
      url: session.url,
    });
  }

  async sucess(req: Request, res: Response, next: NextFunction) {
    const token = req.params.token;

    const { userId, enrollmentId, courseId } = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string
    ).verifyToken(token);

    if (!userId || !enrollmentId || !courseId) {
      return res.redirect(stripePayment.CANCELED_URL);
    }

    // Update payment status
    await Promise.all([
      EnrollmentModel.findByIdAndUpdate(
        enrollmentId,
        { paymentStatus: "completed" },
        { new: true }
      ),
      courseModel.findByIdAndUpdate(
        courseId,
        {
          $inc: {
            purchaseCount: 1,
          },
        },
        { new: true }
      ),
    ]);

    const updatedEnrollment = await EnrollmentModel.findById(enrollmentId)
      .populate<{ courseId: ICourse }>("courseId")
      .populate<{ userId: Iuser }>("userId")
      .lean<IEnrollment & { courseId: ICourse; userId: Iuser }>();

    if (
      !updatedEnrollment ||
      !updatedEnrollment.courseId ||
      typeof updatedEnrollment.amount !== "number"
    ) {
      await EnrollmentModel.findByIdAndDelete(enrollmentId);
      return res.redirect(stripePayment.CANCELED_URL);
    }

    // Get course thumbnail image from S3
    const imgUrl = await new S3Instance().getFile(
      updatedEnrollment.courseId.thumbnail as string
    );

    // Prepare and send email to queue
    await emailQueue.add(
      {
        to: updatedEnrollment?.userId?.email,
        subject:
          "Congratulations, your course has been successfully purchased.",
        text: "Welcome to Edrasa! 🎉",
        html: purchaseEmail({
          transactionId: updatedEnrollment._id,
          name: `${updatedEnrollment.userId?.firstName} ${updatedEnrollment.userId?.lastName}`,
          amountPaid: updatedEnrollment?.amount || 0,
          paymentDate: updatedEnrollment.updatedAt,
          contactLink: `${FRONTEND.BASE_URL}/contact`,
          courseImage: imgUrl,
          courseTitle: updatedEnrollment.courseId.title,
          dashboardLink: `${FRONTEND.BASE_URL}/dashboard`,
          year: new Date().getFullYear().toString(),
        }),
        message: "Edrasa",
      },
      {
        attempts: 1,
        backoff: 5000,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    // TODO: create conversation between instructor and user
    // TODO: send welcome message
    await addNewconversation(
      updatedEnrollment?.courseId.instructorId,
      updatedEnrollment?.userId._id,
      (`${welcome_message}\n\n` +
        `🧑‍🎓 Course: ${updatedEnrollment.courseId.title}`) as string
    );

    //  update instructor earnings
    await bulkUpdateInstructorEarnings(
      updatedEnrollment.courseId.instructorId as Types.ObjectId,
      updatedEnrollment?.amount || 0
    );

    return res.redirect(stripePayment.SUCCESS_URL);
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    const token = req.params.token;

    const { userId, enrollmentId, courseId } = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string
    ).verifyToken(token);

    if (!userId || !enrollmentId || !courseId) {
      return res.redirect(stripePayment.CANCELED_URL);
    }

    const updateEnroleMent = await EnrollmentModel.findByIdAndDelete(
      {
        _id: enrollmentId,
      },
      {
        new: true,
        lean: true,
      }
    );
    return res.redirect(stripePayment.CANCELED_URL);
  }
}
