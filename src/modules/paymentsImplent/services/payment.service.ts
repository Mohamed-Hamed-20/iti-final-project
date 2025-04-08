import * as paypal from '@paypal/checkout-server-sdk';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { GooglePayPaymentResponse, PaymentRequest, PayPalPaymentResponse, StripePaymentResponse } from '../../../DB/interfaces/paymentImplemt.interface';
import EnrollmentModel from '../../../DB/models/enrollment.model';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',

});

// Configure PayPal
const paypalEnvironment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID!,
  process.env.PAYPAL_SECRET!
);
const paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);

export class PaymentService {
  async processStripePayment(paymentRequest: PaymentRequest): Promise<StripePaymentResponse> {
    try {
      const { amount, currency, paymentMethod, courseId, userId } = paymentRequest;

      // Check if paymentMethod exists and has the required properties
      if (!paymentMethod) {
        throw new Error('Payment method is required');
      }

      // If paymentMethod is a string (from frontend), convert it to the expected format
      if (typeof paymentMethod === 'string') {
        if (paymentMethod !== 'stripe') {
          throw new Error('Invalid payment method for Stripe');
        }
        
        // If we have card details directly in the request, use them
        const { cardNumber, cardName, expiryDate, cvv } = paymentRequest as any;
        
        if (!cardNumber || !expiryDate || !cvv) {
          throw new Error('Missing required card information');
        }
        
        // Parse expiry date (format: MM/YY)
        const [expMonth, expYear] = expiryDate.split('/');
        
        // Create payment method
        const paymentMethodResult = await stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: parseInt(expMonth),
            exp_year: parseInt(expYear),
            cvc: cvv,
          },
          billing_details: {
            name: cardName || 'Anonymous',
          },
        });
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents and ensure it's an integer
          currency,
          payment_method: paymentMethodResult.id,
          confirm: true,
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
        });
        

        // After successful payment, update enrollment status
        if (courseId && userId) {
          await EnrollmentModel.findOneAndUpdate(
            { courseId, userId },
            { 
              paymentStatus: 'completed',
              paymentDate: new Date(),
              paymentMethod: 'stripe',
              paymentIntentId: paymentIntent.id
            }
          );
        }

        return {
          success: true,
          clientSecret: paymentIntent.client_secret || undefined,
          message: 'Payment processed successfully',
        };
      }
      
    
      if (paymentMethod.type !== 'card') {
        throw new Error('Invalid payment method for Stripe');
      }

    
      
      // Validate card details
      if (!paymentMethod.cardNumber || !paymentMethod.expiryDate || !paymentMethod.cvv) {
        throw new Error('Missing required card information');
      }

      // Parse expiry date (format: MM/YY)
      const [expMonth, expYear] = paymentMethod.expiryDate.split('/');
      
      // Create payment method
      const paymentMethodResult = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: paymentMethod.cardNumber,
          exp_month: parseInt(expMonth),
          exp_year: parseInt(expYear),
          cvc: paymentMethod.cvv,
        },
        billing_details: {
          name: paymentMethod.cardName || 'Anonymous',
        },
      });

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents and ensure it's an integer
        currency,
        payment_method: paymentMethodResult.id,
        confirm: true,
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
      });

      // After successful payment, update enrollment status
      if (courseId && userId) {
        await EnrollmentModel.findOneAndUpdate(
          { courseId, userId },
          { 
            paymentStatus: 'completed',
            paymentDate: new Date(),
            paymentMethod: 'stripe',
            paymentIntentId: paymentIntent.id
          }
        );
      }

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        message: 'Payment processed successfully',
      };
    } catch (error) {
      console.error('Stripe payment error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Payment failed';
      
      if (error instanceof Stripe.errors.StripeError) {
        switch (error.type) {
          case 'StripeCardError':
            errorMessage = `Card error: ${error.message}`;
            break;
          case 'StripeInvalidRequestError':
            errorMessage = `Validation error: ${error.message}`;
            break;
          case 'StripeAPIError':
            errorMessage = `API error: ${error.message}`;
            break;
          default:
            errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  async processPayPalPayment(paymentRequest: PaymentRequest): Promise<PayPalPaymentResponse> {
    try {
      const { amount, currency, courseId, userId } = paymentRequest;

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString(),
          },
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/checkout`,
        },
      });

      const order = await paypalClient.execute(request);

      // After successful order creation, update enrollment status
      if (courseId && userId) {
        await EnrollmentModel.findOneAndUpdate(
          { courseId, userId },
          { 
            paymentStatus: 'completed',
            paymentDate: new Date(),
            paymentMethod: 'paypal',
            paypalOrderId: order.result.id
          }
        );
      }

      return {
        success: true,
        orderId: order.result.id,
        approvalUrl: order.result.links.find((link: any) => link.rel === 'approve').href,
        message: 'PayPal order created successfully',
      };
    } catch (error) {
      console.error('PayPal payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  async processGooglePayPayment(paymentRequest: PaymentRequest): Promise<GooglePayPaymentResponse> {
    try {
      const { amount, currency, courseId, userId } = paymentRequest;
      
      // Implement Google Pay payment logic here

      // After successful payment, update enrollment status
      if (courseId && userId) {
        await EnrollmentModel.findOneAndUpdate(
          { courseId, userId },
          { 
            paymentStatus: 'completed',
            paymentDate: new Date(),
            paymentMethod: 'googlepay'
          }
        );
      }

      return {
        success: true,
        message: 'Google Pay payment processed successfully',
      };
    } catch (error) {
      console.error('Google Pay payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  async handleStripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
      return res.status(400).send('Missing stripe signature or webhook secret');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (!session.metadata?.userId || !session.metadata?.courseId) {
        return res.status(400).send('Missing userId or courseId in session metadata');
      }

      // Update enrollment status
      await EnrollmentModel.findOneAndUpdate(
        { 
          userId: session.metadata.userId, 
          courseId: session.metadata.courseId,
          paymentStatus: 'pending'
        },
        { 
          paymentStatus: 'completed',
          paymentDate: new Date(),
          stripeSessionId: session.id
        }
      );

      // Here you might also:
      // - Send confirmation email
      // - Trigger any post-purchase actions
    }

    res.json({ received: true });
  }
} 


