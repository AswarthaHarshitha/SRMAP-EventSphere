import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import EventCard from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, Filter } from "lucide-react";

const EventsList = () => {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");

  // Parse URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("search");
    const category = params.get("category");
    
    if (search) setSearchQuery(search);
    if (category) setCategoryFilter(category);
  }, [location]);

  // Fetch all events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["/api/events", categoryFilter],
    queryFn: () => {
      const url = categoryFilter 
        ? `/api/events?category=${encodeURIComponent(categoryFilter)}` 
        : "/api/events";
      return fetch(url).then((res) => res.json());
    },
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then((res) => res.json()),
  });

  // Filter and sort events
  const filteredEvents = events
    .filter((event: any) => {
      return (
        searchQuery === "" ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a: any, b: any) => {
      if (sortBy === "date") {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      } else if (sortBy === "price") {
        return (a.price || 0) - (b.price || 0);
      } else {
        return 0;
      }
    });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search query
    const params = new URLSearchParams(window.location.search);
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  const handleCategoryChange = (value: string) => {
    // Treat "all" as empty for filtering
    const filterValue = value === "all" ? "" : value;
    setCategoryFilter(filterValue);
    
    // Update URL with category filter
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-4 md:mb-0">Browse Events</h1>
          
          <form onSubmit={handleSearch} className="w-full md:w-auto">
            <div className="flex space-x-2">
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search events..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit">Search</Button>
            </div>
          </form>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between mb-8">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Filter className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
            
            <Select value={categoryFilter || "all"} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: any) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date (Earliest)</SelectItem>
                <SelectItem value="price">Price (Lowest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Separator className="mb-8" />
        
        {isLoadingEvents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col animate-pulse">
                <div className="bg-gray-300 h-48 w-full"></div>
                <div className="p-6 flex-grow">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-full mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6 mb-8"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-300 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event: any) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                description={event.description}
                image={event.image}
                startDate={event.startDate}
                location={event.location}
                price={event.price || 59.99} // Default price if not available
                availableSpots={event.availableSpots}
                featuredStatus={event.featuredStatus}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search criteria or browse all events.</p>
            <Button onClick={() => {
              setSearchQuery("");
              setCategoryFilter("");
              window.history.replaceState({}, "", window.location.pathname);
            }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;
