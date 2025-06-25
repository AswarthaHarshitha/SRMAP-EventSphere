import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ClockIcon, MapPinIcon, TicketIcon } from 'lucide-react';
import { Ticket } from '@shared/schema';
import { isLoggedIn } from '@/lib/auth';

interface TicketWithEvent extends Ticket {
  event: {
    id: number;
    title: string;
    startDate: Date;
    endDate: Date;
    location: string;
    imageUrl: string | null;
  };
}

const TicketsPage: React.FC = () => {
  const loggedIn = isLoggedIn();
  
  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery<TicketWithEvent[]>({
    queryKey: ['/api/tickets'],
    queryFn: async () => {
      const response = await fetch('/api/tickets', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }
      
      return response.json();
    },
    enabled: loggedIn,
  });
  
  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  // Format time helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (!loggedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <CardTitle className="mb-4">Login Required</CardTitle>
          <p className="mb-6">Please log in to view your tickets.</p>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Tickets</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-t-lg"></div>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Tickets</h1>
        <Card className="p-8 text-center text-red-600">
          <p>Failed to load tickets. Please try again later.</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Tickets</h1>
      
      {tickets && tickets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="mb-6">You don't have any tickets yet.</p>
          <Button asChild>
            <Link href="/events">Browse Events</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets?.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden flex flex-col">
              <div className="h-32 overflow-hidden bg-gray-100">
                {ticket.event?.imageUrl ? (
                  <img
                    src={ticket.event.imageUrl}
                    alt={ticket.event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <TicketIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              </div>
              
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{ticket.event?.title}</CardTitle>
                  <Badge variant={ticket.status === 'valid' ? 'default' : 'destructive'}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </Badge>
                </div>
                <div className="text-gray-600">
                  Ticket #{ticket.id} • {ticket.quantity} {ticket.quantity > 1 ? 'tickets' : 'ticket'}
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>{formatDate(ticket.event?.startDate.toString() || '')}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>{formatTime(ticket.event?.startDate.toString() || '')}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-500">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <span className="line-clamp-1">{ticket.event?.location}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total Amount:</span>
                    <span>₹{Number(ticket.totalAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Purchase Date:</span>
                    <span>{formatDate(ticket.purchaseDate.toString())}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/events/${ticket.event?.id}`}>
                    View Event Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketsPage;