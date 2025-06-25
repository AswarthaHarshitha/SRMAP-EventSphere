import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

// Pages
import Home from "@/pages/home";
import EventsPage from "@/pages/events/index";
import EventDetailsPage from "@/pages/events/[id]";
import CreateEventPage from "@/pages/events/create";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import ProfilePage from "@/pages/auth/profile";
import DashboardPage from "@/pages/dashboard/index";
import DashboardEventsPage from "@/pages/dashboard/events";
import DashboardTicketsPage from "@/pages/dashboard/tickets";
import DashboardPaymentsPage from "@/pages/dashboard/payments";
import CheckoutPage from "@/pages/checkout/[id]";
import CheckoutSuccessPage from "@/pages/checkout/success";
import TicketsPage from "@/pages/tickets/index";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/events" component={EventsPage} />
          <Route path="/events/create" component={CreateEventPage} />
          <Route path="/events/:id" component={EventDetailsPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/auth/login" component={LoginPage} />
          <Route path="/auth/register" component={RegisterPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/dashboard/events" component={DashboardEventsPage} />
          <Route path="/dashboard/tickets" component={DashboardTicketsPage} />
          <Route path="/dashboard/payments" component={DashboardPaymentsPage} />
          <Route path="/checkout/success" component={CheckoutSuccessPage} />
          <Route path="/checkout/:id" component={CheckoutPage} />
          <Route path="/tickets" component={TicketsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
