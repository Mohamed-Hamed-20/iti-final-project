import { Types } from 'mongoose';

export interface PaymentMethod {
  type: 'card' | 'paypal' | 'googlepay';
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  courseId?: Types.ObjectId;
  userId?: Types.ObjectId;
}


export interface StripePaymentResponse {
  success: boolean;
  clientSecret?: string;
  message: string;
}

export interface PayPalPaymentResponse {
  success: boolean;
  orderId?: string;
  approvalUrl?: string;
  message: string;
}

export interface GooglePayPaymentResponse {
  success: boolean;
  paymentRequest?: any;
  message: string;
}

export interface PaymentError {
  success: false;
  message: string;
  error?: any;
} 