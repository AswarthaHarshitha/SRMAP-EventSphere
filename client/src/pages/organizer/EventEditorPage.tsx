import { useRef } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { EventDetail, EventSummary } from "@shared/api";
import { ALLOWED_IMAGE_TYPES, EVENT_CATEGORIES, MAX_IMAGE_BYTES } from "@shared/constants";
import { eventInputSchema } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { describedBy, Field } from "@/components/Field";
import { EventImage } from "@/components/EventCard";
import { ErrorState, PageHeader, Spinner } from "@/components/states";
import { toast } from "@/hooks/use-toast";
import { api, errorMessage, queryClient } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { fromLocalInput, toLocalInput } from "@/lib/format";

interface FormValues {
  title: string;
  description: string;
  category: string;
  venue: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  capacity: string;
  price: string;
}

const toPayload = (v: FormValues) => ({
  title: v.title,
  description: v.description,
  category: v.category,
  venue: v.venue,
  startAt: fromLocalInput(v.startAt),
  endAt: fromLocalInput(v.endAt),
  registrationDeadline: fromLocalInput(v.registrationDeadline),
  capacity: v.capacity === "" ? NaN : Number(v.capacity),
  priceInPaise: v.price === "" ? 0 : Math.round(Number(v.price) * 100),
});

/** Validates with the same schema the server uses, mapping payload fields back to form fields. */
const resolver: Resolver<FormValues> = async (values) => {
  const result = eventInputSchema.safeParse(toPayload(values));
  if (result.success) return { values, errors: {} };
  const errors: FieldErrors<FormValues> = {};
  for (const issue of result.error.issues) {
    const key = (issue.path[0] === "priceInPaise" ? "price" : issue.path[0]) as keyof FormValues;
    errors[key] ??= { type: "validation", message: issue.message };
  }
  return { values: {}, errors };
};

function defaults(event?: EventSummary): FormValues {
  if (!event) return { title: "", description: "", category: "", venue: "", startAt: "", endAt: "", registrationDeadline: "", capacity: "", price: "0" };
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    startAt: toLocalInput(event.startAt),
    endAt: toLocalInput(event.endAt),
    registrationDeadline: toLocalInput(event.registrationDeadline),
    capacity: String(event.capacity),
    price: String(event.priceInPaise / 100),
  };
}

function ImageSection({ event }: { event: EventSummary }) {
  const input = useRef<HTMLInputElement>(null);
  const refresh = (updated: EventSummary) => {
    queryClient.setQueryData([`/api/events/${event.id}`], (old: { data: EventDetail } | undefined) =>
      old ? { data: { ...old.data, ...updated } } : old,
    );
    queryClient.invalidateQueries({ queryKey: ["/api/organizer/events"] });
  };
  const upload = useMutation({
    mutationFn: (file: File) => api<EventSummary>("PUT", `/api/events/${event.id}/image`, file),
    onSuccess: (updated) => {
      refresh(updated);
      toast({ title: "Cover image updated" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Upload failed", description: errorMessage(err) }),
  });
  const remove = useMutation({
    mutationFn: () => api<EventSummary>("DELETE", `/api/events/${event.id}/image`),
    onSuccess: refresh,
    onError: (err) => toast({ variant: "destructive", title: "Couldn't remove image", description: errorMessage(err) }),
  });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return toast({ variant: "destructive", title: "Unsupported file", description: "Use a JPEG, PNG or WebP image." });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return toast({ variant: "destructive", title: "Image too large", description: "Images must be 2 MB or smaller." });
    }
    upload.mutate(file);
  };

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="font-sans text-lg font-semibold">Cover image</h2>
      <p className="mt-1 text-sm text-muted-foreground">JPEG, PNG or WebP up to 2 MB. A 16:9 image works best.</p>
      <div className="mt-4 aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
        <EventImage event={event} />
      </div>
      <input ref={input} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />} {event.imageUrl ? "Replace image" : "Upload image"}
        </Button>
        {event.imageUrl && (
          <Button type="button" variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>
    </section>
  );
}

function EventForm({ event }: { event?: EventDetail }) {
  const [, navigate] = useLocation();
  const form = useForm<FormValues>({ resolver, defaultValues: defaults(event) });
  const { errors } = form.formState;
  const locked = !!event && event.registeredCount > 0;

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      event
        ? api<EventSummary>("PATCH", `/api/events/${event.id}`, toPayload(values))
        : api<EventSummary>("POST", "/api/events", toPayload(values)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/stats"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${saved.id}`] });
      toast({ title: event ? "Changes saved" : "Draft created", description: event ? undefined : "Add a cover image, then publish when you're ready." });
      navigate(event ? `/organizer/events/${saved.id}` : `/organizer/events/${saved.id}/edit`);
    },
    onError: (err) => {
      const mapped = err as { fields?: Record<string, string> };
      if (mapped.fields?.priceInPaise) mapped.fields.price = mapped.fields.priceInPaise;
      applyServerErrors(err, form.setError);
    },
  });

  const reg = (name: keyof FormValues) => ({ ...describedBy(name, errors[name]?.message), ...form.register(name) });

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="space-y-6 rounded-2xl border bg-card p-6">
      <Field id="title" label="Title" error={errors.title?.message}>
        <Input id="title" className="h-11" maxLength={150} {...reg("title")} />
      </Field>
      <Field id="description" label="Description" error={errors.description?.message} hint="What will attendees do or learn? Mention prerequisites, what to bring and who it's for.">
        <Textarea id="description" rows={7} maxLength={5000} {...reg("description")} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="category" label="Category" error={errors.category?.message}>
          <select id="category" className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm" {...reg("category")}>
            <option value="">Choose a category</option>
            {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field id="venue" label="Venue" error={errors.venue?.message}>
          <Input id="venue" className="h-11" placeholder="e.g. Academic Block 1, Room 204" {...reg("venue")} />
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="startAt" label="Starts" error={errors.startAt?.message}>
          <Input id="startAt" type="datetime-local" className="h-11" {...reg("startAt")} />
        </Field>
        <Field id="endAt" label="Ends" error={errors.endAt?.message}>
          <Input id="endAt" type="datetime-local" className="h-11" {...reg("endAt")} />
        </Field>
      </div>
      <Field id="registrationDeadline" label="Registration closes" error={errors.registrationDeadline?.message} hint="Must be before the event starts.">
        <Input id="registrationDeadline" type="datetime-local" className="h-11 sm:max-w-xs" {...reg("registrationDeadline")} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="capacity" label="Capacity" error={errors.capacity?.message} hint={event ? `${event.registeredCount} seats already taken.` : "Maximum number of attendees."}>
          <Input id="capacity" type="number" min={1} inputMode="numeric" className="h-11" {...reg("capacity")} />
        </Field>
        <Field id="price" label="Ticket price (₹)" error={errors.price?.message} hint={locked ? "Price is locked once students have registered." : "Enter 0 for a free event."}>
          <Input id="price" type="number" min={0} step="0.01" inputMode="decimal" className={`h-11 ${locked ? "bg-muted text-muted-foreground" : ""}`} readOnly={locked} {...reg("price")} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-6">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />} {event ? "Save changes" : "Create draft"}
        </Button>
        <Button asChild variant="ghost"><Link href={event ? `/organizer/events/${event.id}` : "/organizer"}>Cancel</Link></Button>
      </div>
    </form>
  );
}

export default function EventEditorPage({ id }: { id?: string }) {
  const query = useQuery<{ data: EventDetail }>({ queryKey: [`/api/events/${id}`], enabled: !!id });

  if (id && query.isLoading) return <Spinner />;
  if (id && (query.error || !query.data)) return <div className="container-page py-12"><ErrorState error={query.error} onRetry={() => query.refetch()} /></div>;

  const event = query.data?.data;
  if (event && !event.canManage) {
    return <div className="container-page py-12"><ErrorState error={new Error("You can only edit events you organize.")} /></div>;
  }
  if (event?.status === "cancelled") {
    return <div className="container-page py-12"><ErrorState error={new Error("Cancelled events can't be edited.")} /></div>;
  }

  return (
    <div className="container-page py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={event ? `/organizer/events/${event.id}` : "/organizer"}><ArrowLeft /> Back</Link>
      </Button>
      <div className="mt-4">
        <PageHeader
          eyebrow={event ? "Edit event" : "New event"}
          title={event ? event.title : "Create an event"}
          description={event ? undefined : "New events are saved as drafts. Students can't see them until you publish."}
        />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <EventForm key={event?.updatedAt ?? "new"} event={event} />
        {event ? (
          <div className="lg:self-start"><ImageSection event={event} /></div>
        ) : (
          <aside className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground lg:self-start">
            You can add a cover image after creating the draft.
          </aside>
        )}
      </div>
    </div>
  );
}
