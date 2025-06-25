import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Users,
  CreditCard,
  BarChart2,
  Settings,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

const DashboardSidebar = ({ className }: SidebarProps) => {
  const [location] = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Events",
      href: "/dashboard/events",
      icon: Calendar,
    },
    {
      name: "Tickets",
      href: "/dashboard/tickets",
      icon: Ticket,
    },
    {
      name: "Attendees",
      href: "/dashboard/attendees",
      icon: Users,
    },
    {
      name: "Payments",
      href: "/dashboard/payments",
      icon: CreditCard,
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart2,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <div className={cn("w-48 bg-gray-50 border-r border-gray-200 py-6 hidden md:block", className)}>
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                location === item.href
                  ? "bg-primary-50 text-primary-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              )}
            >
              <item.icon
                className={cn(
                  location === item.href
                    ? "text-primary-500"
                    : "text-gray-400 group-hover:text-gray-500",
                  "mr-3 h-5 w-5"
                )}
              />
              {item.name}
            </a>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default DashboardSidebar;
