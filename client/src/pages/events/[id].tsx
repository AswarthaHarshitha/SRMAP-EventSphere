import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { CalendarIcon, Clock3Icon, MapPinIcon, UserIcon, ArrowLeftIcon, TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Event } from '@shared/schema';
import TicketBooking from '@/components/TicketBooking';
import { Card, CardContent } from '@/components/ui/card';

const EventDetail: React.FC = () => {
  // Get event ID from route
  const [match, params] = useRoute<{ id: string }>('/events/:id');
  const eventId = params?.id;
  
  // Format date helper function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Format time helper function
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Fetch event details
  const {
    data: event,
    isLoading,
    error,
  } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event details');
      }
      return response.json();
    },
    enabled: !!eventId,
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" className="mr-4" asChild>
            <Link href="/events">
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Back to Events
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" className="mr-4" asChild>
            <Link href="/events">
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Back to Events
            </Link>
          </Button>
        </div>
        
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Event</h2>
          <p className="mb-4">
            We couldn't load the event details. Please try again later or contact support.
          </p>
          <Button asChild>
            <Link href="/events">Browse Other Events</Link>
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" className="mr-4" asChild>
          <Link href="/events">
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Events
          </Link>
        </Button>
        
        <Badge variant="outline">{event.category}</Badge>
        {event.isFeatured && (
          <Badge className="ml-2 bg-primary">Featured</Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Event Image */}
          <div className="rounded-lg overflow-hidden h-64 md:h-80">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">No image available</span>
              </div>
            )}
          </div>
          
          {/* Event Title and Info */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-600">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-gray-500" />
                <span>{formatDate(event.startDate.toString())}</span>
              </div>
              
              <div className="flex items-center">
                <Clock3Icon className="h-5 w-5 mr-2 text-gray-500" />
                <span>{formatTime(event.startDate.toString())}</span>
              </div>
              
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2 text-gray-500" />
                <span>{event.location}</span>
              </div>
              
              <div className="flex items-center">
                <TicketIcon className="h-5 w-5 mr-2 text-gray-500" />
                <span>{event.availableTickets} tickets left</span>
              </div>
            </div>
          </div>
          
          {/* Event Description */}
          <div>
            <h2 className="text-xl font-semibold mb-3">About This Event</h2>
            <div className="prose max-w-none">
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          </div>
          
          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-3">Event Details</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CalendarIcon className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Date</div>
                      <div className="text-gray-600">
                        {formatDate(event.startDate.toString())}
                        {event.endDate && event.endDate !== event.startDate && (
                          <> - {formatDate(event.endDate.toString())}</>
                        )}
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex items-start">
                    <Clock3Icon className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Time</div>
                      <div className="text-gray-600">{formatTime(event.startDate.toString())}</div>
                    </div>
                  </li>
                  
                  <li className="flex items-start">
                    <MapPinIcon className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-gray-600">{event.location}</div>
                    </div>
                  </li>
                  
                  <li className="flex items-start">
                    <UserIcon className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Organizer</div>
                      <div className="text-gray-600">Event Organizer</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-3">Ticket Information</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span>Price</span>
                    <span className="font-semibold">₹{Number(event.ticketPrice).toLocaleString()}</span>
                  </li>
                  
                  <li className="flex justify-between items-center">
                    <span>Available Tickets</span>
                    <span className="font-semibold">{event.availableTickets}</span>
                  </li>
                  
                  <li className="flex justify-between items-center">
                    <span>Total Capacity</span>
                    <span className="font-semibold">{event.totalTickets}</span>
                  </li>
                  
                  <li className="pt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ 
                          width: `${Math.round(((event.totalTickets - event.availableTickets) / event.totalTickets) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>{Math.round(((event.totalTickets - event.availableTickets) / event.totalTickets) * 100)}% Booked</span>
                      <span>{event.totalTickets - event.availableTickets} Sold</span>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Ticket Booking Section */}
        <div className="lg:col-span-1 sticky top-8 self-start">
          <TicketBooking event={event} />
        </div>
      </div>
    </div>
  );
};

export default EventDetail;