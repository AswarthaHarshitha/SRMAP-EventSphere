import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, MapPin, User, CreditCard, FileCheck, FileX, Download } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DashboardSidebar from "@/components/ui/dashboard-sidebar";
import { format } from "date-fns";

interface Ticket {
  id: number;
  eventId: number;
  userId: number;
  quantity: number;
  totalAmount: number;
  purchaseDate: string;
  status: string;
  event: {
    id: number;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    imageUrl: string;
  };
}

const TicketsPage: React.FC = () => {
  const [viewTicketDialog, setViewTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch user's tickets
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewTicketDialog(true);
  };

  const filteredTickets = tickets?.filter((ticket) => {
    if (activeTab === "all") return true;
    if (activeTab === "valid") return ticket.status === "valid";
    if (activeTab === "used") return ticket.status === "used";
    if (activeTab === "cancelled") return ticket.status === "cancelled";
    return true;
  });

  const formatDate = (date: string) => {
    return format(new Date(date), "MMMM d, yyyy");
  };

  const formatTime = (date: string) => {
    return format(new Date(date), "h:mm a");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-500">Valid</Badge>;
      case "used":
        return <Badge className="bg-blue-500">Used</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">My Tickets</h1>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Tickets</TabsTrigger>
              <TabsTrigger value="valid">Valid</TabsTrigger>
              <TabsTrigger value="used">Used</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {isLoading ? (
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ) : filteredTickets && filteredTickets.length > 0 ? (
            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-md bg-gray-200 overflow-hidden mr-3">
                              {ticket.event.imageUrl && (
                                <img
                                  src={ticket.event.imageUrl}
                                  alt={ticket.event.title}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{ticket.event.title}</div>
                              <div className="text-xs text-gray-500">{ticket.event.location}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{formatDate(ticket.event.startDate)}</div>
                          <div className="text-xs text-gray-500">{formatTime(ticket.event.startDate)}</div>
                        </TableCell>
                        <TableCell>{ticket.quantity}</TableCell>
                        <TableCell>₹{ticket.totalAmount.toString()}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTicket(ticket)}
                          >
                            View Ticket
                          </Button>
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
                <CardTitle>No tickets found</CardTitle>
                <CardDescription>
                  You haven't purchased any tickets yet. Browse events to find something you'd like to attend.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/events">
                  <Button>Browse Events</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* View Ticket Dialog */}
      <Dialog open={viewTicketDialog} onOpenChange={setViewTicketDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              Present this ticket at the event entrance
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{selectedTicket.event.title}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        {formatDate(selectedTicket.event.startDate)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        {formatTime(selectedTicket.event.startDate)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedTicket.event.location}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                
                <div className="my-4 border-t border-b border-gray-200 py-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Ticket ID</span>
                    <span className="font-medium">{selectedTicket.id}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Quantity</span>
                    <span className="font-medium">{selectedTicket.quantity}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Purchase Date</span>
                    <span className="font-medium">{formatDate(selectedTicket.purchaseDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-medium">₹{selectedTicket.totalAmount.toString()}</span>
                  </div>
                </div>
                
                <div className="text-center">
                  {/* This would be an actual QR code in a real app */}
                  <div className="mx-auto bg-white p-2 rounded-lg border border-gray-200 inline-block">
                    <svg
                      width="150"
                      height="150"
                      viewBox="0 0 29 29"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto"
                    >
                      <path
                        d="M0 0.5H10V10.5H0V0.5Z"
                        fill="black"
                      />
                      <path
                        d="M2 2.5H8V8.5H2V2.5Z"
                        fill="white"
                      />
                      <path
                        d="M19 0.5H29V10.5H19V0.5Z"
                        fill="black"
                      />
                      <path
                        d="M21 2.5H27V8.5H21V2.5Z"
                        fill="white"
                      />
                      <path
                        d="M0 19.5H10V29.5H0V19.5Z"
                        fill="black"
                      />
                      <path
                        d="M2 21.5H8V27.5H2V21.5Z"
                        fill="white"
                      />
                      <path
                        d="M13 13.5H16V16.5H13V13.5Z"
                        fill="black"
                      />
                      <path
                        d="M13 3.5H16V6.5H13V3.5ZM19 13.5H22V16.5H19V13.5ZM19 22.5H22V25.5H19V22.5ZM13 19.5H16V22.5H13V19.5Z"
                        fill="black"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Ticket #{selectedTicket.id}
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button className="w-full flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Ticket
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Adding Clock component since it was used but not imported
const Clock: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
};

export default TicketsPage;
