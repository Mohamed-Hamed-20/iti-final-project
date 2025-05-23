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

router.get('/verify',
  asyncHandler(authServices.verifyAuth)
);

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

router.get(
  "/confirm/email/:token",
  valid(confirmEmailSchema) as RequestHandler,
  asyncHandler(authServices.confirmEmail)
);

router.post(
  "/sendCode",
  valid(sendForgetPasswordSchema) as RequestHandler,
  asyncHandler(authServices.sendCode)
);

router.post(
  "/reset",
  valid(resetPasswordSchema) as RequestHandler,
  asyncHandler(authServices.forgetPassword)
);

router.post(
  "/generate/tokens",
  asyncHandler(authServices.generateNewAccessToken)
);
export default router;
