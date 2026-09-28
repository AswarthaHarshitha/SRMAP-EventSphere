import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, CalendarSearch, History, Ticket } from "lucide-react";
import type { EventSummary, Paginated } from "@shared/api";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { StatCard } from "@/components/StatCard";
import { TicketRow } from "@/components/TicketRow";
import { CardGridSkeleton, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { useMyTickets } from "./useMyTickets";

export default function StudentDashboard() {
  const { user } = useAuth();
  const tickets = useMyTickets();
  const events = useQuery<Paginated<EventSummary>>({ queryKey: ["/api/events?when=upcoming&pageSize=6"] });
  const registeredIds = new Set(tickets.all.filter((t) => t.status !== "cancelled").map((t) => t.event.id));
  const suggestions = (events.data?.data ?? []).filter((e) => !registeredIds.has(e.id) && e.registrationOpen).slice(0, 3);

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Student dashboard"
        title={`Hello, ${user?.name.split(" ")[0] ?? "there"}`}
        description="Your upcoming events and passes at a glance."
        actions={<Button asChild><Link href="/events"><CalendarSearch /> Find events</Link></Button>}
      />

      {tickets.isLoading ? (
        <Spinner />
      ) : tickets.error ? (
        <ErrorState className="mt-8" error={tickets.error} onRetry={() => tickets.refetch()} />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard icon={CalendarCheck} label="Upcoming events" value={tickets.upcoming.length} />
            <StatCard icon={History} label="Events attended" value={tickets.past.filter((t) => t.checkedInAt).length} hint={`${tickets.past.length} past registrations`} />
            <StatCard icon={Ticket} label="All registrations" value={tickets.all.length} />
          </div>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Your upcoming events</h2>
              <Button asChild variant="ghost" size="sm"><Link href="/tickets">All tickets <ArrowRight /></Link></Button>
            </div>
            <div className="mt-4 grid gap-3">
              {tickets.upcoming.length ? (
                tickets.upcoming.slice(0, 5).map((t) => <TicketRow key={t.id} ticket={t} />)
              ) : (
                <EmptyState icon={Ticket} title="No upcoming registrations" description="When you register for an event, your pass shows up here." action={<Button asChild variant="outline"><Link href="/events">Browse events</Link></Button>} />
              )}
            </div>
          </section>

          {tickets.past.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold">Registration history</h2>
              <div className="mt-4 grid gap-3">
                {tickets.past.slice(0, 5).map((t) => <TicketRow key={t.id} ticket={t} />)}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Open for registration</h2>
        <div className="mt-4">
          {events.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : suggestions.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You're registered for everything that's currently open. Nice!</p>
          )}
        </div>
      </section>
    </div>
  );
}
