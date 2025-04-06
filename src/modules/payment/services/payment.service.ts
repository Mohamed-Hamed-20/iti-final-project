import { NextFunction, Request, Response } from "express";
import { cartModel } from "../../../DB/models/cart.model";
import { CustomError } from "../../../utils/errorHandling";
import courseModel from "../../../DB/models/courses.model";
import S3Instance from "../../../utils/aws.sdk.s3";
import { Iuser } from "../../../DB/interfaces/user.interface";
import fetch from "node-fetch";

interface Category {
  _id: string;
  title: string;
}

interface Course {
  _id: string;
  title: string;
  categoryId?: Category | null;
}

interface IOrderResponse {
    id: number;
}

interface IPaymentKeyResponse {
    token: string;
}

export const cart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;

  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await cartModel.findOne({ userId: user._id, courseId });

  if (isCourseExist) {
    return next(new CustomError("Course already exists", 400));
  }

  const courseAdded = new cartModel({
    userId: user._id,
    courseId,
    isCartAdded: true,
  });
  const courseSaved = await courseAdded.save();

  if (!courseSaved) {
    return next(
      new CustomError("Something went wrong during saving course", 400)
    );
  }
  res.status(200).json({
    message: "Course added successfully in cart",
    statusCode: 200,
    success: true,
  });
};

const API_KEY = process.env.PAYMOB_API_KEY as string;
const INTEGRATION_ID = Number(process.env.PAYMOB_INTEGRATION_ID);

let authToken = "";

const getToken = async (): Promise<string> => {
  const res = await fetch("https://accept.paymob.com/api/auth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: API_KEY }),
  });

  const data = (await res.json()) as { token: string };
  authToken = data.token;
  return authToken;
};

export const createPaymentLink = async (
  req: Request,
  res: Response
): Promise<void> => {

  const { courseId } = req.body;
  const { user } = req as { user: Iuser };

  const course = await courseModel.findById(courseId).populate("instructorId");
  
  if (!course) {
    res.status(404).json({ message: "Course not found" });
    return;
  }

  const token = await getToken();

  // 1. Create Order
  const orderRes = await fetch(
    "https://accept.paymob.com/api/ecommerce/orders",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount_cents: course.price * 100,
        currency: "EGP",
        items: [
          {
            name: course.title,
            amount_cents: course.price * 100,
            description: course.description,
            quantity: 1,
          },
        ],
      }),
    }
  );

  const orderData = (await orderRes.json()) as IOrderResponse;
  const orderId = orderData.id;

  // 2. Create Payment Key
  const paymentKeyRes = await fetch(
    "https://accept.paymob.com/api/acceptance/payment_keys",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount_cents: course.price * 100,
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          phone_number: "0123456789",
          street: "NA",
          building: "NA",
          floor: "NA",
          apartment: "NA",
          city: "NA",
          state: "NA",
          country: "NA",
          postal_code: "NA",
          shipping_method: "NA",
        },
        currency: "EGP",
        integration_id: INTEGRATION_ID,
        redirect_url: 'http://localhost:5173/payment-success',
      }),
    }
  );

  const paymentKeyData = await paymentKeyRes.json() as IPaymentKeyResponse;
  const paymentKey = paymentKeyData.token;

  const iframeURL = `https://accept.paymob.com/api/acceptance/iframes/911935?payment_token=${paymentKey}`; 

  res.status(200).json({ success: true, url: iframeURL });
};

export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const data = req.body;
    console.log(`data for webhook ` , data);
    
//   if (data.obj.success === true) {
//     const courseId = data.obj.order.items[0].name; // Assuming course title is unique
//     const course = await courseModel.findOne({ title: courseId }).populate(
//       "instructorId"
//     );
//     if (!course) {
//       res.status(404).send("Course not found");
//       return;
//     }

//     // const instructor = course.instructorId;
//     // const coursePrice = data.obj.amount_cents / 100;
//     // const instructorShare = coursePrice * 0.8;

//     // instructor.balance += instructorShare;
//     // await instructor.save();

//     res.status(200).send("Payment processed");
//     return;
//   }

  res.status(400).send("Payment failed or not completed");
};
