import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUp, CalendarIcon, CreditCard, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardSidebar from "@/components/ui/dashboard-sidebar";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalSales: number;
  totalTicketsSold: number;
  eventStats: {
    id: number;
    title: string;
    sold: number;
    total: number;
    revenue: number;
  }[];
}

interface Transaction {
  id: number;
  eventId: number;
  eventTitle: string;
  attendeeId: number;
  attendeeName: string;
  attendeeEmail: string;
  amount: number;
  status: string;
  date: string;
}

const DashboardPage: React.FC = () => {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/payments/history?limit=5"],
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Check if a date string is valid
  const isValidDate = (dateString: string): boolean => {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Active Events
                </CardTitle>
                <span className="text-green-500 text-xs font-medium flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" /> 12%
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    stats?.activeEvents
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">events</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Ticket Sales
                </CardTitle>
                <span className="text-green-500 text-xs font-medium flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" /> 8%
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    stats?.totalTicketsSold
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Revenue
                </CardTitle>
                <span className="text-green-500 text-xs font-medium flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" /> 24%
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    formatCurrency(stats?.totalSales || 0)
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Events
                </CardTitle>
                <span className="text-green-500 text-xs font-medium flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" /> 6%
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    stats?.totalEvents
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">events</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Transactions */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
              <Link href="/dashboard/payments">
                <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                  View all
                </Button>
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {transactionsLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.id}
                        </TableCell>
                        <TableCell>{transaction.eventTitle}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                {transaction.attendeeName?.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {transaction.attendeeName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {transaction.attendeeEmail}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === "completed"
                                ? "default"
                                : transaction.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.date && isValidDate(transaction.date) 
                            ? formatDistanceToNow(new Date(transaction.date), { addSuffix: true }) 
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No transactions found
                </div>
              )}
            </div>
          </div>
          
          {/* Upcoming Events */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Your Upcoming Events</h2>
              <Link href="/dashboard/events">
                <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                  View all
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {statsLoading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-10 bg-gray-200 rounded mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : stats?.eventStats && stats.eventStats.length > 0 ? (
                stats.eventStats.slice(0, 3).map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <CalendarIcon className="h-4 w-4 mr-2 text-primary-500" />
                        <span>Status: Active</span>
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-2 text-gray-900">
                        {event.title}
                      </h3>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sold</span>
                          <span className="font-medium">{event.sold}/{event.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-primary-600 h-2.5 rounded-full"
                            style={{ width: `${(event.sold / event.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-900">{formatCurrency(event.revenue)}</span>
                          <span className="text-xs text-gray-500 block">Revenue</span>
                        </div>
                        <Link href={`/events/${event.id}`}>
                          <Button size="sm">View Event</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 p-8 text-center text-gray-500 bg-white rounded-lg shadow">
                  <p>You don't have any upcoming events.</p>
                  <Link href="/events/create">
                    <Button className="mt-4">Create an Event</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
