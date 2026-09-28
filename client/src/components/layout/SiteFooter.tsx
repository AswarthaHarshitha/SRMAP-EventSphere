import { Link } from "wouter";
import { LogoMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <LogoMark className="h-7 w-7" />
          <div>
            <p className="font-serif font-semibold">SRMAP EventSphere</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Campus events, registrations and entry passes for the SRM University AP community.
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="Footer">
          <Link href="/events" className="hover:text-foreground">Browse events</Link>
          <Link href="/register" className="hover:text-foreground">Create account</Link>
          <Link href="/login" className="hover:text-foreground">Sign in</Link>
        </nav>
      </div>
      <div className="border-t">
        <p className="container-page py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} SRMAP EventSphere · Amaravati, Andhra Pradesh
        </p>
      </div>
    </footer>
  );
}
