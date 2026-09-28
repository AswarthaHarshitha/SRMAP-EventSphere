import { Link } from "wouter";
import { Receipt, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketRow } from "@/components/TicketRow";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/components/states";
import { useMyTickets } from "./useMyTickets";
import type { TicketView } from "@shared/api";

function List({ items, empty }: { items: TicketView[]; empty: string }) {
  if (!items.length) return <EmptyState icon={Ticket} title={empty} action={<Button asChild variant="outline"><Link href="/events">Browse events</Link></Button>} />;
  return <div className="grid gap-3">{items.map((t) => <TicketRow key={t.id} ticket={t} />)}</div>;
}

export default function TicketsPage() {
  const tickets = useMyTickets();
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Passes"
        title="My tickets"
        description="Open a ticket to show its QR code at the entrance."
        actions={<Button asChild variant="outline"><Link href="/payments"><Receipt /> Payment history</Link></Button>}
      />
      <div className="mt-6">
        {tickets.isLoading ? (
          <Spinner />
        ) : tickets.error ? (
          <ErrorState error={tickets.error} onRetry={() => tickets.refetch()} />
        ) : (
          <Tabs defaultValue="upcoming">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="upcoming">Upcoming ({tickets.upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({tickets.past.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({tickets.cancelled.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-5"><List items={tickets.upcoming} empty="No upcoming tickets" /></TabsContent>
            <TabsContent value="past" className="mt-5"><List items={tickets.past} empty="No past events yet" /></TabsContent>
            <TabsContent value="cancelled" className="mt-5"><List items={tickets.cancelled} empty="No cancelled registrations" /></TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
