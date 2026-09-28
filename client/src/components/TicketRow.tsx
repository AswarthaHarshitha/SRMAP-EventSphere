import { Link } from "wouter";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import type { TicketView } from "@shared/api";
import { dayOfMonth, formatRange, monthShort } from "@/lib/format";
import { RegistrationStatusBadge } from "./StatusBadge";

export function TicketRow({ ticket }: { ticket: TicketView }) {
  return (
    <Link href={`/tickets/${ticket.id}`} className="group flex min-w-0 items-center gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md sm:gap-4">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider">{monthShort(ticket.event.startAt)}</span>
        <span className="font-serif text-xl font-semibold leading-none">{dayOfMonth(ticket.event.startAt)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold group-hover:text-primary">{ticket.event.title}</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{formatRange(ticket.event.startAt, ticket.event.endAt)}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{ticket.event.venue}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <RegistrationStatusBadge status={ticket.status} checkedInAt={ticket.checkedInAt} />
        {ticket.event.status === "cancelled" && <span className="text-xs text-destructive">Event cancelled</span>}
        <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </div>
    </Link>
  );
}
