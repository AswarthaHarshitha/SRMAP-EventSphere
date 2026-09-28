import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { PublicUser } from "@shared/api";
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describedBy, Field } from "@/components/Field";
import { PageHeader } from "@/components/states";
import { toast } from "@/hooks/use-toast";
import { api, queryClient } from "@/lib/api";
import { ME_KEY, roleLabel, useAuth } from "@/lib/auth";
import { applyServerErrors } from "@/lib/forms";
import { formatDate } from "@/lib/format";

function ProfileForm({ user }: { user: PublicUser }) {
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, department: user.department ?? "", phone: user.phone ?? "" },
  });
  const { errors } = form.formState;
  const save = useMutation({
    mutationFn: (values: ProfileInput) => api<PublicUser>("PATCH", "/api/auth/me", values),
    onSuccess: (updated) => {
      queryClient.setQueryData(ME_KEY, updated);
      form.reset({ name: updated.name, department: updated.department ?? "", phone: updated.phone ?? "" });
      toast({ title: "Profile updated" });
    },
    onError: (err) => applyServerErrors(err, form.setError),
  });

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="space-y-5">
      <Field id="name" label="Full name" error={errors.name?.message}>
        <Input id="name" className="h-11" {...describedBy("name", errors.name?.message)} {...form.register("name")} />
      </Field>
      <Field id="email" label="Email" hint="Contact an administrator to change your sign-in email.">
        <Input id="email" value={user.email} disabled className="h-11" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="department" label="Department" error={errors.department?.message}>
          <Input id="department" className="h-11" {...describedBy("department", errors.department?.message)} {...form.register("department")} />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone?.message} hint="Used to prefill payment forms.">
          <Input id="phone" type="tel" autoComplete="tel" className="h-11" {...describedBy("phone", errors.phone?.message)} {...form.register("phone")} />
        </Field>
      </div>
      <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
        {save.isPending && <Loader2 className="animate-spin" />} Save changes
      </Button>
    </form>
  );
}

function PasswordForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const { errors } = form.formState;
  const change = useMutation({
    mutationFn: (values: ChangePasswordInput) => api("POST", "/api/auth/change-password", values),
    onSuccess: () => {
      form.reset();
      toast({ title: "Password changed", description: "Other devices have been signed out." });
    },
    onError: (err) => applyServerErrors(err, form.setError, "Couldn't change password"),
  });

  return (
    <form onSubmit={form.handleSubmit((v) => change.mutate(v))} noValidate className="space-y-5">
      <Field id="currentPassword" label="Current password" error={errors.currentPassword?.message}>
        <Input id="currentPassword" type="password" autoComplete="current-password" className="h-11" {...describedBy("currentPassword", errors.currentPassword?.message)} {...form.register("currentPassword")} />
      </Field>
      <Field id="newPassword" label="New password" error={errors.newPassword?.message} hint="At least 8 characters, with a letter and a number.">
        <Input id="newPassword" type="password" autoComplete="new-password" className="h-11" {...describedBy("newPassword", errors.newPassword?.message)} {...form.register("newPassword")} />
      </Field>
      <Button type="submit" variant="outline" disabled={change.isPending}>
        {change.isPending && <Loader2 className="animate-spin" />} Change password
      </Button>
    </form>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow={roleLabel[user.role]} title="Your profile" description={`Member since ${formatDate(user.createdAt)}`} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-sans text-lg font-semibold">Personal details</h2>
          <div className="mt-5"><ProfileForm user={user} /></div>
        </section>
        <section className="rounded-2xl border bg-card p-6 lg:self-start">
          <h2 className="font-sans text-lg font-semibold">Password</h2>
          <div className="mt-5"><PasswordForm /></div>
        </section>
      </div>
    </div>
  );
}
