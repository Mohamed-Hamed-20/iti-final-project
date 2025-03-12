import { Router } from "express";
import userRouter from "./modules/user/user.routes";
import authRouter from "./modules/auth/autt.routes";
const router = Router();
router.use("/user", userRouter);
router.use("/auth", authRouter);

export default router;
