import { RequestHandler, Router } from "express";
import { wishList } from "./services/wishlist.service";
import { valid } from "../../middleware/validation";
import { cokkiesSchema } from "../auth/auth.validation";
import { Roles } from "../../DB/interfaces/user.interface";
import { isAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/errorHandling";
import * as wishlistService from "./services/wishlist.service";

const wishlistRoutes = Router();

wishlistRoutes.post(
  "/add/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(wishlistService.wishList)
);

wishlistRoutes.get(
  "/allCourses",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(wishlistService.getWishListCourses)
);

wishlistRoutes.get(
  "/getCourse/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(wishlistService.getCourseById)
);

wishlistRoutes.delete(
  "/remove/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(wishlistService.removeCourse)
);

export default wishlistRoutes;
