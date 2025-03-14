import { RequestHandler, Router } from "express";
import * as authServices from "./services/auth.service";
import {
  confirmEmailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sendForgetPasswordSchema,
} from "./auth.validation";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";

const router = Router();

router.post(
  "/register",
  valid(registerSchema) as RequestHandler,
  asyncHandler(authServices.register)
);

router.post(
  "/login",
  valid(loginSchema) as RequestHandler,
  asyncHandler(authServices.login)
);

router.post(
  "/send/forget/password",
  valid(sendForgetPasswordSchema) as RequestHandler,
  asyncHandler(authServices.sendForgetPasswordEmail)
);

router.post(
  "/reset/password/:token",
  valid(resetPasswordSchema) as RequestHandler,
  asyncHandler(authServices.resetPassword)
);

router.get(
  "/confirm/email/:token",
  valid(confirmEmailSchema) as RequestHandler,
  asyncHandler(authServices.confirmEmail)
);

export default router;
