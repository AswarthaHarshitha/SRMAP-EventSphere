import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, IndianRupee, Ticket, Users } from "lucide-react";
import type { AdminStats } from "@shared/api";
import { StatCard } from "@/components/StatCard";
import { RegistrationStatusBadge } from "@/components/StatusBadge";
import { ErrorState, Spinner } from "@/components/states";
import { formatDateTime, formatMoney } from "@/lib/format";
import { AdminHeader } from "./AdminNav";

const shortDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const longDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const parseDay = (d: string) => new Date(`${d}T00:00:00`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function DayTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">{longDay.format(parseDay(date))}</p>
      <p className="font-semibold tabular-nums">{count} {count === 1 ? "registration" : "registrations"}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const query = useQuery<{ data: AdminStats }>({ queryKey: ["/api/admin/stats"] });
  const s = query.data?.data;
  const last30 = s?.registrationsByDay.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const maxCategory = Math.max(1, ...(s?.eventsByCategory.map((c) => c.count) ?? [1]));

  return (
    <div className="container-page py-10">
      <AdminHeader title="Platform overview" description="Live figures from the EventSphere database." />
      {query.isLoading ? (
        <Spinner />
      ) : query.error || !s ? (
        <ErrorState className="mt-8" error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Users" value={s.users.total} hint={`${plural(s.users.students, "student")} · ${plural(s.users.organizers, "organizer")} · ${plural(s.users.admins, "admin")}`} />
            <StatCard icon={CalendarRange} label="Events" value={s.events.total} hint={`${s.events.published} published · ${s.events.upcoming} upcoming · ${s.events.drafts} drafts`} />
            <StatCard icon={Ticket} label="Confirmed registrations" value={s.registrations.confirmed} hint={`${s.registrations.checkedIn} checked in · ${s.registrations.cancelled} cancelled`} />
            <StatCard icon={IndianRupee} label="Revenue" value={formatMoney(s.revenueInPaise)} hint="Verified Razorpay payments" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-sans text-base font-semibold">Registrations per day</h2>
                <p className="text-sm text-muted-foreground">Last 30 days · {last30} total</p>
              </div>
              <div className="mt-4 h-64" role="img" aria-label={`Bar chart of daily registrations over the last 30 days, ${last30} in total`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.registrationsByDay} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => shortDay.format(parseDay(d))}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<DayTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-5">
              <h2 className="font-sans text-base font-semibold">Events by category</h2>
              {s.eventsByCategory.length ? (
                <ul className="mt-4 space-y-3">
                  {s.eventsByCategory.map((c) => (
                    <li key={c.category}>
                      <div className="flex justify-between text-sm">
                        <span>{c.category}</span>
                        <span className="font-medium tabular-nums">{c.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-1" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No events yet.</p>
              )}
            </section>
          </div>

          <section className="mt-8 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-base font-semibold">Recent registrations</h2>
              <Link href="/admin/registrations" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </div>
            {s.recentRegistrations.length ? (
              <ul className="mt-3 divide-y">
                {s.recentRegistrations.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm"><span className="font-medium">{r.user.name}</span> registered for <Link href={`/events/${r.event.id}`} className="text-primary hover:underline">{r.event.title}</Link></p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                    </div>
                    <RegistrationStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No registrations yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
