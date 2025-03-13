import { RequestHandler, Router } from "express";
import * as authServices from "./services/auth.service";
import { loginSchema, registerSchema } from "./auth.validation";
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



export default router;
