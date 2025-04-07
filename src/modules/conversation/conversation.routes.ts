import express from "express";
import * as CC from "./controller/conversation.controller.js";
import { valid } from "../../middleware/validation.js";
import { isAuth } from "../../middleware/auth.js";
import { Roles } from "../../DB/interfaces/user.interface.js";
import { asyncHandler } from "../../utils/errorHandling.js";

const router = express.Router();

router.post(
  "/",
  isAuth([Roles.Admin, Roles.User, Roles.Instructor]),
  asyncHandler(CC.createconversation)
);

router.get(
  "/",
  isAuth([Roles.Admin, Roles.User, Roles.Instructor]),
  asyncHandler(CC.searchConversations)
);

router.get(
  "/:conversationId",
  isAuth([Roles.Admin, Roles.User, Roles.Instructor]),
  asyncHandler(CC.getconversationById)
);

export default router;
