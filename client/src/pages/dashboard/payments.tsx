import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CreditCard, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { format } from "date-fns";

interface Payment {
  id: number;
  ticketId: number;
  userId: number;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number;
  status: string;
  paymentDate: string;
  ticket?: {
    eventId: number;
    quantity: number;
  };
  event?: {
    id: number;
    title: string;
    imageUrl: string;
  };
}

const PaymentsPage: React.FC = () => {
  // Fetch payment history
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments/history"],
  });

  const formatDate = (date: string) => {
    return format(new Date(date), "MMMM d, yyyy");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "captured":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "authorized":
        return <Badge className="bg-blue-500">Authorized</Badge>;
      case "created":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>;
      case "refunded":
        return <Badge className="bg-purple-500">Refunded</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Payment History</h1>
          
          {isLoading ? (
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ) : payments && payments.length > 0 ? (
            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.razorpayPaymentId}
                        </TableCell>
                        <TableCell>
                          {payment.event ? (
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-md bg-gray-200 overflow-hidden mr-3">
                                {payment.event.imageUrl && (
                                  <img
                                    src={payment.event.imageUrl}
                                    alt={payment.event.title}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{payment.event.title}</div>
                                <div className="text-xs text-gray-500">
                                  {payment.ticket?.quantity} ticket(s)
                                </div>
                              </div>
                            </div>
                          ) : (
                            "Unknown Event"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            {formatDate(payment.paymentDate)}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              <span className="hidden sm:inline">Receipt</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              as="a"
                              href={`https://dashboard.razorpay.com/app/payments/${payment.razorpayPaymentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No payment history</CardTitle>
                <CardDescription>
                  You haven't made any payments yet. When you purchase tickets, your payment history will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center p-6">
                <div className="text-center">
                  <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No transactions found</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
