import { Link } from "wouter";
import { CalendarDays, MapPin } from "lucide-react";
import type { EventSummary } from "@shared/api";
import { dayOfMonth, formatDate, formatPrice, formatTime, monthShort } from "@/lib/format";
import { AvailabilityBadge } from "./StatusBadge";

export function EventImage({ event, className = "" }: { event: Pick<EventSummary, "imageUrl" | "title" | "category" | "startAt">; className?: string }) {
  if (event.imageUrl) {
    return <img src={event.imageUrl} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  // Typographic placeholder when the organizer hasn't uploaded a cover image.
  return (
    <div className={`flex h-full w-full items-end justify-between bg-[hsl(208_40%_92%)] p-4 ${className}`}>
      <span className="font-serif text-4xl font-semibold leading-none text-primary/80">{dayOfMonth(event.startAt)}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">{event.category}</span>
    </div>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <EventImage event={event} className="transition-transform duration-300 group-hover:scale-[1.02]" />
        <div className="absolute left-3 top-3 rounded-md bg-card/95 px-2.5 py-1.5 text-center shadow-sm">
          <p className="text-[0.65rem] font-semibold uppercase leading-none tracking-wider text-highlight">{monthShort(event.startAt)}</p>
          <p className="mt-0.5 font-serif text-lg font-semibold leading-none">{dayOfMonth(event.startAt)}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow truncate">{event.category}</p>
          <p className="shrink-0 text-sm font-semibold">{formatPrice(event.priceInPaise)}</p>
        </div>
        <h3 className="mt-2 line-clamp-2 font-sans text-lg font-semibold leading-snug group-hover:text-primary">{event.title}</h3>
        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{formatDate(event.startAt)} · {formatTime(event.startAt)}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{event.venue}</span>
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <AvailabilityBadge event={event} />
          <span className="truncate text-xs text-muted-foreground">by {event.organizer.name}</span>
        </div>
      </div>
    </Link>
  );
}
