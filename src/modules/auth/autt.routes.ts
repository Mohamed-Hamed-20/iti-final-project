import {RequestHandler, Router} from 'express';
import * as authServices from './services/auth.service';
import { registerSchema } from './auth.validation';
import { valid } from '../../middleware/validation';


const router = Router();




router.post(
  "/register",
  valid(registerSchema) as RequestHandler,
  authServices.register
);



export default router