import type { ReactNode } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { ShieldAlert } from "lucide-react";
import type { UserRole } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { homeFor, useAuth } from "@/lib/auth";
import { EmptyState, ErrorState, Spinner } from "./states";

/**
 * Client-side routing guard. It only improves navigation; every protected API route
 * enforces the same rules on the server.
 */
export function RequireAuth({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { user, isLoading, error } = useAuth();
  const [location] = useLocation();

  if (isLoading) return <Spinner />;
  if (error) return <div className="container-page py-12"><ErrorState error={error} onRetry={() => location && window.location.reload()} /></div>;
  if (!user) return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShieldAlert}
          title="You don't have access to this page"
          description="This area is limited to a different role. If you think this is a mistake, contact an administrator."
          action={
            <Button asChild variant="outline">
              <Link href={homeFor(user)}>Go to your dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}
