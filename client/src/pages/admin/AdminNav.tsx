import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/registrations", label: "Registrations" },
];

export function AdminNav() {
  const [location] = useLocation();
  return (
    <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0" aria-label="Admin sections">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={location === t.href ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground",
            location === t.href && "border-primary text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="eyebrow">Administration</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <AdminNav />
    </div>
  );
}
