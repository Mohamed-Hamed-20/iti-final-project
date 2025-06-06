import { RequestHandler, Router } from "express";
import { Roles } from "../../../DB/interfaces/user.interface";
import { isAuth } from "../../../middleware/auth";
import { valid } from "../../../middleware/validation";
import { asyncHandler } from "../../../utils/errorHandling";
import { cokkiesSchema } from "../../auth/auth.validation";
import { PaymentController } from "../controllers/payment.controller";
import { paymentRequestSchema } from "../validation/payment.validation";

const router = Router();
const paymentController = new PaymentController();

router.post(
  "/createLink",
  //valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User]),
  asyncHandler(paymentController.createPaymentLink.bind(paymentController))
);

router.get(
  "/success-payment/:token",
  asyncHandler(paymentController.sucess.bind(paymentController))
);

router.get(
  "/cancel-payment/:token",
  asyncHandler(paymentController.cancel.bind(paymentController))
);

router.post(
  "/create-payment-card",
  isAuth([Roles.User, Roles.Instructor]),
  asyncHandler(paymentController.createPaymentCard.bind(paymentController))
);

router.get(
  "/success-payment-card/:token",
  asyncHandler(paymentController.sucessPaymentCard.bind(paymentController))
);

router.get(
  "/cancel-payment-card/:token",
  asyncHandler(paymentController.cancelPaymentCard.bind(paymentController))
);

export default router;
