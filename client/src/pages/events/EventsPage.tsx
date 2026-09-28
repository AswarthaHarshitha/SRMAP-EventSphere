import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarSearch, Search, X } from "lucide-react";
import type { EventSummary, Paginated } from "@shared/api";
import { EVENT_CATEGORIES } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventCard } from "@/components/EventCard";
import { Pager } from "@/components/Pager";
import { CardGridSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/states";

const ALL = "all";

export default function EventsPage() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(searchString);
  const search = params.get("search") ?? "";
  const category = params.get("category") ?? ALL;
  const when = params.get("when") ?? "upcoming";
  const price = params.get("price") ?? ALL;
  const page = Number(params.get("page") ?? 1) || 1;

  const [draft, setDraft] = useState(search);
  useEffect(() => {
    setDraft(search);
  }, [search]);

  const update = (changes: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === ALL || (key === "when" && value === "upcoming") || (key === "page" && value === 1)) {
        next.delete(key);
      } else next.set(key, String(value));
    }
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    navigate(qs ? `/events?${qs}` : "/events", { replace: true });
  };

  const api = new URLSearchParams({ when, page: String(page), pageSize: "12" });
  if (search) api.set("search", search);
  if (category !== ALL) api.set("category", category);
  if (price !== ALL) api.set("price", price);

  const query = useQuery<Paginated<EventSummary>>({
    queryKey: [`/api/events?${api.toString()}`],
    placeholderData: keepPreviousData,
  });

  const hasFilters = search || category !== ALL || price !== ALL || when !== "upcoming";

  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Explore" title="Campus events" description="Workshops, lectures, fests and club activities across SRM University AP." />

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <form
          role="search"
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: draft.trim() });
          }}
        >
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="event-search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => draft.trim() !== search && update({ search: draft.trim() })}
            placeholder="Search title, venue or description"
            className="h-11 bg-card pl-9"
          />
        </form>
        <Select value={category} onValueChange={(v) => update({ category: v })}>
          <SelectTrigger className="h-11 bg-card md:w-44" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {EVENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={price} onValueChange={(v) => update({ price: v })}>
          <SelectTrigger className="h-11 bg-card md:w-32" aria-label="Price">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any price</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={when} onValueChange={(v) => update({ when: v })}>
          <SelectTrigger className="h-11 bg-card md:w-36" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past events</SelectItem>
            <SelectItem value="all">All dates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {query.data ? `${query.data.meta.total} ${query.data.meta.total === 1 ? "event" : "events"}` : " "}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => navigate("/events", { replace: true })}>
            <X /> Clear filters
          </Button>
        )}
      </div>

      <div className="mt-4">
        {query.isLoading ? (
          <CardGridSkeleton />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data?.data.length ? (
          <>
            <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${query.isPlaceholderData ? "opacity-60" : ""}`}>
              {query.data.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <Pager meta={query.data.meta} onPage={(p) => update({ page: p })} />
          </>
        ) : (
          <EmptyState
            icon={CalendarSearch}
            title={hasFilters ? "No events match your filters" : "No upcoming events yet"}
            description={hasFilters ? "Try a different search or clear the filters." : "New events appear here as soon as organizers publish them."}
            action={hasFilters ? <Button variant="outline" onClick={() => navigate("/events")}>Clear filters</Button> : undefined}
          />
        )}
      </div>
    </div>
  );
}
