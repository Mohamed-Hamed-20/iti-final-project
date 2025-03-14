import { Router } from "express";
import userRouter from "./modules/user/user.routes";
import authRouter from "./modules/auth/autt.routes";
import {instructor} from "./modules/user/controllers/instructors.controller.js";
const router = Router();
router.use("/user", userRouter);
router.use("/auth", authRouter);
router.use("/instructors", instructor);

export default router;
