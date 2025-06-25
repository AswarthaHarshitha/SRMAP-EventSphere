import { randomBytes } from 'crypto';
import { createHmac } from 'crypto';
import { log } from './vite';

// Mock Razorpay if credentials are not available
export const isUsingMockRazorpay = !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

// Get keys from environment or use mock keys
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mockkeysecret123456789';

// Mock Razorpay class that simulates real Razorpay behavior without external API calls
class MockRazorpay {
  constructor() {
    log('Using Mock Razorpay for development', 'razorpay');
  }

  orders = {
    create: async (options: any) => {
      const orderId = `order_${randomBytes(8).toString('hex')}`;
      log(`Created mock order: ${orderId}`, 'razorpay');
      return {
        id: orderId,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency || 'INR',
        receipt: options.receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000)
      };
    }
  };

  payments = {
    fetch: async (paymentId: string) => {
      log(`Fetched mock payment: ${paymentId}`, 'razorpay');
      return {
        id: paymentId,
        entity: 'payment',
        amount: 50000, // Mock amount (INR 500)
        currency: 'INR',
        status: 'captured',
        order_id: `order_${randomBytes(8).toString('hex')}`,
        method: 'card',
        card_id: null,
        captured: true,
        description: 'Mock payment for development'
      };
    },
    capture: async (paymentId: string, amount: number) => {
      log(`Captured mock payment: ${paymentId} for amount: ${amount}`, 'razorpay');
      return {
        id: paymentId,
        entity: 'payment',
        amount: amount,
        currency: 'INR',
        status: 'captured',
        order_id: `order_${randomBytes(8).toString('hex')}`,
        method: 'card',
        captured: true,
        description: 'Mock payment capture for development'
      };
    }
  };
}

// Use actual Razorpay if credentials are available, otherwise use mock
let razorpay: any;

try {
  if (isUsingMockRazorpay) {
    razorpay = new MockRazorpay();
  } else {
    // Only import Razorpay if credentials are available
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    log('Using actual Razorpay API', 'razorpay');
  }
} catch (error) {
  log(`Error initializing Razorpay: ${(error as Error).message}`, 'razorpay');
  // Fallback to mock if there's an error
  razorpay = new MockRazorpay();
}

/**
 * Create a new Razorpay order
 */
export async function createOrder(options: {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  try {
    const orderOptions = {
      amount: options.amount * 100, // Convert to paise (Razorpay uses smallest currency unit)
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes || {}
    };
    
    const order = await razorpay.orders.create(orderOptions);
    log(`Order created: ${order.id}`, 'razorpay');
    return order;
  } catch (error) {
    log(`Error creating order: ${(error as Error).message}`, 'razorpay');
    throw error;
  }
}

/**
 * Verify payment signature for Razorpay
 */
export function verifyPaymentSignature(options: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  try {
    if (isUsingMockRazorpay) {
      // Always return true for mock environment
      log('Mock verified payment signature', 'razorpay');
      return true;
    }
    
    // For real Razorpay, verify the signature
    const payload = `${options.orderId}|${options.paymentId}`;
    const expectedSignature = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');
    
    const isValid = expectedSignature === options.signature;
    log(`Signature verification: ${isValid ? 'succeeded' : 'failed'}`, 'razorpay');
    return isValid;
  } catch (error) {
    log(`Error verifying signature: ${(error as Error).message}`, 'razorpay');
    return false;
  }
}

/**
 * Get payment details from Razorpay
 */
export async function getPaymentDetails(paymentId: string) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    log(`Fetched payment details for ID: ${paymentId}`, 'razorpay');
    return payment;
  } catch (error) {
    log(`Error fetching payment details: ${(error as Error).message}`, 'razorpay');
    throw error;
  }
}