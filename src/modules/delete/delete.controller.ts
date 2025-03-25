import { RequestHandler, Router } from "express";
import * as deleteRequestServices from "./service/delete.service";
import { asyncHandler } from "../../utils/errorHandling";
import { valid } from "../../middleware/validation";
import { cokkiesSchema } from "../auth/auth.validation";
import { isAuth } from "../../middleware/auth";
import { Roles } from "../../DB/interfaces/user.interface";
import {
  cancelMyrequestSchema,
  sendRequestToDeleteSchema,
} from "./deleteRequest.vaildation";
const router = Router();

router.post(
  "/send",
  valid(cokkiesSchema) as RequestHandler,
  valid(sendRequestToDeleteSchema) as RequestHandler,
  isAuth([Roles.Instructor]),
  asyncHandler(deleteRequestServices.requestToDelete)
);

router.delete(
  "/cancel",
  valid(cokkiesSchema) as RequestHandler,
  valid(cancelMyrequestSchema) as RequestHandler,
  isAuth([Roles.Instructor]),
  asyncHandler(deleteRequestServices.deleteMyrequest)
);

router.get("/all");

router.get("/:id");

export default router;
