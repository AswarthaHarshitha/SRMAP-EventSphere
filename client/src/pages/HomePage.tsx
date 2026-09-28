import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarSearch, QrCode, Search, Ticket, Users } from "lucide-react";
import type { EventSummary, Paginated } from "@shared/api";
import { EVENT_CATEGORIES } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/EventCard";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/states";
import { homeFor, useAuth } from "@/lib/auth";

export default function HomePage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const upcoming = useQuery<Paginated<EventSummary>>({ queryKey: ["/api/events?when=upcoming&pageSize=6"] });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(search.trim() ? `/events?search=${encodeURIComponent(search.trim())}` : "/events");
  };

  return (
    <>
      <section className="border-b bg-[hsl(40_35%_94%)]">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="animate-fade-up">
            <p className="eyebrow text-highlight">SRM University AP · Campus events</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Everything happening on campus, in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Find workshops, lectures, fests and club meet-ups. Register in a couple of taps and keep your QR entry pass on
              your phone.
            </p>
            <form onSubmit={submit} className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row" role="search">
              <label htmlFor="home-search" className="sr-only">Search events</label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="home-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by event, venue or topic"
                  className="h-12 bg-card pl-9 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12">
                Find events
              </Button>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: CalendarSearch, title: "Discover", text: "Browse upcoming events by category, date and price." },
              { icon: Ticket, title: "Register", text: "Seats are held the moment you register. No duplicate sign-ups." },
              { icon: QrCode, title: "Check in", text: "Show your QR pass at the door; organizers scan you in." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-xl border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Coming up</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Upcoming events</h2>
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link href="/events">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-6">
          {upcoming.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : upcoming.error ? (
            <ErrorState error={upcoming.error} onRetry={() => upcoming.refetch()} />
          ) : upcoming.data?.data.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.data.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarSearch}
              title="No upcoming events yet"
              description="Organizers haven't published anything for the coming days. Check back soon."
            />
          )}
        </div>
      </section>

      <section className="container-page pb-6">
        <h2 className="text-2xl font-semibold">Browse by category</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/events?category=${encodeURIComponent(category)}`}
              className="rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pt-10">
        <div className="flex flex-col gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <Users className="mt-1 h-6 w-6 shrink-0 opacity-80" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-semibold">Running a club or department event?</h2>
              <p className="mt-2 max-w-xl text-primary-foreground/80">
                Organizer accounts can publish events, manage attendee lists and scan tickets at the door. Ask a platform
                administrator to enable organizer access on your account.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" size="lg" className="shrink-0">
            <Link href={user ? homeFor(user) : "/register"}>{user ? "Open your dashboard" : "Create an account"}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
