import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, CalendarRange, IndianRupee, ScanLine, Ticket, UserCheck } from "lucide-react";
import type { OrganizerEventRow, OrganizerStats } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/StatCard";
import { EventStatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/components/states";
import { formatDate, formatMoney, formatPrice, formatTime } from "@/lib/format";

function EventRow({ event }: { event: OrganizerEventRow }) {
  const fill = Math.round((event.registeredCount / event.capacity) * 100);
  const upcoming = new Date(event.endAt) > new Date();
  return (
    <li className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <span className="text-xs text-muted-foreground">{event.category}</span>
            {!upcoming && <span className="text-xs text-muted-foreground">· Ended</span>}
          </div>
          <Link href={`/organizer/events/${event.id}`} className="mt-1.5 block truncate text-lg font-semibold hover:text-primary">
            {event.title}
          </Link>
          <p className="truncate text-sm text-muted-foreground">
            {formatDate(event.startAt)} · {formatTime(event.startAt)} · {event.venue} · {formatPrice(event.priceInPaise)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:w-80">
          <div className="col-span-2 sm:col-span-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Registered</span>
              <span className="tabular-nums">{event.registeredCount}/{event.capacity}</span>
            </div>
            <Progress value={fill} className="mt-1.5 h-1.5" aria-label={`${fill}% of capacity`} />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Checked in</p>
            <p className="font-semibold tabular-nums">{event.checkedInCount}</p>
          </div>
        </div>
        <div className="flex gap-2 lg:justify-end">
          <Button asChild variant="outline" size="sm"><Link href={`/organizer/events/${event.id}`}>Manage</Link></Button>
          {event.status === "published" && upcoming && (
            <Button asChild size="sm"><Link href={`/organizer/events/${event.id}/check-in`}><ScanLine /> Check in</Link></Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function OrganizerDashboard() {
  const stats = useQuery<{ data: OrganizerStats }>({ queryKey: ["/api/organizer/stats"] });
  const events = useQuery<{ data: OrganizerEventRow[] }>({ queryKey: ["/api/organizer/events"] });
  const s = stats.data?.data;
  const rows = events.data?.data ?? [];
  const upcoming = rows.filter((e) => new Date(e.endAt) > new Date());
  const past = rows.filter((e) => new Date(e.endAt) <= new Date());

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Organizer"
        title="Your events"
        description="Create events, track registrations and check attendees in."
        actions={<Button asChild><Link href="/organizer/events/new"><CalendarPlus /> New event</Link></Button>}
      />

      {stats.error ? (
        <ErrorState className="mt-8" error={stats.error} onRetry={() => stats.refetch()} />
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={CalendarRange} label="Events" value={s?.totalEvents ?? "–"} hint={s ? `${s.publishedEvents} published · ${s.upcomingEvents} upcoming` : undefined} />
          <StatCard icon={Ticket} label="Registrations" value={s?.totalRegistrations ?? "–"} hint="Confirmed across all events" />
          <StatCard icon={UserCheck} label="Check-ins" value={s?.totalCheckIns ?? "–"} hint={s && s.totalRegistrations ? `${Math.round((s.totalCheckIns / s.totalRegistrations) * 100)}% attendance` : undefined} />
          <StatCard icon={IndianRupee} label="Revenue" value={s ? formatMoney(s.revenueInPaise) : "–"} hint="Verified payments" />
        </div>
      )}

      <section className="mt-10">
        {events.isLoading ? (
          <Spinner />
        ) : events.error ? (
          <ErrorState error={events.error} onRetry={() => events.refetch()} />
        ) : !rows.length ? (
          <EmptyState
            icon={CalendarPlus}
            title="You haven't created any events"
            description="Create your first event. It stays a draft until you publish it."
            action={<Button asChild><Link href="/organizer/events/new">Create an event</Link></Button>}
          />
        ) : (
          <div className="space-y-10">
            <div>
              <h2 className="text-xl font-semibold">Upcoming & drafts ({upcoming.length})</h2>
              {upcoming.length ? (
                <ul className="mt-4 grid gap-3">{upcoming.map((e) => <EventRow key={e.id} event={e} />)}</ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No upcoming events.</p>
              )}
            </div>
            {past.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold">Past events ({past.length})</h2>
                <ul className="mt-4 grid gap-3">{past.map((e) => <EventRow key={e.id} event={e} />)}</ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
