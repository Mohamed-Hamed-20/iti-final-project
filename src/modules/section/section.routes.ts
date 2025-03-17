import { asyncHandler } from "./../../utils/errorHandling";
import { RequestHandler, Router } from "express";
import * as sectionService from "./services/section.service";
import { isAuth } from "../../middleware/auth";
import { Roles } from "../../DB/interfaces/user.interface";
import { valid } from "../../middleware/validation";
import { cokkiesSchema } from "../auth/auth.validation";
import { addsectionSchema } from "./section.validation";
const router = Router();

router.post(
  "/add",
  valid(cokkiesSchema) as RequestHandler,
  valid(addsectionSchema) as RequestHandler,
  isAuth([Roles.Instructor]),
  asyncHandler(sectionService.addsection)
);

router.get(
  "/",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin, Roles.Instructor, Roles.User]),
  asyncHandler(sectionService.getSection)
);

router.get(
  "/search",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin, Roles.Instructor, Roles.User]),
  asyncHandler(sectionService.searchSectionBycourse)
);
export default router;
