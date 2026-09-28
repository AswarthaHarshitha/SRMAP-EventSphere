import { Link } from "wouter";
import { CalendarRange } from "lucide-react";
import type { EventSummary } from "@shared/api";
import { EVENT_STATUSES } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pager } from "@/components/Pager";
import { EventStatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/states";
import { formatDate, formatPrice } from "@/lib/format";
import { AdminHeader } from "./AdminNav";
import { ListToolbar } from "./ListToolbar";
import { useAdminList } from "./useAdminList";

const statusLabel = { draft: "Draft", published: "Published", cancelled: "Cancelled" } as const;

export default function AdminEventsPage() {
  const list = useAdminList<EventSummary>("/api/admin/events", "status");
  const rows = list.query.data?.data ?? [];
  return (
    <div className="container-page py-10">
      <AdminHeader title="Events" description="Every event on the platform, including drafts. Open one to edit, publish, cancel or manage attendees." />
      <ListToolbar
        search={list.search}
        onSearch={list.setSearch}
        placeholder="Search by title or organizer"
        filter={list.filter}
        onFilter={list.setFilter}
        filterLabel="Filter by status"
        options={EVENT_STATUSES.map((s) => ({ value: s, label: statusLabel[s] }))}
      />
      <div className="mt-4">
        {list.query.isLoading ? (
          <Spinner />
        ) : list.query.error ? (
          <ErrorState error={list.query.error} onRetry={() => list.query.refetch()} />
        ) : !rows.length ? (
          <EmptyState icon={CalendarRange} title="No events found" />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="max-w-xs"><p className="truncate font-medium">{e.title}</p><p className="truncate text-sm text-muted-foreground">{e.organizer.name}</p></TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDate(e.startAt)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{e.registeredCount}/{e.capacity}</TableCell>
                      <TableCell className="text-sm">{formatPrice(e.priceInPaise)}</TableCell>
                      <TableCell><EventStatusBadge status={e.status} /></TableCell>
                      <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/organizer/events/${e.id}`}>Manage</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {list.query.data && <Pager meta={list.query.data.meta} onPage={list.setPage} />}
          </>
        )}
      </div>
    </div>
  );
}
