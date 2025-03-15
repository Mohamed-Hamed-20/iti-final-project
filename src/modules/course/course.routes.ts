import { RequestHandler, Router } from "express";
import * as courseServices from "./services/course.service";
import { addCourseSchema, updateCourseSchema } from "./course.validation";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";
import { isAuth } from "../../middleware/auth";
import { Roles } from "./../../DB/interfaces/user.interface";
import { cokkiesSchema } from "../auth/auth.validation";


const router = Router();

// Add Course (Only Instructors & Admins)
router.post(
  "/add",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.Admin]),
  valid(addCourseSchema) as RequestHandler,
  asyncHandler(courseServices.addCourse)
);

// Get All Courses
router.get(
  "/all",
  asyncHandler(courseServices.getAllCourses)
);

// Get Course By ID
router.get(
  "/:id",
  asyncHandler(courseServices.getCourseById)
);


// Update Course (Only Instructors & Admins)
router.put(
  "/:id",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.Admin]),
  valid(updateCourseSchema) as RequestHandler,
  asyncHandler(courseServices.updateCourse)
);

// Delete Course (Only Instructors & Admins)
router.delete(
  "/:id",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.Admin]),
  asyncHandler(courseServices.deleteCourse)
);

router.post(
  "/search",
  asyncHandler(courseServices.searchCollection)
);




export default router;
