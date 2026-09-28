import type { RazorpayOrder } from "@shared/api";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (resp: { error: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loader: Promise<void> | null = null;

function loadCheckout() {
  loader ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return loader;
}

export type CheckoutOutcome =
  | { status: "paid"; response: RazorpayResponse }
  | { status: "dismissed" }
  | { status: "failed"; reason: string };

/** Opens Razorpay Checkout for a server-created order and resolves with what the student did. */
export async function openCheckout(input: {
  order: RazorpayOrder;
  eventTitle: string;
  prefill: { name: string; email: string; contact?: string | null };
}): Promise<CheckoutOutcome> {
  await loadCheckout();
  if (!window.Razorpay) throw new Error("The payment window is unavailable. Please try again.");

  return new Promise((resolve) => {
    let failure: string | null = null;
    const rzp = new window.Razorpay!({
      key: input.order.keyId,
      order_id: input.order.orderId,
      amount: input.order.amount,
      currency: input.order.currency,
      name: "SRMAP EventSphere",
      description: input.eventTitle,
      prefill: { name: input.prefill.name, email: input.prefill.email, contact: input.prefill.contact ?? undefined },
      theme: { color: "#1c3d5a" },
      handler: (response: RazorpayResponse) => resolve({ status: "paid", response }),
      modal: {
        ondismiss: () => resolve(failure ? { status: "failed", reason: failure } : { status: "dismissed" }),
      },
    });
    rzp.on("payment.failed", (resp) => {
      failure = resp.error?.description ?? "The payment failed.";
    });
    rzp.open();
  });
}
