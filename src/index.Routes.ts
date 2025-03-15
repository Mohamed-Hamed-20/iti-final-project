import { Router } from "express";
import userRouter from "./modules/user/user.routes";
import authRouter from "./modules/auth/auth.routes";
import courseRouter from "./modules/course/course.routes";
const router = Router();
router.use("/user", userRouter);
router.use("/auth", authRouter);
router.use("/course", courseRouter);

export default router;
