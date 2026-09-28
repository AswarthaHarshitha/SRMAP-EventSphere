import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import type { PaymentRecord } from "@shared/api";
import { Pill } from "@/components/StatusBadge";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/components/states";
import { formatDateTime, formatMoney } from "@/lib/format";

const statusPill = (p: PaymentRecord) =>
  p.status === "paid" ? (
    <Pill variant={p.failureReason ? "warning" : "success"}>{p.failureReason ? "Refund due" : "Paid"}</Pill>
  ) : p.status === "failed" ? (
    <Pill variant="danger">Not completed</Pill>
  ) : (
    <Pill variant="warning">Awaiting payment</Pill>
  );

export default function PaymentsPage() {
  const query = useQuery<{ data: PaymentRecord[] }>({ queryKey: ["/api/me/payments"] });
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Billing" title="Payment history" description="Payments for paid events, processed by Razorpay." />
      <div className="mt-6">
        {query.isLoading ? (
          <Spinner />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : !query.data?.data.length ? (
          <EmptyState icon={Receipt} title="No payments yet" description="Payments for paid events will appear here." />
        ) : (
          <ul className="grid gap-3">
            {query.data.data.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {p.event ? (
                    <Link href={`/events/${p.event.id}`} className="font-semibold hover:text-primary">{p.event.title}</Link>
                  ) : (
                    <p className="font-semibold">Event</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{p.razorpayPaymentId ?? p.razorpayOrderId}</p>
                  {p.failureReason && <p className="mt-1 text-sm text-muted-foreground">{p.failureReason}</p>}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <p className="font-semibold tabular-nums">{formatMoney(p.amountInPaise)}</p>
                  {statusPill(p)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
