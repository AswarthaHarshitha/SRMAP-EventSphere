import express, { Router } from "express";
import { eq } from "drizzle-orm";
import { payments } from "../../shared/schema";
import { abandonPaymentSchema, verifyPaymentSchema } from "../../shared/validation";
import { currentUser, requireAuth } from "../auth";
import { getDb } from "../db";
import { asyncHandler, badRequest, HttpError, notFound } from "../errors";
import { isValidPaymentSignature, isValidWebhookSignature } from "../services/razorpay";
import { toRegistrationSummary } from "../services/events";
import { abandonPayment, confirmPayment, markPaymentFailed } from "../services/registrations";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = verifyPaymentSchema.parse(req.body);
    const me = currentUser(req);
    const db = getDb();

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, input.razorpayOrderId))
      .limit(1);
    if (!payment || payment.userId !== me.id || payment.registrationId !== input.registrationId) {
      throw notFound("Payment not found.");
    }

    // The signature proves Razorpay issued this payment for our order; the client can't forge it.
    if (!isValidPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
      await markPaymentFailed(db, input.razorpayOrderId, "Signature verification failed");
      throw badRequest("We couldn't verify this payment. If money was deducted, contact the organizer.");
    }

    const registration = await confirmPayment(db, {
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
    });
    res.json({ data: toRegistrationSummary(registration) });
  }),
);

paymentsRouter.post(
  "/abandon",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = abandonPaymentSchema.parse(req.body);
    res.json({ data: await abandonPayment(getDb(), currentUser(req), input.registrationId, input.reason) });
  }),
);

/**
 * Razorpay webhook: confirms payments even if the student closed the browser before the
 * checkout callback ran. Configure it in the Razorpay dashboard for payment.captured,
 * order.paid and payment.failed.
 */
export const webhookHandler = [
  express.raw({ type: "application/json", limit: "1mb" }),
  asyncHandler(async (req, res) => {
    const signature = req.header("x-razorpay-signature");
    if (!signature || !Buffer.isBuffer(req.body) || !isValidWebhookSignature(req.body, signature)) {
      throw new HttpError(401, "INVALID_SIGNATURE", "Invalid webhook signature.");
    }

    const body = JSON.parse(req.body.toString("utf8")) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string; error_description?: string } } };
    };
    const entity = body.payload?.payment?.entity;
    if (!entity?.order_id) return res.json({ data: { ignored: true } });

    const db = getDb();
    if (body.event === "payment.captured" || body.event === "order.paid") {
      try {
        await confirmPayment(db, { orderId: entity.order_id, paymentId: entity.id });
      } catch (err) {
        // Unknown orders and already-settled conflicts are acknowledged so Razorpay stops retrying.
        if (!(err instanceof HttpError)) throw err;
      }
    } else if (body.event === "payment.failed") {
      await markPaymentFailed(db, entity.order_id, entity.error_description ?? "Payment failed");
    }
    res.json({ data: { received: true } });
  }),
];
