import { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import { PaymentRequest } from "../../../DB/interfaces/paymentImplemt.interface";
import courseModel from "../../../DB/models/courses.model";
import EnrollmentModel from "../../../DB/models/enrollment.model";
import EarningsModel from "../../../DB/models/earning.model";
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
  constructor() { }

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
        url: `${FRONTEND.BASE_URL}/course/display/${courseId}`,
        enrollment,
      });
    }

    course.url = await new S3Instance().getFile(course.thumbnail);
    const token = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string,
      "1d"
    ).generateToken({
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

    const { userId, courseId } = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string
    ).verifyToken(token);

    if (!userId || !courseId) {
      return res.redirect(stripePayment.CANCELED_URL);
    }

    // Get course details
    const course = await courseModel.findById(courseId);
    if (!course) {
      return res.redirect(stripePayment.CANCELED_URL);
    }

    // Create enrollment after successful payment
    const enrollment = await EnrollmentModel.create({
      userId,
      courseId,
      instructorId: course.instructorId,
      enrollmentDate: new Date(),
      status: "active",
      progress: 0,
      amount: course.price,
      paymentStatus: "completed",
    });

    // Calculate earnings using environment variables
    const instructorPercentage = Number(process.env.EARNING_PERCENTAGE_INSTRUCTOR) || 90;
    const adminPercentage = Number(process.env.EARNING_PERCENTAGE_ADMIN) || 10;

    const instructorEarnings = (course.price * instructorPercentage) / 100;
    const adminEarnings = (course.price * adminPercentage) / 100;

    console.log('Creating earnings record:', {
      instructorId: course.instructorId,
      instructorEarnings,
      adminEarnings,
      coursePrice: course.price
    });

    try {
      // Create or update earnings record
      const earningsRecord = await EarningsModel.findOneAndUpdate(
        { instructorId: course.instructorId },
        {
          $inc: {
            totalInstructorEarnings: instructorEarnings,
            totalAdminEarnings: adminEarnings
          }
        },
        { upsert: true, new: true }
      );

      console.log('Earnings record created/updated:', earningsRecord);

      if (!earningsRecord) {
        console.error('Failed to create/update earnings record');
        throw new Error('Failed to create/update earnings record');
      }
    } catch (error) {
      console.error('Error creating earnings record:', error);
      // Don't throw the error to prevent breaking the payment flow
      // But log it for debugging
    }

    // Update course purchase count
    await courseModel.findByIdAndUpdate(
      courseId,
      {
        $inc: {
          purchaseCount: 1,
        },
      },
      { new: true }
    );

    const updatedEnrollment = await EnrollmentModel.findById(enrollment._id)
      .populate<{ courseId: ICourse }>("courseId")
      .populate<{ userId: Iuser }>("userId")
      .lean<IEnrollment & { courseId: ICourse; userId: Iuser }>();

    if (
      !updatedEnrollment ||
      !updatedEnrollment.courseId ||
      typeof updatedEnrollment.amount !== "number"
    ) {
      await EnrollmentModel.findByIdAndDelete(enrollment._id);
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

  async createPaymentCard(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?._id;

    if (!userId) {
      return next(new CustomError("User not authenticated", 401));
    }

    const cart = await cartModel
      .findOne({ userId })
      .populate<{ courses: ICourse[] }>({
        path: "courses",
        select: "title thumbnail subTitle price instructorId",
      });

    if (!cart) {
      return next(new CustomError("Cart not found", 404));
    }

    const wantedCourses = (
      await Promise.all(
        cart.courses.map(async (course) => {
          const alreadyPurchased = await EnrollmentModel.findOne({
            userId,
            courseId: course._id,
            paymentStatus: "completed",
          });

          if (!alreadyPurchased) {
            course.url = await new S3Instance().getFile(course.thumbnail);
            return course;
          }

          return null;
        })
      )
    ).filter((course): course is ICourse => course !== null);

    if (wantedCourses.length === 0) {
      return next(new CustomError("All courses already purchased", 400));
    }

    const enrollment = {
      userId,
      isCartOrder: true,
      cartInstructorIds: wantedCourses.map((c) => c.instructorId),
      cartCourses: wantedCourses.map((c) => c._id),
      paymentStatus: "completed",
      amount: wantedCourses.reduce((acc, course) => acc + course.price, 0),
      enrollmentDate: new Date(),
      status: "active",
      progress: 0,
    };

    const token = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string,
      "1d"
    ).generateToken({
      userId: userId.toString(),
      data: enrollment,
      cartId: cart?._id?.toString(),
    });

    // For paid courses, create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: req.user?.email,
      line_items: wantedCourses.map((course) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: course.title,
            images: course.url ? [course.url] : [],
            description: course.subTitle || `Enrollment for ${course.title}`,
          },
          unit_amount: Math.round(course.price * 100),
        },
        quantity: 1,
      })),
      mode: "payment",
      success_url: `${req.protocol}://${req.headers.host}/api/v1/payment/success-payment-card/${token}`,
      cancel_url: `${req.protocol}://${req.headers.host}/api/v1/payment/cancel-payment-card/${token}`,
      metadata: {
        userId: userId.toString(),
        cartId: cart?._id?.toString(),
      },
    } as Stripe.Checkout.SessionCreateParams);

    return res.status(200).json({
      message: "Payment link created successfully",
      statusCode: 200,
      success: true,
      url: session.url,
    });
  }

  async sucessPaymentCard(req: Request, res: Response, next: NextFunction) {
    const token = req.params.token;
    console.log(token);

    const { userId, data, cartId } = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string
    ).verifyToken(token);

    if (!userId || !data || !cartId) {
      return res.redirect(stripePayment.CANCELED_URL);
    }
    console.log({ userId, data, cartId });

    const deleteCart = await cartModel.findByIdAndDelete(cartId);

    // Update payment status
    const enrollment = await EnrollmentModel.create(data);
    console.log(enrollment);

    const updatedEnrollment = await EnrollmentModel.findById(enrollment._id)
      .populate<{ cartCourses: ICourse[] }>({
        path: "cartCourses",
        select: "title thumbnail price instructorId subTitle url",
      })
      .populate<{ userId: Iuser }>({
        path: "userId",
        select: "name email firstName lastName",
      })
      .lean<IEnrollment & { cartCourses: ICourse[]; userId: Iuser }>();

    console.log(updatedEnrollment);
    if (
      !updatedEnrollment ||
      !updatedEnrollment.cartCourses ||
      typeof updatedEnrollment.amount !== "number"
    ) {
      await EnrollmentModel.findByIdAndDelete(enrollment._id);
      return res.redirect(stripePayment.CANCELED_URL);
    }

    for await (const course of updatedEnrollment.cartCourses) {
      console.log({ course });

      // Get course thumbnail image from S3
      const imgUrl = await new S3Instance().getFile(course.thumbnail as string);

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
            courseTitle: course.title,
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
        course.instructorId,
        updatedEnrollment?.userId._id,
        (`${welcome_message}\n\n` + `🧑‍🎓 Course: ${course.title}`) as string
      );

      //  update instructor earnings
      await bulkUpdateInstructorEarnings(
        course.instructorId as Types.ObjectId,
        course.price
      );
    }

    return res.redirect(stripePayment.SUCCESS_URL);
  }

  async cancelPaymentCard(req: Request, res: Response, next: NextFunction) {
    const token = req.params.token;

    const { userId, data, cartId } = new TokenService(
      TokenConfigration.PAYMENT_TOKEN_SECRET as string
    ).verifyToken(token);

    if (!userId || !data || !cartId) {
      return res.redirect(stripePayment.CANCELED_URL);
    }
    return res.redirect(stripePayment.CANCELED_URL);
  }
}
