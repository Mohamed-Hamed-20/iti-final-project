import { Router } from "express";
import * as MC from "./controller/message.service";
import { isAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/errorHandling";
import { Roles } from "../../DB/interfaces/user.interface";

const router = Router();
router.get(
  "/",
  isAuth([Roles.Admin, Roles.Instructor, Roles.User]),
  asyncHandler(MC.getMessages)
);

export default router;
