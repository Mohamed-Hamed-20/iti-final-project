# Payment Gateway Integration Guide

This guide provides instructions on how to set up and integrate multiple payment gateways (Stripe, PayPal, and Google Pay) in your e-learning platform.

## Prerequisites

- Node.js and npm installed
- Backend server running
- Frontend application running
- Accounts with the payment providers (Stripe, PayPal, Google Pay)

## Backend Setup

### 1. Install Required Packages

```bash

npm install stripe @paypal/checkout-server-sdk google-pay-api

```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```
# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret

# Google Pay
GOOGLE_PAY_MERCHANT_ID=your_google_pay_merchant_id

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Create Payment Controller

Create a file named `paymentController.js` in your controllers directory with the following content:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const { GooglePay } = require('google-pay-api');

// Configure PayPal
let environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_SECRET
);
let paypalClient = new paypal.core.PayPalHttpClient(environment);

// Configure Google Pay
const googlePay = new GooglePay({
  merchantId: process.env.GOOGLE_PAY_MERCHANT_ID,
  merchantName: 'Your Course Platform',
  environment: 'TEST', // Change to 'PRODUCTION' for live
});

// Stripe payment
exports.stripePayment = async (req, res) => {
  try {
    const { amount, currency, cardNumber, cardName, expiryDate, cvv } = req.body;
    
    // Create a payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber,
        exp_month: expiryDate.split('/')[0],
        exp_year: expiryDate.split('/')[1],
        cvc: cvv,
      },
      billing_details: {
        name: cardName,
      },
    });
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe uses cents
      currency,
      payment_method: paymentMethod.id,
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
    });
    
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment failed',
    });
  }
};

// PayPal payment
exports.paypalPayment = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
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
    
    res.status(200).json({
      success: true,
      orderId: order.result.id,
      approvalUrl: order.result.links.find(link => link.rel === 'approve').href,
      message: 'PayPal order created successfully',
    });
  } catch (error) {
    console.error('PayPal payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment failed',
    });
  }
};

// Google Pay payment
exports.googlePayPayment = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
    const paymentData = {
      amount: amount,
      currency: currency,
      merchantId: process.env.GOOGLE_PAY_MERCHANT_ID,
      merchantName: 'Your Course Platform',
      environment: 'TEST', // Change to 'PRODUCTION' for live
    };
    
    const paymentRequest = googlePay.createPaymentRequest(paymentData);
    
    res.status(200).json({
      success: true,
      paymentRequest,
      message: 'Google Pay payment request created successfully',
    });
  } catch (error) {
    console.error('Google Pay payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment failed',
    });
  }
};
```

### 4. Create Payment Routes

Create a file named `paymentRoutes.js` in your routes directory with the following content:

```javascript
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/stripe', protect, paymentController.stripePayment);
router.post('/paypal', protect, paymentController.paypalPayment);
router.post('/googlepay', protect, paymentController.googlePayPayment);

module.exports = router;
```

### 5. Add Routes to App

Add the following code to your main app file (app.js or index.js):

```javascript
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/v1/payment', paymentRoutes);
```

## Frontend Setup

The frontend implementation is already included in the `src/pages/Checkout/index.jsx` file. This component handles:

1. Displaying the order summary
2. Selecting payment methods (Stripe, PayPal, Google Pay)
3. Collecting payment information
4. Processing payments through the backend API

## Testing

### Stripe Test Cards

- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Expiry: Any future date
- CVC: Any 3 digits

### PayPal Sandbox

Use the PayPal sandbox environment for testing. Create sandbox accounts in the PayPal Developer Dashboard.

### Google Pay Test

Use the Google Pay test environment for development. Switch to production when going live.

## Going Live

When moving to production:

1. Update environment variables with production credentials
2. Change PayPal environment from Sandbox to Live
3. Change Google Pay environment from TEST to PRODUCTION
4. Update the frontend to use production API endpoints

## Security Considerations

1. Never store raw credit card data in your database
2. Always use HTTPS for payment processing
3. Implement proper authentication and authorization
4. Follow PCI DSS compliance guidelines if handling card data directly
5. Use environment variables for sensitive information

## Troubleshooting

- **Stripe Errors**: Check the Stripe dashboard for detailed error logs
- **PayPal Errors**: Use the PayPal Developer Dashboard for debugging
- **Google Pay Errors**: Check the Google Pay API documentation for common issues

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Developer Documentation](https://developer.paypal.com/docs)
- [Google Pay API Documentation](https://developers.google.com/pay/api) 