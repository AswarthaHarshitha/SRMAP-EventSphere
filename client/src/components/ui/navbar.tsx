import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isLoggedIn, getCurrentUser, logout, isOrganizer } from "@/lib/auth";
import { BellIcon, ChevronDownIcon, Menu, X } from "lucide-react";

const Navbar: React.FC = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const user = getCurrentUser();
  const loggedIn = isLoggedIn();
  
  const handleLogout = () => {
    logout();
  };

  const routes = [
    { path: "/", label: "Home" },
    { path: "/events", label: "Browse Events" },
    ...(isOrganizer() ? [{ path: "/events/create", label: "Create Event" }] : []),
    ...(loggedIn ? [{ path: "/dashboard", label: "Dashboard" }] : []),
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <div className="flex items-center cursor-pointer">
                  <img 
                    src="/assets/srmap/photos/logo.png" 
                    alt="SRM AP" 
                    className="h-10 mr-2"
                  />
                  <span className="text-primary-600 font-heading font-bold text-xl hidden md:block">
                    Events Portal
                  </span>
                </div>
              </Link>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {routes.map((route) => (
                <Link key={route.path} href={route.path}>
                  <div
                    className={`${
                      location === route.path
                        ? "border-primary-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}
                  >
                    {route.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {loggedIn && (
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500">
                <BellIcon className="h-5 w-5" />
              </Button>
            )}
            
            {loggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {user?.profilePicUrl ? (
                        <img src={user.profilePicUrl} alt={user.username} className="h-full w-full object-cover" />
                      ) : (
                        <span>{user?.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-gray-700">{user?.username}</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <div className="w-full cursor-pointer">Profile</div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <div className="w-full cursor-pointer">Dashboard</div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Mobile menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {routes.map((route) => (
              <Link key={route.path} href={route.path}>
                <div
                  className={`${
                    location === route.path
                      ? "bg-primary-50 border-primary-500 text-primary-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {route.label}
                </div>
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {loggedIn ? (
              <>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {user?.profilePicUrl ? (
                        <img src={user.profilePicUrl} alt={user.username} className="h-full w-full object-cover" />
                      ) : (
                        <span>{user?.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user?.fullName}</div>
                    <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Link href="/profile">
                    <div
                      className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Your Profile
                    </div>
                  </Link>
                  <Link href="/dashboard">
                    <div
                      className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </div>
                  </Link>
                  <button
                    className="w-full text-left block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1 px-4">
                <Link href="/auth/login">
                  <div
                    className="block text-center py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </div>
                </Link>
                <Link href="/auth/register">
                  <div
                    className="block text-center py-2 text-base font-medium bg-primary-600 text-white rounded-md cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
