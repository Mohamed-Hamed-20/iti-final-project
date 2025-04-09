import { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import { PaymentRequest } from "../../../DB/interfaces/paymentImplemt.interface";
import courseModel from "../../../DB/models/courses.model";
import EnrollmentModel from "../../../DB/models/enrollment.model";
import { PaymentService } from "../services/payment.service";
import { TokenService } from "../../../utils/tokens";
import { stripePayment, TokenConfigration } from "../../../config/env";
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  async createPaymentLink(req: Request, res: Response) {
    const { courseId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Check if course exists and get its details
    const course = await courseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await EnrollmentModel.findOne({
      userId,
      courseId,
      paymentStatus: "completed", // Only check completed enrollments
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course",
      });
    }

    // For free courses, create enrollment directly
    if (course.access_type === "free") {
      const enrollment = await EnrollmentModel.create({
        userId,
        courseId,
        enrollmentDate: new Date(),
        status: "active",
        progress: 0,
        paymentStatus: "completed",
      });

      return res.status(200).json({
        success: true,
        message: "Successfully enrolled in free course",
        enrollment,
      });
    }

    // Create a pending enrollment
    const enrollment = await EnrollmentModel.create({
      userId,
      courseId,
      enrollmentDate: new Date(),
      status: "active",
      progress: 0,
      paymentStatus: "pending",
    });

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

    res.status(200).json({
      success: true,
      url: session.url,
      message: "Payment link created successfully",
    });
  }

  async handleSuccessfulPayment(session: Stripe.Checkout.Session) {
    const metadata = session.metadata;
    if (!metadata || !metadata.courseId || !metadata.userId) {
      console.error("Missing metadata in Stripe session");
      return;
    }

    await EnrollmentModel.findOneAndUpdate(
      {
        userId: metadata.userId,
        courseId: metadata.courseId,
        paymentStatus: "pending",
      },
      {
        paymentStatus: "completed",
      }
    );
  }

  async handleStripeWebhook(req: Request, res: Response) {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleSuccessfulPayment(session);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  async processStripePayment(req: Request, res: Response) {
    try {
      const paymentRequest: PaymentRequest = req.body;
      const result = await this.paymentService.processStripePayment(
        paymentRequest
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async processPayPalPayment(req: Request, res: Response) {
    try {
      const paymentRequest: PaymentRequest = req.body;
      const result = await this.paymentService.processPayPalPayment(
        paymentRequest
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async processGooglePayPayment(req: Request, res: Response) {
    try {
      const paymentRequest: PaymentRequest = req.body;
      const result = await this.paymentService.processGooglePayPayment(
        paymentRequest
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
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
    await EnrollmentModel.findByIdAndUpdate(
      enrollmentId,
      { paymentStatus: "completed" },
      { new: true }
    );

    const updatedEnrollment = await EnrollmentModel.findById(enrollmentId)
      .populate<{ courseId: ICourse }>("courseId")
      .populate<{ userId: Iuser }>("userId")
      .lean<IEnrollment & { courseId: ICourse; userId: Iuser }>();

    if (!updatedEnrollment || !updatedEnrollment.courseId) {
      return res.redirect(stripePayment.CANCELED_URL);
    }

    // Get course thumbnail image from S3
    const imgUrl = await new S3Instance().getFile(
      updatedEnrollment.courseId.thumbnail as string
    );
    console.log({ updatedEnrollment });

    // Prepare and send email to queue
    await emailQueue.add(
      {
        to: updatedEnrollment?.userId?.email,
        subject:
          "Congratulations, your course has been successfully purchased.",
        text: "Welcome to Mentora! 🎉",
        html: purchaseEmail({
          transactionId: updatedEnrollment._id,
          name: `${updatedEnrollment.userId?.firstName} ${updatedEnrollment.userId?.lastName}`,
          amountPaid: updatedEnrollment.courseId.price,
          paymentDate: updatedEnrollment.updatedAt,
          contactLink: "https://mentora.com/contact",
          courseImage: imgUrl,
          courseTitle: updatedEnrollment.courseId.title,
          dashboardLink: "https://mentora.com/dashboard",
          year: "2025",
        }),
        message: "Mentora",
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
      process.env.welcome_message as string
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
