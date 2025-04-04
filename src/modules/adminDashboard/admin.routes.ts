import { Roles } from "./../../DB/interfaces/user.interface";
import {
  Router,
  RequestHandler,
} from "express";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";
import * as adminServices from "./services/admin.service";
import { cokkiesSchema } from "../auth/auth.validation";
import { isAuth } from "../../middleware/auth";



const router = Router();

router.get(
  "/instructorsPending",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getPendingVerifications)
);

router.put("/approveIns/:instructorId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin,Roles.Instructor]),
  asyncHandler(adminServices.approveInstructor)
);

router.get(
  "/coursesPending",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getPendingCourseVerifications)  
);

router.get(
  "/verificationDetails/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getCourseVerificationDetails)  
);

router.put(
  "/approveCourse/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin,Roles.Instructor]),
  asyncHandler(adminServices.approveCourse)
);

router.put(
  "/rejectCourse/:courseId",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin,Roles.Instructor]),
  asyncHandler(adminServices.rejectCourse)
);


export default router;
