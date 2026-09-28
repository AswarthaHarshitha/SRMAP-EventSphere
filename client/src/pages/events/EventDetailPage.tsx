import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock, IndianRupee, Loader2, MapPin, Settings, Ticket, UserRound, Users } from "lucide-react";
import type { EventDetail, PublicConfig, RegisterResult, RegistrationSummary } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EventImage } from "@/components/EventCard";
import { AvailabilityBadge, EventStatusBadge, Pill } from "@/components/StatusBadge";
import { ErrorState, Spinner } from "@/components/states";
import { toast } from "@/hooks/use-toast";
import { api, ApiError, errorMessage, queryClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatPrice, formatRange, relativeDays } from "@/lib/format";
import { openCheckout } from "@/lib/razorpay";
import NotFoundPage from "../NotFoundPage";

function refreshAfterRegistration(eventId: number) {
  queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
  queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/events?") });
  queryClient.invalidateQueries({ queryKey: ["/api/me/registrations"] });
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [busy, setBusy] = useState<null | "register" | "payment">(null);

  const query = useQuery<{ data: EventDetail }>({ queryKey: [`/api/events/${params.id}`] });
  const config = useQuery<{ data: PublicConfig }>({ queryKey: ["/api/config"], staleTime: 5 * 60_000 });

  if (query.isLoading) return <Spinner label="Loading event" />;
  if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)) return <NotFoundPage />;
  if (query.error || !query.data) {
    return <div className="container-page py-12"><ErrorState error={query.error} onRetry={() => query.refetch()} /></div>;
  }

  const event = query.data.data;
  const mine = event.myRegistration;
  const isPaid = event.priceInPaise > 0;
  const fillPercent = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  const soon = relativeDays(event.startAt);

  async function completePayment(result: RegisterResult) {
    if (!result.payment || !user) return;
    setBusy("payment");
    try {
      const outcome = await openCheckout({
        order: result.payment,
        eventTitle: event.title,
        prefill: { name: user.name, email: user.email, contact: user.phone },
      });
      if (outcome.status === "paid") {
        const registration = await api<RegistrationSummary>("POST", "/api/payments/verify", {
          registrationId: result.registration.id,
          razorpayOrderId: outcome.response.razorpay_order_id,
          razorpayPaymentId: outcome.response.razorpay_payment_id,
          razorpaySignature: outcome.response.razorpay_signature,
        });
        toast({ title: "Payment received", description: "You're registered. Your ticket is ready." });
        refreshAfterRegistration(event.id);
        navigate(`/tickets/${registration.id}`);
      } else {
        await api("POST", "/api/payments/abandon", {
          registrationId: result.registration.id,
          reason: outcome.status === "failed" ? outcome.reason : "Checkout closed",
        });
        refreshAfterRegistration(event.id);
        toast({
          variant: outcome.status === "failed" ? "destructive" : undefined,
          title: outcome.status === "failed" ? "Payment failed" : "Payment cancelled",
          description:
            outcome.status === "failed"
              ? `${outcome.reason} Your seat has been released; you can try again.`
              : "Your seat hold was released. You can register again any time before the deadline.",
        });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Payment problem", description: errorMessage(err) });
      refreshAfterRegistration(event.id);
    } finally {
      setBusy(null);
    }
  }

  async function register() {
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/events/${event.id}`)}`);
    setBusy("register");
    try {
      const result = await api<RegisterResult>("POST", `/api/events/${event.id}/register`);
      if (result.payment) {
        setBusy(null);
        await completePayment(result);
        return;
      }
      toast({ title: "You're registered", description: "Your QR ticket is ready." });
      refreshAfterRegistration(event.id);
      navigate(`/tickets/${result.registration.id}`);
    } catch (err) {
      toast({ variant: "destructive", title: "Registration failed", description: errorMessage(err) });
      refreshAfterRegistration(event.id);
    } finally {
      setBusy((b) => (b === "register" ? null : b));
    }
  }

  function action() {
    if (mine?.status === "confirmed") {
      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-success/10 p-3 text-sm text-success">You're registered for this event.</div>
          <Button asChild className="w-full" size="lg">
            <Link href={`/tickets/${mine.id}`}><Ticket /> View your ticket</Link>
          </Button>
        </div>
      );
    }
    if (mine?.status === "pending_payment") {
      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
            Your seat is held until {mine.expiresAt ? formatDateTime(mine.expiresAt) : "shortly"}. Complete payment to confirm it.
          </div>
          <Button className="w-full" size="lg" onClick={register} disabled={!!busy}>
            {busy ? <Loader2 className="animate-spin" /> : <IndianRupee />} Complete payment
          </Button>
        </div>
      );
    }
    if (event.canManage) {
      return (
        <Button asChild className="w-full" size="lg" variant="outline">
          <Link href={`/organizer/events/${event.id}`}><Settings /> Manage this event</Link>
        </Button>
      );
    }
    if (!event.registrationOpen) {
      const reasons: Record<string, string> = {
        full: "This event is full.",
        closed: "Registration has closed.",
        started: "This event has already started.",
        cancelled: "This event has been cancelled.",
        not_published: "Registration isn't open yet.",
      };
      return <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{reasons[event.registrationState]}</div>;
    }
    if (user && user.role !== "student") {
      return (
        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Registration is for student accounts. You're signed in as an {user.role}.
        </div>
      );
    }
    const paymentsOff = isPaid && config.data && !config.data.data.paymentsEnabled;
    if (paymentsOff) {
      return (
        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Online payment isn't available right now. Please contact the organizer to register.
        </div>
      );
    }
    return (
      <Button className="w-full" size="lg" onClick={register} disabled={!!busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Ticket />}
        {user ? (isPaid ? `Register · ${formatPrice(event.priceInPaise)}` : "Register for free") : "Sign in to register"}
      </Button>
    );
  }

  return (
    <article className="pb-10">
      <div className="container-page pt-6">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/events"><ArrowLeft /> All events</Link>
        </Button>
      </div>

      <div className="container-page mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="aspect-[16/9] overflow-hidden rounded-2xl border bg-muted">
            <EventImage event={event} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Pill variant="info">{event.category}</Pill>
            {event.status !== "published" && <EventStatusBadge status={event.status} />}
            {soon && event.registrationState !== "started" && <Pill variant="warning">{soon}</Pill>}
          </div>
          <h1 className="mt-3 break-words text-3xl font-semibold leading-tight sm:text-4xl">{event.title}</h1>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { icon: CalendarDays, label: "When", value: formatRange(event.startAt, event.endAt) },
              { icon: MapPin, label: "Where", value: event.venue },
              { icon: UserRound, label: "Organized by", value: event.organizer.department ? `${event.organizer.name}, ${event.organizer.department}` : event.organizer.name },
              { icon: Clock, label: "Registration closes", value: formatDateTime(event.registrationDeadline) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3 rounded-xl border bg-card p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">About this event</h2>
            <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-foreground/90">{event.description}</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="font-serif text-3xl font-semibold">{formatPrice(event.priceInPaise)}</p>
              <AvailabilityBadge event={event} />
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> Seats taken</span>
                <span className="font-medium tabular-nums">{event.registeredCount} / {event.capacity}</span>
              </div>
              <Progress value={fillPercent} className="mt-2 h-2" aria-label={`${fillPercent}% full`} />
            </div>
            <div className="mt-5">{action()}</div>
            {isPaid && event.registrationOpen && !mine && (
              <p className="mt-3 text-xs text-muted-foreground">
                Payments are processed securely by Razorpay. Your seat is held for 15 minutes while you pay.
              </p>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
