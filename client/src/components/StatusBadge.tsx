import type { EventStatus, RegistrationStatus } from "@shared/constants";
import type { EventSummary } from "@shared/api";
import { cn } from "@/lib/utils";

const tone = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-primary/10 text-primary border-primary/15",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
} as const;

export function Pill({ children, variant = "neutral", className }: { children: React.ReactNode; variant?: keyof typeof tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", tone[variant], className)}>
      {children}
    </span>
  );
}

const eventStatus: Record<EventStatus, [string, keyof typeof tone]> = {
  draft: ["Draft", "neutral"],
  published: ["Published", "success"],
  cancelled: ["Cancelled", "danger"],
};

export const EventStatusBadge = ({ status }: { status: EventStatus }) => (
  <Pill variant={eventStatus[status][1]}>{eventStatus[status][0]}</Pill>
);

const registrationStatus: Record<RegistrationStatus, [string, keyof typeof tone]> = {
  pending_payment: ["Payment pending", "warning"],
  confirmed: ["Confirmed", "success"],
  cancelled: ["Cancelled", "danger"],
  expired: ["Expired", "neutral"],
};

export function RegistrationStatusBadge({ status, checkedInAt }: { status: RegistrationStatus; checkedInAt?: string | null }) {
  if (status === "confirmed" && checkedInAt) return <Pill variant="info">Checked in</Pill>;
  return <Pill variant={registrationStatus[status][1]}>{registrationStatus[status][0]}</Pill>;
}

const availability: Record<EventSummary["registrationState"], [string, keyof typeof tone]> = {
  open: ["Registration open", "success"],
  full: ["Full", "danger"],
  closed: ["Registration closed", "neutral"],
  started: ["In progress or ended", "neutral"],
  not_published: ["Not published", "neutral"],
  cancelled: ["Cancelled", "danger"],
};

export function AvailabilityBadge({ event }: { event: Pick<EventSummary, "registrationState" | "seatsLeft" | "capacity"> }) {
  if (event.registrationState === "open" && event.seatsLeft <= Math.max(5, event.capacity * 0.1)) {
    return <Pill variant="warning">{event.seatsLeft} {event.seatsLeft === 1 ? "seat" : "seats"} left</Pill>;
  }
  const [label, variant] = availability[event.registrationState];
  return <Pill variant={variant}>{label}</Pill>;
}
