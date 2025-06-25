import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, MapPinIcon, SearchIcon, User2Icon } from 'lucide-react';
import { Category, Event } from '@shared/schema';

const EventsPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  // Get URL parameters
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const typeParam = urlParams.get('type');
  const categoryParam = urlParams.get('category');
  
  // Set active tab and category based on URL parameters
  useEffect(() => {
    if (typeParam === 'technical') {
      setActiveTab('technical');
    } else if (typeParam === 'non-technical') {
      setActiveTab('non-technical');
    } else {
      setActiveTab('all');
    }
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [typeParam, categoryParam]);
  
  // Fetch all events
  const {
    data: events,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });
  
  // Fetch categories
  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });
  
  // Filter events when data changes
  useEffect(() => {
    if (!events) return;
    
    let filtered = [...events];
    
    // Filter by tab (event type)
    if (activeTab === 'technical') {
      filtered = filtered.filter(event => 
        ['Workshop', 'Hackathon', 'Conference', 'Webinar', 'Tech Meetup'].includes(event.category)
      );
    } else if (activeTab === 'non-technical') {
      filtered = filtered.filter(event => 
        ['Music', 'Sports', 'Arts', 'Food & Drink', 'Cultural'].includes(event.category)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        event =>
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query)
      );
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    setFilteredEvents(filtered);
  }, [events, searchQuery, selectedCategory, activeTab]);
  
  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedCategory('all');
    
    // Update URL without page refresh
    const newParams = new URLSearchParams();
    if (value !== 'all') {
      newParams.set('type', value);
    }
    
    const newPathWithSearch = location.split('?')[0] + 
      (newParams.toString() ? `?${newParams.toString()}` : '');
    
    setLocation(newPathWithSearch);
  };
  
  const isLoading = isLoadingEvents || isLoadingCategories;
  const hasError = eventsError || categoriesError;
  
  // Group categories
  const technicalCategories = categories?.filter(cat => 
    ['Workshop', 'Hackathon', 'Conference', 'Webinar', 'Tech Meetup'].includes(cat.name)
  ) || [];
  
  const nonTechnicalCategories = categories?.filter(cat => 
    ['Music', 'Sports', 'Arts', 'Food & Drink', 'Cultural'].includes(cat.name)
  ) || [];
  
  const getCategoriesForActiveTab = () => {
    if (activeTab === 'technical') return technicalCategories;
    if (activeTab === 'non-technical') return nonTechnicalCategories;
    return categories || [];
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Events</h1>
        <p className="text-gray-600">
          Discover and book tickets for upcoming events
        </p>
      </div>
      
      {/* Filters and Search */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="w-full md:w-64">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getCategoriesForActiveTab().map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Event Type Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="non-technical">Non-Technical</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">All Events</h2>
        </TabsContent>
        
        <TabsContent value="technical" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Technical Events</h2>
        </TabsContent>
        
        <TabsContent value="non-technical" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Non-Technical Events</h2>
        </TabsContent>
      </Tabs>
      
      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden flex flex-col h-full animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <CardHeader className="pb-2">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
              <CardFooter className="border-t">
                <div className="w-full flex justify-between">
                  <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : hasError ? (
          <div className="col-span-full p-8 text-center bg-red-50 rounded-lg">
            <p className="text-red-600">Failed to load events. Please try again later.</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">No events found matching your criteria.</p>
          </div>
        ) : (
          // Event cards
          filteredEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
              <div className="h-48 overflow-hidden">
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
                <Badge variant="outline">{event.category}</Badge>
                {event.isFeatured && (
                  <Badge className="ml-2 bg-primary">Featured</Badge>
                )}
              </CardHeader>
              
              <CardContent className="flex-grow">
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{event.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>{formatDate(event.startDate.toString())}</span>
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
          ))
        )}
      </div>
    </div>
  );
};

export default EventsPage;