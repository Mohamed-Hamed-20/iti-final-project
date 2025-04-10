import { RequestHandler, Router } from "express";
import * as MC from "./services/message.service";
import { isAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/errorHandling";
import { Roles } from "../../DB/interfaces/user.interface";
import { valid } from "../../middleware/validation";
import { getMessagesSchema } from "./message.valid";

const router = Router();
router.get(
  "/",
  valid(getMessagesSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.User]),
  asyncHandler(MC.getMessages)
);

export default router;
