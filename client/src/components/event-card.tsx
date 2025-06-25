import React from "react";
import { Link } from "wouter";
import { Calendar, MapPin, Users, Award, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Event } from "@shared/schema";

// Support both interfaces for backward compatibility
interface EventCardProps {
  event?: Event;
  id?: number;
  title?: string;
  description?: string;
  image?: string;
  startDate?: string;
  location?: string;
  price?: number;
  availableSpots?: number;
  featuredStatus?: string;
}

const EventCard: React.FC<EventCardProps> = (props) => {
  // Handle both object formats
  const event = props.event;
  
  // Get properties either from event object or from direct props
  const id = event?.id || props.id;
  const title = event?.title || props.title;
  const description = event?.description || props.description;
  const imageUrl = event?.imageUrl || props.image;
  const startDate = event?.startDate || props.startDate;
  const location = event?.location || props.location;
  const ticketPrice = event?.ticketPrice || props.price;
  const availableTickets = event?.availableTickets || props.availableSpots;
  const isFeatured = event?.isFeatured || (props.featuredStatus === "FEATURED");
  
  const eventDate = new Date(startDate || new Date());
  const formattedDate = format(eventDate, "MMM d, yyyy • h:mm a");
  const relativeDate = formatDistanceToNow(eventDate, { addSuffix: true });
  const isUpcoming = eventDate > new Date();
  
  // Get badge type based on event properties specific to SRM University AP
  const getBadgeType = () => {
    // SRM University AP flagship events
    if (title && title.includes("SRM") && isFeatured) {
      return { color: "bg-blue-700", text: "SRM FLAGSHIP" };
    }
    
    // Department events specific to SRM University AP
    if (location && (location.includes("Dept") || location.includes("School of"))) {
      const deptName = location.includes("CSE") ? "CSE DEPT" :
                       location.includes("ECE") ? "ECE DEPT" :
                       location.includes("Mech") ? "MECH DEPT" :
                       location.includes("Liberal Arts") ? "LIBERAL ARTS" :
                       location.includes("Management") ? "MANAGEMENT" : "DEPARTMENT";
      return { color: "bg-blue-600", text: deptName };
    }
    
    // Next Tech Lab - SRM AP's popular student lab
    if (title && title.includes("Next Tech Lab")) {
      return { color: "bg-purple-700", text: "NEXT TECH LAB" };
    }
    
    // Club events at SRMAP
    if (title && (title.includes("Club") || title.includes("Society") || title.includes("IEDC"))) {
      return { color: "bg-green-600", text: "STUDENT CLUB" };
    }
    
    // SRMAP Technical workshops
    if (title && title.toLowerCase().includes("workshop")) {
      return { color: "bg-purple-600", text: "WORKSHOP" };
    }
    
    // Placement and career activities
    if (title && (title.includes("Placement") || title.includes("Career") || title.includes("Industry"))) {
      return { color: "bg-orange-600", text: "PLACEMENT" };
    }
    
    // Research symposiums
    if (title && (title.includes("Research") || title.includes("Symposium") || title.includes("Conference"))) {
      return { color: "bg-emerald-700", text: "RESEARCH" };
    }
    
    // Free events
    if (ticketPrice === 0) {
      return { color: "bg-teal-600", text: "FREE ENTRY" };
    }
    
    // Featured events
    if (props.featuredStatus) {
      return { color: "bg-primary-600", text: props.featuredStatus };
    }
    
    if (isFeatured) {
      return { color: "bg-primary-600", text: "FEATURED" };
    }
    
    // New events (created within last 3 days)
    if (isUpcoming && relativeDate.includes("in")) {
      return { color: "bg-secondary-600", text: "NEW" };
    }
    
    // Limited spots
    if (availableTickets && availableTickets < 20) {
      return { color: "bg-amber-500", text: "LIMITED SPOTS" };
    }
    
    return { color: "bg-gray-600", text: "OPEN" };
  };
  
  const badge = getBadgeType();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={imageUrl || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} 
          alt={title || "Event"} 
          className="w-full h-48 object-cover"
        />
        <div className={`absolute top-4 left-4 ${badge.color} text-white text-xs font-bold px-2 py-1 rounded`}>
          {badge.text}
        </div>
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {relativeDate}
        </div>
        {availableTickets !== undefined && (
          <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 text-gray-900 text-xs font-bold px-2 py-1 rounded-full flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {availableTickets < 10 ? `Only ${availableTickets} spots left!` : `${availableTickets} spots available`}
          </div>
        )}
      </div>
      
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <Calendar className="h-4 w-4 mr-2 text-primary-500" />
          <span>{formattedDate}</span>
        </div>
        
        <h3 className="font-heading font-semibold text-xl mb-2 text-gray-900">{title}</h3>
        
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <MapPin className="h-4 w-4 mr-2 text-primary-500" />
          <span>{location}</span>
        </div>
        
        {/* Duration indicator for workshops/sessions */}
        {title && title.toLowerCase().includes("workshop") && (
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <Clock className="h-4 w-4 mr-2 text-primary-500" />
            <span>3 hour session</span>
          </div>
        )}
        
        {/* Certificate/Credit indicator for academic events */}
        {title && (title.toLowerCase().includes("certificate") || title.toLowerCase().includes("credits")) && (
          <div className="flex items-center text-sm text-green-600 mb-4">
            <Award className="h-4 w-4 mr-2" />
            <span>Certificate provided</span>
          </div>
        )}
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {description}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <div>
            {ticketPrice === 0 || ticketPrice === "0" ? (
              <span className="font-bold text-green-600">Free Entry</span>
            ) : (
              <>
                <span className="font-bold text-gray-900">₹{
                  typeof ticketPrice === 'number' 
                    ? ticketPrice.toFixed(2) 
                    : typeof ticketPrice === 'string' 
                      ? ticketPrice 
                      : '0.00'
                }</span>
                <span className="text-sm text-gray-500 ml-1">per student</span>
              </>
            )}
          </div>
          
          <Link href={`/events/${id}`}>
            <div className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded transition-colors cursor-pointer">
              {ticketPrice === 0 || ticketPrice === "0" ? "Register Now" : "Book Ticket"}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
