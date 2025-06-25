import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  CreditCard,
  Users,
  BarChart4,
  Settings,
  LogOut
} from "lucide-react";
import { logout, isAdmin } from "@/lib/auth";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ href, icon, children, active }) => {
  return (
    <Link href={href}>
      <a
        className={cn(
          "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
          active
            ? "bg-primary-50 text-primary-600"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <span 
          className={cn(
            "mr-3 flex-shrink-0 h-5 w-5",
            active ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
          )}
        >
          {icon}
        </span>
        {children}
      </a>
    </Link>
  );
};

const DashboardSidebar: React.FC = () => {
  const [location] = useLocation();
  
  const handleLogout = () => {
    logout();
  };

  const links = [
    { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/dashboard/events", icon: <Calendar />, label: "Events" },
    { href: "/dashboard/tickets", icon: <Ticket />, label: "Tickets" },
    { href: "/dashboard/payments", icon: <CreditCard />, label: "Payments" },
  ];

  // Admin-only links
  const adminLinks = [
    { href: "/dashboard/users", icon: <Users />, label: "Users" },
    { href: "/dashboard/analytics", icon: <BarChart4 />, label: "Analytics" },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="py-6">
        <div className="px-4 mb-6">
          <Link href="/">
            <a className="text-primary-600 font-heading font-bold text-2xl">
              EventPulse
            </a>
          </Link>
          <div className="text-xs text-gray-500 mt-1">Admin Panel</div>
        </div>

        <div className="space-y-1 px-2">
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              active={location === link.href}
            >
              {link.label}
            </SidebarLink>
          ))}

          {isAdmin() && adminLinks.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              active={location === link.href}
            >
              {link.label}
            </SidebarLink>
          ))}
        </div>

        <div className="mt-6 px-2">
          <SidebarLink
            href="/profile"
            icon={<Settings />}
            active={location === "/profile"}
          >
            Settings
          </SidebarLink>
          
          <button
            onClick={handleLogout}
            className="w-full text-left group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <span className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500">
              <LogOut />
            </span>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;
