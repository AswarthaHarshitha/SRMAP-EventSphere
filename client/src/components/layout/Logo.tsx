import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-8 w-8", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 10.5h14M9 16h10M9 21.5h14" stroke="hsl(var(--primary-foreground))" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="23.5" cy="16" r="2.2" className="fill-highlight" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 rounded-md", className)} aria-label="SRMAP EventSphere home">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-lg font-semibold tracking-tight">EventSphere</span>
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">SRM University AP</span>
      </span>
    </Link>
  );
}
