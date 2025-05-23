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
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getPendingVerifications)
);

router.get(
  "/allInstructors",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getAllInstructors)
);

router.put("/approveIns/:instructorId",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin,Roles.Instructor]),
  asyncHandler(adminServices.approveInstructor)
);
router.put("/rejectIns/:instructorId",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin,Roles.Instructor]),
  asyncHandler(adminServices.rejectInstructor)
);

router.get(
  "/coursesPending",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getPendingCourseVerifications)  
);

router.get(
  "/coursesDelete",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getDeleteCourseVerifications)  
);

router.get(
  "/verificationDetails/:courseId",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.getCourseVerificationDetails)  
);

router.put(
  "/approveCourse/:courseId",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin,Roles.Instructor]),
  asyncHandler(adminServices.approveCourse)
);

router.put(
  "/rejectCourse/:courseId",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin,Roles.Instructor]),
  asyncHandler(adminServices.rejectCourse)
);

router.delete(
  "/:id",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.Admin]),
  asyncHandler(adminServices.deleteCourse)
);


export default router;
