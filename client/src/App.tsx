import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { queryClient, setSessionExpiredHandler } from "@/lib/api";
import { ME_KEY } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RequireAuth } from "@/components/RequireAuth";
import { Spinner } from "@/components/states";
import HomePage from "@/pages/HomePage";
import EventsPage from "@/pages/events/EventsPage";
import EventDetailPage from "@/pages/events/EventDetailPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import NotFoundPage from "@/pages/NotFoundPage";

const ProfilePage = lazy(() => import("@/pages/auth/ProfilePage"));
const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard"));
const TicketsPage = lazy(() => import("@/pages/student/TicketsPage"));
const TicketPage = lazy(() => import("@/pages/student/TicketPage"));
const PaymentsPage = lazy(() => import("@/pages/student/PaymentsPage"));
const OrganizerDashboard = lazy(() => import("@/pages/organizer/OrganizerDashboard"));
const EventEditorPage = lazy(() => import("@/pages/organizer/EventEditorPage"));
const ManageEventPage = lazy(() => import("@/pages/organizer/ManageEventPage"));
const CheckInPage = lazy(() => import("@/pages/organizer/CheckInPage"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminEventsPage = lazy(() => import("@/pages/admin/AdminEventsPage"));
const AdminRegistrationsPage = lazy(() => import("@/pages/admin/AdminRegistrationsPage"));

const staff = ["organizer", "admin"] as const;

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function SessionWatcher() {
  const [, navigate] = useLocation();
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.setQueryData(ME_KEY, null);
      toast({ title: "Session expired", description: "Please sign in again to continue." });
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    });
  }, [navigate]);
  return null;
}

function Routes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/events/:id" component={EventDetailPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />

        <Route path="/profile">
          <RequireAuth><ProfilePage /></RequireAuth>
        </Route>

        <Route path="/dashboard">
          <RequireAuth roles={["student"]}><StudentDashboard /></RequireAuth>
        </Route>
        <Route path="/tickets">
          <RequireAuth roles={["student"]}><TicketsPage /></RequireAuth>
        </Route>
        <Route path="/tickets/:id">
          {(params) => <RequireAuth><TicketPage id={params.id} /></RequireAuth>}
        </Route>
        <Route path="/payments">
          <RequireAuth roles={["student"]}><PaymentsPage /></RequireAuth>
        </Route>

        <Route path="/organizer">
          <RequireAuth roles={[...staff]}><OrganizerDashboard /></RequireAuth>
        </Route>
        <Route path="/organizer/events/new">
          <RequireAuth roles={[...staff]}><EventEditorPage /></RequireAuth>
        </Route>
        <Route path="/organizer/events/:id/edit">
          {(params) => <RequireAuth roles={[...staff]}><EventEditorPage id={params.id} /></RequireAuth>}
        </Route>
        <Route path="/organizer/events/:id/check-in">
          {(params) => <RequireAuth roles={[...staff]}><CheckInPage id={params.id} /></RequireAuth>}
        </Route>
        <Route path="/organizer/events/:id">
          {(params) => <RequireAuth roles={[...staff]}><ManageEventPage id={params.id} /></RequireAuth>}
        </Route>

        <Route path="/admin">
          <RequireAuth roles={["admin"]}><AdminDashboard /></RequireAuth>
        </Route>
        <Route path="/admin/users">
          <RequireAuth roles={["admin"]}><AdminUsersPage /></RequireAuth>
        </Route>
        <Route path="/admin/events">
          <RequireAuth roles={["admin"]}><AdminEventsPage /></RequireAuth>
        </Route>
        <Route path="/admin/registrations">
          <RequireAuth roles={["admin"]}><AdminRegistrationsPage /></RequireAuth>
        </Route>

        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <SessionWatcher />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow">
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            <ErrorBoundary>
              <Routes />
            </ErrorBoundary>
          </main>
          <SiteFooter />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
