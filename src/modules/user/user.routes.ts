import { Roles } from "./../../DB/interfaces/user.interface";
import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";
import * as userServices from "./services/user.service";
import { cokkiesSchema } from "../auth/auth.validation";
import { isAuth } from "../../middleware/auth";
import { configureMulter } from "../../utils/multer";


const router = Router();
const upload = configureMulter();

router.get("/", (req: Request, res: Response, next: NextFunction): any => {
  return res.status(200).json({
    message: "hello mr.Mohamed",
  });
});

router.get(
  "/profile",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(userServices.profile)
);

router.get(
  "/instructors",
  asyncHandler(userServices.instructors)
);

router.get(
  "/:id",
  asyncHandler(userServices.getInstructorById)
);

router.post(
"/image",
isAuth([Roles.Admin,Roles.Instructor,Roles.User]),
upload.single("image"),
asyncHandler(userServices.uploadImage)
);


export default router;
