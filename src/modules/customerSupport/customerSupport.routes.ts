import { RequestHandler, Router } from "express";
import { Roles } from "../../DB/interfaces/user.interface";
import { isAuth } from "../../middleware/auth";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";
import { cokkiesSchema } from "../auth/auth.validation";
import { CustomerSupportController } from "./services/customerSupport.controller";
import { createTicketSchema, updateTicketSchema } from "./customerSupport.validation";

const router = Router();
const controller = new CustomerSupportController();

router.post(
  "/ticket",
  valid(cokkiesSchema) as RequestHandler,
  valid(createTicketSchema) as RequestHandler,
  isAuth([Roles.User]),
  asyncHandler(controller.createTicket.bind(controller))
);

router.get(
  "/tickets",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin]),
  asyncHandler(controller.getAllTickets.bind(controller))
);

router.get(
  "/ticket/:id",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Admin, Roles.User]),
  asyncHandler(controller.getTicketById.bind(controller))
);

router.put(
  "/ticket/:id",
  valid(cokkiesSchema) as RequestHandler,
  valid(updateTicketSchema) as RequestHandler,
  isAuth([Roles.Admin]),
  asyncHandler(controller.updateTicket.bind(controller))
);

export default router;
