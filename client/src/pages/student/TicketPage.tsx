import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, MapPin, Printer, XCircle } from "lucide-react";
import type { RegistrationSummary, TicketView } from "@shared/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RegistrationStatusBadge } from "@/components/StatusBadge";
import { TicketQr } from "@/components/TicketQr";
import { ErrorState, Spinner } from "@/components/states";
import { toast } from "@/hooks/use-toast";
import { api, ApiError, errorMessage, queryClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatPrice, formatRange, groupCode } from "@/lib/format";
import NotFoundPage from "../NotFoundPage";

export default function TicketPage({ id }: { id: string }) {
  const { user } = useAuth();
  const query = useQuery<{ data: TicketView }>({ queryKey: [`/api/registrations/${id}`] });

  const cancel = useMutation({
    mutationFn: () => api<RegistrationSummary>("POST", `/api/registrations/${id}/cancel`),
    onSuccess: () => {
      toast({ title: "Registration cancelled", description: "Your seat has been released." });
      queryClient.invalidateQueries({ queryKey: [`/api/registrations/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/registrations"] });
      if (query.data) queryClient.invalidateQueries({ queryKey: [`/api/events/${query.data.data.event.id}`] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't cancel", description: errorMessage(err) }),
  });

  if (query.isLoading) return <Spinner label="Loading ticket" />;
  if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)) return <NotFoundPage />;
  if (query.error || !query.data) return <div className="container-page py-12"><ErrorState error={query.error} onRetry={() => query.refetch()} /></div>;

  const ticket = query.data.data;
  const { event } = ticket;
  const isOwner = user?.id === ticket.attendee.id;
  const isValid = ticket.status === "confirmed" && event.status !== "cancelled";
  const canCancel =
    isOwner && ticket.status === "confirmed" && !ticket.checkedInAt && ticket.amountInPaise === 0 && new Date(event.startAt) > new Date();

  return (
    <div className="container-page max-w-3xl py-8">
      <Button asChild variant="ghost" size="sm" className="no-print -ml-3">
        <Link href={isOwner ? "/tickets" : `/organizer/events/${event.id}`}><ArrowLeft /> Back</Link>
      </Button>

      <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Entry pass · {event.category}</p>
          <h1 className="mt-1 break-words font-serif text-2xl font-semibold leading-tight sm:text-3xl">{event.title}</h1>
        </div>

        <div className="grid gap-8 p-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <div className="flex flex-col items-center">
            {ticket.status === "pending_payment" ? (
              <div className="flex h-[264px] w-[264px] max-w-full flex-col items-center justify-center rounded-xl bg-warning/10 p-6 text-center text-sm text-warning">
                Payment pending. Complete payment on the event page to activate this pass.
                <Button asChild size="sm" className="mt-4"><Link href={`/events/${event.id}`}>Go to event</Link></Button>
              </div>
            ) : (
              <div className={isValid ? "" : "opacity-30 grayscale"}>
                <TicketQr code={ticket.ticketCode} />
              </div>
            )}
            <p className="mt-3 font-mono text-sm tracking-wider text-muted-foreground" aria-label="Ticket code">{groupCode(ticket.ticketCode)}</p>
          </div>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <RegistrationStatusBadge status={ticket.status} checkedInAt={ticket.checkedInAt} />
              {event.status === "cancelled" && <span className="text-sm font-medium text-destructive">This event was cancelled</span>}
            </div>
            {ticket.checkedInAt && (
              <p className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Checked in {formatDateTime(ticket.checkedInAt)}</p>
            )}
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendee</dt>
                <dd className="mt-0.5 font-medium">{ticket.attendee.name}</dd>
                <dd className="text-muted-foreground">{ticket.attendee.email}</dd>
              </div>
              <div className="flex gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd>{formatRange(event.startAt, event.endAt)}</dd>
              </div>
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd className="break-words">{event.venue}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</dt>
                <dd className="mt-0.5">{formatPrice(ticket.amountInPaise)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registered</dt>
                <dd className="mt-0.5">{formatDateTime(ticket.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="no-print flex flex-wrap gap-2 border-t bg-muted/40 px-6 py-4">
          {isValid && <Button variant="outline" onClick={() => window.print()}><Printer /> Print pass</Button>}
          <Button asChild variant="ghost"><Link href={`/events/${event.id}`}>Event details</Link></Button>
          {canCancel && (
            <ConfirmDialog
              trigger={<Button variant="ghost" className="text-destructive hover:text-destructive sm:ml-auto" disabled={cancel.isPending}>{cancel.isPending ? <Loader2 className="animate-spin" /> : <XCircle />} Cancel registration</Button>}
              title="Cancel your registration?"
              description="Your seat will be released to other students. You can register again later if seats are still available."
              confirmLabel="Cancel registration"
              destructive
              onConfirm={() => cancel.mutate()}
            />
          )}
        </div>
      </div>
      {isOwner && ticket.status === "confirmed" && ticket.amountInPaise > 0 && !ticket.checkedInAt && (
        <p className="no-print mt-4 text-sm text-muted-foreground">Paid registrations can't be cancelled online. Contact the organizer, {event.organizer.name}, about refunds.</p>
      )}
    </div>
  );
}
