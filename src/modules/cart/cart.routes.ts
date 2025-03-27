import { RequestHandler, Router } from "express";
import { valid } from "../../middleware/validation";
import { cokkiesSchema } from "../auth/auth.validation";
import { Roles } from "../../DB/interfaces/user.interface";
import { isAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/errorHandling";
import * as cartService from "./services/cart.service";

const cartRoutes = Router();

cartRoutes.post(
  "/add/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(cartService.cart)
);

cartRoutes.get(
  "/allCourses",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(cartService.getCartCourses)
);

cartRoutes.get(
  "/getCourse/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(cartService.getCourseById)
);

cartRoutes.delete(
  "/remove/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User , Roles.Instructor]),
  asyncHandler(cartService.removeCourse)
);

export default cartRoutes;
