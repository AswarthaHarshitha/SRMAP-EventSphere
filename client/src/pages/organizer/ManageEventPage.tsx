import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Eye, Loader2, Pencil, ScanLine, Search, Trash2, UserCheck, Users } from "lucide-react";
import type { Attendee, CheckInResult, EventDetail, EventSummary, Paginated } from "@shared/api";
import type { EventStatus } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pager } from "@/components/Pager";
import { StatCard } from "@/components/StatCard";
import { EventStatusBadge, RegistrationStatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/states";
import { toast } from "@/hooks/use-toast";
import { api, ApiError, errorMessage, queryClient } from "@/lib/api";
import { formatDateTime, formatPrice, formatRange, groupCode } from "@/lib/format";
import NotFoundPage from "../NotFoundPage";

type AttendeePage = Paginated<Attendee> & { summary: { registered: number; capacity: number; checkedIn: number } };

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function invalidateEvent(id: number) {
  queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
  queryClient.invalidateQueries({ queryKey: ["/api/organizer/events"] });
  queryClient.invalidateQueries({ queryKey: ["/api/organizer/stats"] });
  queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith(`/api/events/${id}/attendees`) });
}

function StatusActions({ event }: { event: EventDetail }) {
  const [, navigate] = useLocation();
  const setStatus = useMutation({
    mutationFn: (status: EventStatus) => api<EventSummary>("POST", `/api/events/${event.id}/status`, { status }),
    onSuccess: (updated) => {
      invalidateEvent(event.id);
      toast({ title: updated.status === "published" ? "Event published" : updated.status === "cancelled" ? "Event cancelled" : "Event moved to drafts" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't update status", description: errorMessage(err) }),
  });
  const remove = useMutation({
    mutationFn: () => api("DELETE", `/api/events/${event.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/stats"] });
      toast({ title: "Event deleted" });
      navigate("/organizer");
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't delete", description: errorMessage(err) }),
  });

  if (event.status === "cancelled") return null;
  const busy = setStatus.isPending || remove.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {event.status === "draft" && (
        <ConfirmDialog
          trigger={<Button disabled={busy}>{setStatus.isPending && <Loader2 className="animate-spin" />} Publish</Button>}
          title="Publish this event?"
          description="It becomes visible to everyone and students can start registering straight away."
          confirmLabel="Publish"
          onConfirm={() => setStatus.mutate("published")}
        />
      )}
      {event.status === "published" && event.registeredCount === 0 && (
        <Button variant="outline" disabled={busy} onClick={() => setStatus.mutate("draft")}>Unpublish</Button>
      )}
      <Button asChild variant="outline"><Link href={`/organizer/events/${event.id}/edit`}><Pencil /> Edit</Link></Button>
      {event.registeredCount === 0 ? (
        <ConfirmDialog
          trigger={<Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}><Trash2 /> Delete</Button>}
          title="Delete this event?"
          description="This permanently removes the event. This can't be undone."
          confirmLabel="Delete event"
          destructive
          onConfirm={() => remove.mutate()}
        />
      ) : (
        <ConfirmDialog
          trigger={<Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}>Cancel event</Button>}
          title="Cancel this event?"
          description={`${event.registeredCount} registered students will see it as cancelled and tickets stop working at check-in. Refunds for paid tickets must be handled separately. This can't be undone.`}
          confirmLabel="Cancel event"
          destructive
          onConfirm={() => setStatus.mutate("cancelled")}
        />
      )}
    </div>
  );
}

function Attendees({ event }: { event: EventDetail }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  useEffect(() => {
    setPage(1);
  }, [q]);
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (q) params.set("search", q);
  const key = `/api/events/${event.id}/attendees?${params}`;
  const query = useQuery<AttendeePage>({ queryKey: [key], placeholderData: keepPreviousData });

  const checkIn = useMutation({
    mutationFn: (registrationId: number) => api<CheckInResult>("POST", `/api/events/${event.id}/attendees/${registrationId}/check-in`),
    onSuccess: (result) => {
      invalidateEvent(event.id);
      toast({
        title: result.outcome === "checked_in" ? "Checked in" : "Already checked in",
        description: result.attendee.user.name,
      });
    },
    onError: (err) => toast({ variant: "destructive", title: "Check-in failed", description: errorMessage(err) }),
  });

  const rows = query.data?.data ?? [];
  const canCheckIn = event.status === "published";

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Attendees</h2>
          <p className="text-sm text-muted-foreground">Everyone who registered, including cancellations.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-72">
            <label htmlFor="attendee-search" className="sr-only">Search attendees</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="attendee-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or ticket code" className="pl-9" />
          </div>
          <Button asChild variant="outline" title="Download CSV">
            <a href={`/api/events/${event.id}/attendees.csv`} download><Download /><span className="hidden sm:inline">CSV</span></a>
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {query.isLoading ? (
          <Spinner />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : !rows.length ? (
          <EmptyState icon={Users} title={q ? "No attendees match your search" : "No registrations yet"} description={q ? undefined : "Registrations appear here as students sign up."} />
        ) : (
          <>
            {/* Cards on small screens, table from md up */}
            <ul className="grid gap-3 md:hidden">
              {rows.map((a) => (
                <li key={a.registrationId} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.user.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.user.email}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{groupCode(a.ticketCode)}</p>
                    </div>
                    <RegistrationStatusBadge status={a.status} checkedInAt={a.checkedInAt} />
                  </div>
                  {canCheckIn && a.status === "confirmed" && !a.checkedInAt && (
                    <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => checkIn.mutate(a.registrationId)} disabled={checkIn.isPending}>
                      <UserCheck /> Check in
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.registrationId}>
                      <TableCell>
                        <p className="font-medium">{a.user.name}</p>
                        <p className="text-sm text-muted-foreground">{a.user.email}{a.user.department ? ` · ${a.user.department}` : ""}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{groupCode(a.ticketCode)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(a.registeredAt)}</TableCell>
                      <TableCell>
                        <RegistrationStatusBadge status={a.status} checkedInAt={a.checkedInAt} />
                        {a.checkedInAt && <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(a.checkedInAt)}</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        {canCheckIn && a.status === "confirmed" && !a.checkedInAt ? (
                          <Button size="sm" variant="outline" onClick={() => checkIn.mutate(a.registrationId)} disabled={checkIn.isPending}>
                            <UserCheck /> Check in
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost"><Link href={`/tickets/${a.registrationId}`}><Eye /> View</Link></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {query.data && <Pager meta={query.data.meta} onPage={setPage} />}
          </>
        )}
      </div>
    </section>
  );
}

export default function ManageEventPage({ id }: { id: string }) {
  const query = useQuery<{ data: EventDetail }>({ queryKey: [`/api/events/${id}`] });
  const summary = useQuery<AttendeePage>({ queryKey: [`/api/events/${id}/attendees?page=1&pageSize=1`], enabled: !!query.data?.data.canManage });

  if (query.isLoading) return <Spinner />;
  if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)) return <NotFoundPage />;
  if (query.error || !query.data) return <div className="container-page py-12"><ErrorState error={query.error} onRetry={() => query.refetch()} /></div>;

  const event = query.data.data;
  if (!event.canManage) return <div className="container-page py-12"><ErrorState error={new Error("You can only manage events you organize.")} /></div>;
  const checkedIn = summary.data?.summary.checkedIn ?? 0;
  const fill = Math.round((event.registeredCount / event.capacity) * 100);
  const canScan = event.status === "published";

  return (
    <div className="container-page py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href="/organizer"><ArrowLeft /> Your events</Link></Button>

      <div className="mt-4 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <span className="text-sm text-muted-foreground">{event.category} · {formatPrice(event.priceInPaise)}</span>
          </div>
          <h1 className="mt-2 break-words text-3xl font-semibold">{event.title}</h1>
          <p className="mt-1 text-muted-foreground">{formatRange(event.startAt, event.endAt)} · {event.venue}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canScan && <Button asChild><Link href={`/organizer/events/${event.id}/check-in`}><ScanLine /> Scan tickets</Link></Button>}
          {event.status !== "draft" && <Button asChild variant="outline"><Link href={`/events/${event.id}`}><Eye /> Public page</Link></Button>}
        </div>
      </div>

      <div className="mt-6"><StatusActions event={event} /></div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Registered" value={event.registeredCount} hint={`of ${event.capacity} seats`} />
        <StatCard label="Seats left" value={event.seatsLeft} />
        <StatCard label="Checked in" value={checkedIn} hint={event.registeredCount ? `${Math.round((checkedIn / event.registeredCount) * 100)}% of registered` : undefined} />
        <StatCard label="Registration" value={new Date(event.registrationDeadline) > new Date() ? "Open" : "Closed"} hint={`Closes ${formatDateTime(event.registrationDeadline)}`} />
      </div>
      <div className="mt-4 rounded-xl border bg-card p-4">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Capacity used</span><span className="font-medium tabular-nums">{fill}%</span></div>
        <Progress value={fill} className="mt-2 h-2" aria-label={`${fill}% of capacity used`} />
      </div>

      <Attendees event={event} />
    </div>
  );
}
