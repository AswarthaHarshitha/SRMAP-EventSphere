import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Edit, Trash2, Eye, MoreHorizontal, Calendar, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DashboardSidebar from "@/components/ui/dashboard-sidebar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Event } from "@shared/schema";
import { format } from "date-fns";

const EventsPage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch user's events
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/organizer/events"],
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      toast({
        title: "Event deleted",
        description: "The event has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/events"] });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete the event.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteEvent = (event: Event) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEvent) {
      deleteEventMutation.mutate(selectedEvent.id);
    }
  };

  const filteredEvents = events?.filter((event) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return event.status === "active";
    if (activeTab === "completed") return event.status === "completed";
    if (activeTab === "cancelled") return event.status === "cancelled";
    return true;
  });

  const formatEventDate = (date: string) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Events</h1>
            <Link href="/events/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Create Event</span>
              </Button>
            </Link>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="w-3/4">
                        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-10 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(event.status)}
                          {event.isFeatured && (
                            <Badge variant="outline" className="bg-primary-50 text-primary-600">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
                        <div className="space-y-2 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatEventDate(event.startDate)} to {formatEventDate(event.endDate)}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            {event.totalTickets - event.availableTickets} / {event.totalTickets} tickets sold
                          </div>
                          <div className="flex items-center">
                            <Tag className="h-4 w-4 mr-2" />
                            ₹{event.ticketPrice.toString()} per ticket
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex mt-4 md:mt-0 gap-2">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Link href={`/events/edit/${event.id}`}>
                                <div className="flex items-center">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </div>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteEvent(event)}>
                              <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                              <span className="text-red-500">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No events found</CardTitle>
                <CardDescription>
                  You haven't created any events yet. Click the button below to create your first event.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/events/create">
                  <Button>Create Event</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Delete Event Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              {deleteEventMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventsPage;
