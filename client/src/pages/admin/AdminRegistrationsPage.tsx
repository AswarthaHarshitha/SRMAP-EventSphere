import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import type { AdminRegistrationRow } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pager } from "@/components/Pager";
import { RegistrationStatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, Spinner } from "@/components/states";
import { toast } from "@/hooks/use-toast";
import { api, errorMessage, queryClient } from "@/lib/api";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { AdminHeader } from "./AdminNav";
import { ListToolbar } from "./ListToolbar";
import { useAdminList } from "./useAdminList";

const statuses = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending_payment", label: "Payment pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

export default function AdminRegistrationsPage() {
  const list = useAdminList<AdminRegistrationRow>("/api/admin/registrations", "status");
  const cancel = useMutation({
    mutationFn: (id: number) => api("POST", `/api/admin/registrations/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/") });
      toast({ title: "Registration cancelled", description: "The seat has been released." });
    },
    onError: (err) => toast({ variant: "destructive", title: "Couldn't cancel", description: errorMessage(err) }),
  });
  const rows = list.query.data?.data ?? [];

  return (
    <div className="container-page py-10">
      <AdminHeader title="Registrations" description="All registrations across events. Cancelling releases the seat; refunds for paid tickets are handled in Razorpay." />
      <ListToolbar
        search={list.search}
        onSearch={list.setSearch}
        placeholder="Search by student or event"
        filter={list.filter}
        onFilter={list.setFilter}
        filterLabel="Filter by status"
        options={statuses}
      />
      <div className="mt-4">
        {list.query.isLoading ? (
          <Spinner />
        ) : list.query.error ? (
          <ErrorState error={list.query.error} onRetry={() => list.query.refetch()} />
        ) : !rows.length ? (
          <EmptyState icon={Ticket} title="No registrations found" />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><p className="font-medium">{r.user.name}</p><p className="text-sm text-muted-foreground">{r.user.email}</p></TableCell>
                      <TableCell className="max-w-xs"><Link href={`/organizer/events/${r.event.id}`} className="block truncate hover:text-primary">{r.event.title}</Link><p className="text-sm text-muted-foreground">{formatDate(r.event.startAt)}</p></TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(r.amountInPaise)}</TableCell>
                      <TableCell><RegistrationStatusBadge status={r.status} checkedInAt={r.checkedInAt} /></TableCell>
                      <TableCell className="text-right">
                        {(r.status === "confirmed" || r.status === "pending_payment") && !r.checkedInAt ? (
                          <ConfirmDialog
                            trigger={<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={cancel.isPending}>Cancel</Button>}
                            title="Cancel this registration?"
                            description={`${r.user.name}'s ticket for ${r.event.title} will stop working and the seat will be released.${r.amountInPaise ? " Issue any refund from the Razorpay dashboard." : ""}`}
                            confirmLabel="Cancel registration"
                            destructive
                            onConfirm={() => cancel.mutate(r.id)}
                          />
                        ) : (
                          <Button asChild size="sm" variant="ghost"><Link href={`/tickets/${r.id}`}>View</Link></Button>
                        )}
                      </TableCell>
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
