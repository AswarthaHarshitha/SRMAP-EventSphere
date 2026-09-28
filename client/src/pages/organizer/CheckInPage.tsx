import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import QrScanner from "qr-scanner";
import { AlertTriangle, ArrowLeft, Camera, CameraOff, CheckCircle2, Keyboard, Loader2, XCircle } from "lucide-react";
import type { CheckInResult, EventDetail } from "@shared/api";
import { TICKET_QR_PREFIX } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, Spinner } from "@/components/states";
import { api, ApiError, errorMessage, queryClient } from "@/lib/api";
import { formatDateTime, formatTime, groupCode } from "@/lib/format";
import { cn } from "@/lib/utils";

type Outcome =
  | { kind: "ok"; result: CheckInResult }
  | { kind: "duplicate"; result: CheckInResult }
  | { kind: "error"; message: string };

function ResultCard({ outcome }: { outcome: Outcome }) {
  if (outcome.kind === "error") {
    return (
      <div role="alert" className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <XCircle className="h-6 w-6 shrink-0" />
        <div>
          <p className="font-semibold">Not admitted</p>
          <p className="text-sm">{outcome.message}</p>
        </div>
      </div>
    );
  }
  const { attendee } = outcome.result;
  const ok = outcome.kind === "ok";
  return (
    <div role="status" className={cn("flex gap-3 rounded-xl border p-4", ok ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning")}>
      {ok ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertTriangle className="h-6 w-6 shrink-0" />}
      <div className="min-w-0 text-foreground">
        <p className={cn("font-semibold", ok ? "text-success" : "text-warning")}>{ok ? "Checked in" : "Already checked in"}</p>
        <p className="truncate text-lg font-semibold">{attendee.user.name}</p>
        <p className="truncate text-sm text-muted-foreground">{attendee.user.email}{attendee.user.department ? ` · ${attendee.user.department}` : ""}</p>
        {!ok && attendee.checkedInAt && <p className="mt-1 text-sm">First scanned at {formatDateTime(attendee.checkedInAt)}.</p>}
        <p className="mt-1 font-mono text-xs text-muted-foreground">{groupCode(attendee.ticketCode)}</p>
      </div>
    </div>
  );
}

export default function CheckInPage({ id }: { id: string }) {
  const event = useQuery<{ data: EventDetail }>({ queryKey: [`/api/events/${id}`] });
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScanner | null>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);
  const busyRef = useRef(false);

  const [camera, setCamera] = useState<"off" | "starting" | "on" | "unavailable">("off");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [history, setHistory] = useState<{ name: string; at: string; ok: boolean }[]>([]);

  const submit = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || busyRef.current) return;
      // Cameras report the same code many times a second; ignore repeats for a few seconds.
      const now = Date.now();
      if (lastScan.current && lastScan.current.code === code && now - lastScan.current.at < 4000) return;
      lastScan.current = { code, at: now };

      busyRef.current = true;
      setBusy(true);
      try {
        const result = await api<CheckInResult>("POST", `/api/events/${id}/check-in`, { code });
        const ok = result.outcome === "checked_in";
        setOutcome({ kind: ok ? "ok" : "duplicate", result });
        setHistory((h) => [{ name: result.attendee.user.name, at: new Date().toISOString(), ok }, ...h].slice(0, 8));
        if (ok) queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith(`/api/events/${id}`) });
        navigator.vibrate?.(ok ? 80 : [60, 60, 60]);
      } catch (err) {
        setOutcome({ kind: "error", message: err instanceof ApiError ? err.message : errorMessage(err) });
        navigator.vibrate?.([150, 80, 150]);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [id],
  );

  const stopCamera = useCallback(() => {
    scanner.current?.destroy();
    scanner.current = null;
    setCamera("off");
  }, []);

  const startCamera = useCallback(async () => {
    if (!video.current) return;
    setCamera("starting");
    try {
      if (!(await QrScanner.hasCamera())) throw new Error("no camera");
      const instance = new QrScanner(
        video.current,
        (result) => {
          // Only react to EventSphere ticket codes; ignore unrelated QR codes in view.
          if (result.data.toUpperCase().startsWith(TICKET_QR_PREFIX)) void submit(result.data);
        },
        { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 5 },
      );
      scanner.current = instance;
      await instance.start();
      setCamera("on");
    } catch {
      scanner.current?.destroy();
      scanner.current = null;
      setCamera("unavailable");
    }
  }, [submit]);

  useEffect(() => stopCamera, [stopCamera]);

  if (event.isLoading) return <Spinner />;
  if (event.error || !event.data) return <div className="container-page py-12"><ErrorState error={event.error} onRetry={() => event.refetch()} /></div>;
  const e = event.data.data;
  if (!e.canManage) return <div className="container-page py-12"><ErrorState error={new Error("You can only check in attendees for events you organize.")} /></div>;

  return (
    <div className="container-page max-w-3xl py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href={`/organizer/events/${e.id}`}><ArrowLeft /> Back to event</Link></Button>
      <p className="eyebrow mt-4">Check-in</p>
      <h1 className="mt-1 break-words text-2xl font-semibold sm:text-3xl">{e.title}</h1>
      {e.status !== "published" && (
        <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">This event is {e.status}; tickets can't be checked in.</p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
        <div className="relative aspect-[4/3] bg-foreground/90 sm:aspect-video">
          <video ref={video} className={cn("h-full w-full object-cover", camera !== "on" && "invisible")} muted playsInline />
          {camera !== "on" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-background">
              {camera === "starting" ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : camera === "unavailable" ? (
                <>
                  <CameraOff className="h-8 w-8" />
                  <p className="max-w-sm text-sm">Camera unavailable. Allow camera access in your browser settings, or enter ticket codes below.</p>
                  <Button variant="secondary" onClick={startCamera}>Try again</Button>
                </>
              ) : (
                <>
                  <Camera className="h-8 w-8" />
                  <p className="max-w-sm text-sm">Point the camera at a student's QR pass. Each ticket is verified with the server.</p>
                  <Button variant="secondary" onClick={startCamera} disabled={e.status !== "published"}>Start camera</Button>
                </>
              )}
            </div>
          )}
          {busy && <div className="absolute right-3 top-3 rounded-full bg-card p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>}
        </div>
        {camera === "on" && (
          <div className="flex justify-end border-t p-3"><Button variant="ghost" size="sm" onClick={stopCamera}><CameraOff /> Stop camera</Button></div>
        )}
      </div>

      <div className="mt-4 min-h-[5rem]" aria-live="assertive">{outcome && <ResultCard outcome={outcome} />}</div>

      <form
        className="mt-4 rounded-2xl border bg-card p-5"
        onSubmit={(ev) => {
          ev.preventDefault();
          lastScan.current = null;
          void submit(manual).then(() => setManual(""));
        }}
      >
        <label htmlFor="manual-code" className="flex items-center gap-2 text-sm font-medium"><Keyboard className="h-4 w-4" /> Enter a ticket code</label>
        <div className="mt-2 flex gap-2">
          <Input id="manual-code" value={manual} onChange={(ev) => setManual(ev.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} className="h-11 font-mono" />
          <Button type="submit" className="h-11" disabled={busy || !manual.trim() || e.status !== "published"}>Verify</Button>
        </div>
      </form>

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent scans</h2>
          <ul className="mt-2 divide-y rounded-xl border bg-card">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="truncate">{h.name}</span>
                <span className={cn("shrink-0", h.ok ? "text-success" : "text-warning")}>{h.ok ? "Admitted" : "Duplicate"} · {formatTime(h.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
