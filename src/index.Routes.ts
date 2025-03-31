import { Router } from "express";
import authRouter from "./modules/auth/auth.routes";
import cartRoutes from "./modules/cart/cart.routes";
import categoryRouter from "./modules/category/category.routes";
import courseRouter from "./modules/course/course.routes";
import customerRouter from './modules/customerSupport/customerSupport.routes';
import deleteRequestRouter from "./modules/delete/delete.controller";
import jobRouter from "./modules/jobs/job.routes";
import notificationRouter from "./modules/notification/notification.routes";
import sectionRouter from "./modules/section/section.routes";
import userRouter from "./modules/user/user.routes";
import videoRouter from "./modules/video/video.routes";
import wishlistRoutes from "./modules/wishlist/wishlist.routes";
import postRouter from "./modules/posts/posts.routes";

const router = Router();
router.use("/user", userRouter);
router.use("/auth", authRouter);
router.use("/category", categoryRouter);
router.use("/course", courseRouter);
router.use("/video", videoRouter);
router.use("/section", sectionRouter);
router.use("/job", jobRouter);
router.use("/delete/request", deleteRequestRouter);
router.use("/custoersupport" , customerRouter)
router.use("/course/wishlist" , wishlistRoutes)
router.use("/course/cart" , cartRoutes)
router.use("/notifications", notificationRouter);
router.use("/posts", postRouter);

export default router;
