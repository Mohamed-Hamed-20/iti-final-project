import express from "express";
import * as conversationService from './services/conversation.service'
import { asyncHandler } from "../../utils/errorHandling";
import { isAuth } from "../../middleware/auth";
import { Roles } from "../../DB/interfaces/user.interface";

const router = express.Router();

router.post(
  "/",
  isAuth([Roles.Admin, Roles.User, Roles.Instructor]),
  asyncHandler(conversationService.createconversation)
);

router.get(
  "/",
  isAuth([Roles.Admin, Roles.User, Roles.Instructor]),
  asyncHandler(conversationService.searchConversations)
);

router.get(
  "/:conversationId",
  isAuth([Roles.Admin, Roles.User, Roles.Instructor]),
  asyncHandler(conversationService.getconversationById)
);

router.delete(
  "/:conversationId",
  isAuth([Roles.Admin, Roles.User, Roles.Instructor]),
  asyncHandler(conversationService.deleteConversation)
);

export default router;
