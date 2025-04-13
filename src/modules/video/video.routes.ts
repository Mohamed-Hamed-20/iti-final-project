import { asyncHandler } from "./../../utils/errorHandling";
import { instructors } from "./../user/services/user.service";
import { Roles } from "./../../DB/interfaces/user.interface";
import { RequestHandler, Router } from "express";
import { configureMulter, multerMemory } from "../../utils/multer";
import { FileType } from "../../utils/files.allowed";
import * as videoService from "./services/video.service";
import { isAuth } from "../../middleware/auth";
import { valid } from "../../middleware/validation";
import { cokkiesSchema } from "../auth/auth.validation";
import { addvideoSchema } from "./video.validation";
import { checkLogin } from "../course/services/course.service";
const router = Router();

router.post(
  "/add",
  configureMulter(
    1024 * 1024 * 1024,
    [...FileType.Videos],
    "uploads/original"
  ).single("video"),
  // valid(cokkiesSchema) as RequestHandler,
  valid(addvideoSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.Admin]),
  asyncHandler(videoService.addVideo)
);

router.put(
  "/:videoId",
  //valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.Admin]),
  asyncHandler(videoService.updateVideo)
);

router.get("/signed-url", asyncHandler(videoService.addVideo));
router.get(
  "/",
  checkLogin() as RequestHandler,
  asyncHandler(videoService.getVideo)
);

router.delete(
  "/:videoId",
  // valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Instructor, Roles.Admin]),
  asyncHandler(videoService.deleteVideo)
);

export default router;
