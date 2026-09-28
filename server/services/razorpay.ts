import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { config, paymentsEnabled } from "../config";
import { HttpError } from "../errors";

export interface OrderClient {
  createOrder(input: { amount: number; currency: string; receipt: string; notes: Record<string, string> }): Promise<{
    id: string;
    amount: number;
    currency: string;
  }>;
}

let client: OrderClient | null = null;

function defaultClient(): OrderClient {
  const { keyId, keySecret } = config().razorpay;
  const razorpay = new Razorpay({ key_id: keyId!, key_secret: keySecret! });
  return {
    async createOrder(input) {
      const order = await razorpay.orders.create(input);
      return { id: order.id, amount: Number(order.amount), currency: order.currency };
    },
  };
}

export function orderClient(): OrderClient {
  if (!paymentsEnabled()) {
    throw new HttpError(
      503,
      "PAYMENTS_UNAVAILABLE",
      "Online payments are not available right now. Please contact the event organizer.",
    );
  }
  client ??= defaultClient();
  return client;
}

/** Replace the Razorpay API client (tests only). */
export function setOrderClient(next: OrderClient | null) {
  client = next;
}

function safeEqualHex(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Verifies the signature Razorpay Checkout returns after a successful payment. */
export function isValidPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = config().razorpay.keySecret;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verifies the X-Razorpay-Signature header of a webhook delivery against the raw body. */
export function isValidWebhookSignature(rawBody: Buffer, signature: string) {
  const secret = config().razorpay.webhookSecret;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
