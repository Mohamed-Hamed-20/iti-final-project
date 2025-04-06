import { RequestHandler, Router } from "express";
import { valid } from "../../middleware/validation";
import { cokkiesSchema } from "../auth/auth.validation";
import { Roles } from "../../DB/interfaces/user.interface";
import { isAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/errorHandling";
import * as paymentService from "./services/payment.service";

const paymentRoutes = Router();

paymentRoutes.post(
  "/createLink",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(paymentService.createPaymentLink)
);

paymentRoutes.post(
  "/webhook",
//   valid(cokkiesSchema) as RequestHandler,
//   isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(paymentService.handleWebhook)
);


export default paymentRoutes;
