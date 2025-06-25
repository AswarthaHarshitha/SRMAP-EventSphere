import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPinIcon, User2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Category, Event } from '@shared/schema';

interface EventCategoryProps {
  category: Category;
  limit?: number;
}

const EventCategory: React.FC<EventCategoryProps> = ({ category, limit = 3 }) => {
  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ['/api/events/category', category.name],
    queryFn: async () => {
      const response = await fetch(`/api/events/category/${encodeURIComponent(category.name)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(limit)].map((_, i) => (
            <Card key={i} className="h-96 animate-pulse">
              <div className="h-40 bg-gray-200 rounded-t-lg"></div>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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

  if (error || !events || events.length === 0) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
        <Card className="p-8 text-center">
          <p className="text-gray-500">No events available in this category right now.</p>
        </Card>
      </div>
    );
  }

  // Sort events by date (nearest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  // Limit the number of events to display
  const displayEvents = sortedEvents.slice(0, limit);

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">{category.name} Events</h2>
        <Link href={`/events/category/${encodeURIComponent(category.name)}`}>
          <Button variant="outline">View All</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayEvents.map((event) => {
          const startDate = new Date(event.startDate);
          const formattedDate = startDate.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          
          return (
            <Card key={event.id} className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="h-40 overflow-hidden">
                {event.imageUrl ? (
                  <img 
                    src={event.imageUrl} 
                    alt={event.title} 
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
                {event.isFeatured && (
                  <Badge className="bg-primary-500 hover:bg-primary-600">Featured</Badge>
                )}
              </CardHeader>
              
              <CardContent className="flex-grow">
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{event.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>{formattedDate}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-500">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-500">
                    <User2Icon className="h-4 w-4 mr-2" />
                    <span>{event.availableTickets} spots left</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="border-t pt-4">
                <div className="flex items-center justify-between w-full">
                  <div className="font-semibold">₹{Number(event.ticketPrice).toLocaleString()}</div>
                  <Link href={`/events/${event.id}`}>
                    <Button size="sm">Book Now</Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EventCategory;