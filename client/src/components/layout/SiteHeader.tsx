import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, Ticket, User as UserIcon, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { homeFor, roleLabel, useAuth, useLogout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import type { PublicUser } from "@shared/api";

function navFor(user: PublicUser | null) {
  const items = [{ href: "/events", label: "Events" }];
  if (user?.role === "student") {
    items.push({ href: "/dashboard", label: "Dashboard" }, { href: "/tickets", label: "My tickets" });
  }
  if (user?.role === "organizer" || user?.role === "admin") items.push({ href: "/organizer", label: "Organizer" });
  if (user?.role === "admin") items.push({ href: "/admin", label: "Admin" });
  return items;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function SiteHeader() {
  const { user, isLoading } = useAuth();
  const logout = useLogout();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const items = navFor(user);

  const isActive = (href: string) => location === href || location.startsWith(href + "/");
  const signOut = () => logout.mutate(undefined, { onSettled: () => navigate("/") });

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isActive(item.href) && "text-foreground bg-accent",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!isLoading && !user && (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:flex"
                  aria-label="Account menu"
                >
                  {initials(user.name)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{roleLabel[user.role]}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate(homeFor(user))}>
                  <LayoutDashboard /> Dashboard
                </DropdownMenuItem>
                {user.role === "student" && (
                  <DropdownMenuItem onSelect={() => navigate("/tickets")}>
                    <Ticket /> My tickets
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <UserIcon /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="!size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm">
              <SheetHeader>
                <SheetTitle className="text-left font-serif">Menu</SheetTitle>
              </SheetHeader>
              {user && (
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              )}
              <nav className="mt-4 flex flex-col gap-1" aria-label="Mobile">
                {[...items, ...(user ? [{ href: "/profile", label: "Profile" }] : [])].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-base font-medium hover:bg-accent",
                      isActive(item.href) && "bg-accent",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t pt-4">
                {user ? (
                  <Button variant="outline" className="w-full" onClick={() => { setOpen(false); signOut(); }}>
                    <LogOut /> Sign out
                  </Button>
                ) : (
                  <div className="grid gap-2">
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/register">Create account</Link>
                    </Button>
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
