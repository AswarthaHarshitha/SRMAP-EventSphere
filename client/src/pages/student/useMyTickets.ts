import { useQuery } from "@tanstack/react-query";
import type { TicketView } from "@shared/api";

export function useMyTickets() {
  const query = useQuery<{ data: TicketView[] }>({ queryKey: ["/api/me/registrations"] });
  const all = query.data?.data ?? [];
  const now = Date.now();
  const active = all.filter((t) => t.status === "confirmed" || t.status === "pending_payment");
  return {
    ...query,
    all,
    upcoming: active.filter((t) => new Date(t.event.endAt).getTime() >= now).sort((a, b) => a.event.startAt.localeCompare(b.event.startAt)),
    past: active.filter((t) => new Date(t.event.endAt).getTime() < now),
    cancelled: all.filter((t) => t.status === "cancelled"),
  };
}
