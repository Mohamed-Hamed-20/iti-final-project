import Joi from 'joi';

export const paymentRequestSchema = {
  body: Joi.object({
    amount: Joi.number().required().min(0),
    currency: Joi.string().required().valid('usd', 'eur', 'gbp'),
    paymentMethod: Joi.object({
      type: Joi.string().required().valid('card', 'paypal', 'googlepay'),
      cardNumber: Joi.string().when('type', {
        is: 'card',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      cardName: Joi.string().when('type', {
        is: 'card',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      expiryDate: Joi.string().when('type', {
        is: 'card',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
      cvv: Joi.string().when('type', {
        is: 'card',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      })
    }).required(),
    // Allow Stripe-specific fields
    __stripe_mid: Joi.string().optional(),
    __stripe_sid: Joi.string().optional()
  }).required()
}; 