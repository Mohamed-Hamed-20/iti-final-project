import { Router } from 'express';
import { isAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/errorHandling";
import { getUserNotifications } from './notification.controller';
import { Roles } from '../../DB/interfaces/user.interface';

const router = Router();

router.get('/', isAuth([Roles.Admin,Roles.Instructor,Roles.User]), asyncHandler(getUserNotifications));

export default router;
