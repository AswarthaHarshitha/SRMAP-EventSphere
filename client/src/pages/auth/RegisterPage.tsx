import { Link, Redirect, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { PublicConfig } from "@shared/api";
import { registerSchema, type RegisterInput } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describedBy, Field } from "@/components/Field";
import { homeFor, useAuth, useRegister } from "@/lib/auth";
import { applyServerErrors } from "@/lib/forms";
import { AuthLayout, safeNext } from "./AuthLayout";

export default function RegisterPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const signup = useRegister();
  const config = useQuery<{ data: PublicConfig }>({ queryKey: ["/api/config"], staleTime: 5 * 60_000 });
  const domains = config.data?.data.allowedEmailDomains ?? [];

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", department: "" },
  });
  const { errors } = form.formState;

  if (user && !signup.isPending) return <Redirect to={safeNext(search) ?? homeFor(user)} />;

  const onSubmit = form.handleSubmit((values) =>
    signup.mutate(values, {
      onSuccess: (u) => navigate(safeNext(search) ?? homeFor(u)),
      onError: (err) => applyServerErrors(err, form.setError, "Couldn't create your account"),
    }),
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Student accounts can register for any published event."
      footer={<>Already have an account? <Link href={`/login${search ? `?${search}` : ""}`} className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field id="name" label="Full name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" className="h-11" {...describedBy("name", errors.name?.message)} {...form.register("name")} />
        </Field>
        <Field
          id="email"
          label="Email"
          error={errors.email?.message}
          hint={domains.length ? `Use your ${domains.map((d) => "@" + d).join(" or ")} address.` : "We'll send registration confirmations here."}
        >
          <Input id="email" type="email" autoComplete="email" inputMode="email" className="h-11" {...describedBy("email", errors.email?.message)} {...form.register("email")} />
        </Field>
        <Field id="department" label="Department (optional)" error={errors.department?.message} hint="For example: CSE, ECE, Mechanical, School of Liberal Arts">
          <Input id="department" autoComplete="organization-title" className="h-11" {...describedBy("department", errors.department?.message)} {...form.register("department")} />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
          <Input id="password" type="password" autoComplete="new-password" className="h-11" {...describedBy("password", errors.password?.message)} {...form.register("password")} />
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={signup.isPending}>
          {signup.isPending && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
