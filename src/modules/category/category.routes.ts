import {
    Router,
    RequestHandler,
  } from "express";
import { configureMulter } from "../../utils/multer";
import * as categoryServices from "./services/category.service";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";
import { cokkiesSchema } from "../auth/auth.validation";

const router = Router();
const upload = configureMulter();

// Add Category Route
router.post(
  "/add",
  upload.single("thumbnail"),
  valid(cokkiesSchema) as RequestHandler,
  asyncHandler(categoryServices.addCategory)
);

export default router;
