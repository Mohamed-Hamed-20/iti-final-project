import {
    Router,
    RequestHandler,
  } from "express";
import * as jobsServices from "./services/job.service";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";
import { cokkiesSchema } from "../auth/auth.validation";

const router = Router();

// Add Category Route
router.post(
  "/add",
  valid(cokkiesSchema) as RequestHandler,
  asyncHandler(jobsServices.addJob)
);

router.get(
  "/all",
  asyncHandler(jobsServices.getAllJobs)
);

export default router;
