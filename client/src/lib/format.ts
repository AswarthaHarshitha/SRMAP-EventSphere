const TZ = undefined; // Use the viewer's own time zone.

const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: TZ });
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const dayOfMonth = (iso: string) => dayFmt.format(new Date(iso));
export const monthShort = (iso: string) => monthFmt.format(new Date(iso));

/** "Mon, 6 Oct 2026 · 10:00 am – 1:00 pm" (or spanning dates when multi-day). */
export function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${formatDate(startIso)} · ${formatTime(startIso)} – ${formatTime(endIso)}`
    : `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const formatPrice = (paise: number) => (paise === 0 ? "Free" : inr.format(paise / 100));
export const formatMoney = (paise: number) => inr.format(paise / 100);

/** Groups a ticket code for reading aloud or typing: ABCDE-FGHIJ-KLMNO-PQRST. */
export const groupCode = (code: string) => code.match(/.{1,5}/g)?.join("-") ?? code;

/** Converts an ISO timestamp to the value format of <input type="datetime-local">. */
export function toLocalInput(iso: string | Date) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : "");

export function relativeDays(iso: string) {
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return `In ${days} days`;
  return null;
}
