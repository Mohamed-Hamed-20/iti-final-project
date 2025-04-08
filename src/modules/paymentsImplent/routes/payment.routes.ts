import { RequestHandler, Router } from 'express';
import { Roles } from '../../../DB/interfaces/user.interface';
import { isAuth } from '../../../middleware/auth';
import { valid } from "../../../middleware/validation";
import { asyncHandler } from '../../../utils/errorHandling';
import { cokkiesSchema } from "../../auth/auth.validation";
import { PaymentController } from '../controllers/payment.controller';
import { paymentRequestSchema } from '../validation/payment.validation';

const router = Router();
const paymentController = new PaymentController();





router.post('/createLink', 
    valid(cokkiesSchema) as RequestHandler,
    isAuth([Roles.User]),
    asyncHandler(paymentController.createPaymentLink.bind(paymentController)));


router.post('/stripe', 
    valid(cokkiesSchema) as RequestHandler,
    valid(paymentRequestSchema) as RequestHandler,
    isAuth([Roles.User]), 
    asyncHandler(paymentController.processStripePayment.bind(paymentController)));


router.post('/paypal', 
    valid(cokkiesSchema) as RequestHandler,
    valid(paymentRequestSchema) as RequestHandler,
    isAuth([Roles.User]), 
    asyncHandler(paymentController.processPayPalPayment.bind(paymentController)));


router.post('/googlepay',  
    valid(cokkiesSchema) as RequestHandler,
    valid(paymentRequestSchema) as RequestHandler,
    isAuth([Roles.User]),
    asyncHandler(paymentController.processGooglePayPayment.bind(paymentController)));


router.post('/webhook', 
    asyncHandler(paymentController.handleStripeWebhook.bind(paymentController)));     



export default router; 