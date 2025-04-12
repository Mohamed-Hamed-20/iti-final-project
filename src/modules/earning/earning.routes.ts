import { Roles } from "./../../DB/interfaces/user.interface";
import { Router } from "express";
import { asyncHandler } from "../../utils/errorHandling";
import { isAuth } from "../../middleware/auth";
import * as earningServices from "./services/earning.service";

const router = Router();

router.get(
  "/instructor-earnings",
  isAuth([Roles.Instructor]),
  asyncHandler(earningServices.instructorSummary)
);

export default router;
