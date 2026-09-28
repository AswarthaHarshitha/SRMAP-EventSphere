import { Link, Redirect, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describedBy, Field } from "@/components/Field";
import { ApiError, errorMessage } from "@/lib/api";
import { homeFor, useAuth, useLogin } from "@/lib/auth";
import { AuthLayout, safeNext } from "./AuthLayout";

export default function LoginPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const login = useLogin();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  if (user && !login.isPending) return <Redirect to={safeNext(search) ?? homeFor(user)} />;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, { onSuccess: (u) => navigate(safeNext(search) ?? homeFor(u)) }),
  );

  const failure = login.error
    ? login.error instanceof ApiError && login.error.status === 429
      ? login.error.message
      : errorMessage(login.error)
    : null;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to register for events and view your tickets."
      footer={<>New to EventSphere? <Link href={`/register${search ? `?${search}` : ""}`} className="font-medium text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {failure && <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{failure}</div>}
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" className="h-11" {...describedBy("email", errors.email?.message)} {...form.register("email")} />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" className="h-11" {...describedBy("password", errors.password?.message)} {...form.register("password")} />
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />} Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
