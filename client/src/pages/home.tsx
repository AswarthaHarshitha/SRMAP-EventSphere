import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Sliders, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/event-card";
import CategoryCard from "@/components/category-card";
import { Event, Category } from "@shared/schema";

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch featured events
  const { data: featuredEvents, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/featured?limit=3"],
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/events?search=${encodeURIComponent(searchQuery)}`;
  };

  return (
    <>
      {/* Hero Banner with SRM University background */}
      <div 
        className="relative py-12 px-4 sm:px-6 lg:px-8 text-white" 
        style={{
          backgroundImage: "url('https://srmap.edu.in/wp-content/uploads/2022/04/campus2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-red-800/80"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center mb-6">
            <img 
              src="https://srmap.edu.in/wp-content/uploads/2022/05/logo.png" 
              alt="SRM AP University" 
              className="h-24 mr-4 mb-4 md:mb-0 bg-white p-1 rounded"
            />
            <div>
              <h1 className="font-heading text-4xl font-bold mb-2">Campus Events Portal</h1>
              <p className="text-lg">Your one-stop platform for all SRM University AP activities</p>
            </div>
          </div>
          
          {/* Quick links */}
          <div className="flex flex-wrap gap-3 mb-8">
            <a href="/events?category=Technical%20Workshop" className="bg-blue-600/70 hover:bg-blue-700/90 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              Tech Workshops
            </a>
            <a href="/events?category=Department%20Seminar" className="bg-green-600/70 hover:bg-green-700/90 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              Dept. Seminars
            </a>
            <a href="/events?category=Club%20Event" className="bg-purple-600/70 hover:bg-purple-700/90 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              Club Activities
            </a>
            <a href="/events?category=Guest%20Lecture" className="bg-yellow-600/70 hover:bg-yellow-700/90 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              Guest Lectures
            </a>
            <a href="/events?category=Sports%20Tournament" className="bg-red-600/70 hover:bg-red-700/90 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              Sports
            </a>
            <a href="/events?price=0" className="bg-teal-600/70 hover:bg-teal-700/90 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              Free Events
            </a>
          </div>
          
          {/* Announcement banner */}
          <div className="bg-yellow-500/30 border border-yellow-400/50 rounded-lg p-3 mb-6 flex items-start">
            <div className="bg-yellow-500 rounded-full p-1 mr-3 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Important: SRM Hackathon 2023 registration closes in 2 days! Don't miss out on ₹50,000 prize money.</p>
            </div>
          </div>
          
          <p className="text-lg mb-6 max-w-3xl">Discover and register for academic, technical, cultural, and sports events happening across SRM University AP campus.</p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow max-w-3xl relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search by event name, department, or venue..."
                className="pl-10 pr-12 border-transparent rounded-md text-gray-900 w-full py-6"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Sliders className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <Button 
              type="submit" 
              className="px-6 py-6 text-primary-600 bg-white hover:bg-gray-50 font-medium"
            >
              Find Events
            </Button>
          </form>
        </div>
      </div>

      {/* Featured Events */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-heading font-bold text-gray-900">Featured Events</h2>
            <Link href="/events">
              <div className="text-primary-600 hover:text-primary-700 font-medium flex items-center cursor-pointer">
                View all 
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-64 animate-pulse">
                  <div className="bg-gray-200 h-48 w-full"></div>
                  <div className="p-6 flex-grow">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featuredEvents?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-heading font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
          
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6 text-center animate-pulse">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-gray-200 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories?.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* App Showcase */}
      <section className="py-16 relative text-white overflow-hidden">
        <div 
          className="absolute inset-0 z-0" 
          style={{
            backgroundImage: "linear-gradient(rgba(0,77,155,0.85), rgba(164,31,52,0.85))",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        ></div>
        <div className="absolute inset-0 z-0" style={{ opacity: 0.2, backgroundImage: "url('/assets/srmap/photos/campus.jpg')", backgroundSize: "cover" }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <div className="mx-auto w-40 h-auto mb-4">
              <img src="/assets/srmap/photos/logo.png" alt="SRM AP" className="w-full h-full object-contain bg-white p-2 rounded" />
            </div>
            <h2 className="text-3xl font-heading font-bold mb-4">SRM University AP Event Management</h2>
            <p className="text-xl max-w-3xl mx-auto">Your platform for academic, cultural, and technical events at SRM University AP</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-heading font-bold mb-6">Create and manage university events with ease</h2>
              <p className="text-lg mb-8">Our powerful platform provides all the tools you need to create, promote, and manage successful events across the campus.</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 mr-3" />
                  <span>Technical and non-technical event management</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 mr-3" />
                  <span>Secure payment processing with Razorpay</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 mr-3" />
                  <span>Student and faculty attendance tracking</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 mr-3" />
                  <span>Real-time analytics and participation reports</span>
                </li>
              </ul>
              <Link href="/events/create">
                <Button className="bg-white text-primary-700 hover:bg-gray-100 px-6 py-3">
                  Start Creating Campus Events
                </Button>
              </Link>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur-sm p-6 shadow-xl border border-white/20">
              <h3 className="text-xl font-semibold mb-4">Popular Event Categories at SRM AP</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <div className="bg-blue-500 h-10 w-10 rounded-full flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Technical Workshops</div>
                    <div className="text-sm text-gray-200">Coding, AI/ML, Robotics</div>
                  </div>
                </li>
                <li className="flex items-center">
                  <div className="bg-green-500 h-10 w-10 rounded-full flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Cultural Events</div>
                    <div className="text-sm text-gray-200">Dance, Music, Art</div>
                  </div>
                </li>
                <li className="flex items-center">
                  <div className="bg-purple-500 h-10 w-10 rounded-full flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Conferences</div>
                    <div className="text-sm text-gray-200">Research, Industry, Academic</div>
                  </div>
                </li>
                <li className="flex items-center">
                  <div className="bg-red-500 h-10 w-10 rounded-full flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Sports & Athletics</div>
                    <div className="text-sm text-gray-200">Tournaments, Competitions</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Create Event Section */}
      <section className="py-12 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Host Your SRM University AP Event</h2>
            <p className="max-w-3xl mx-auto text-gray-600">It's easy to get started. Follow these simple steps to create and publish your campus event.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 text-blue-600 h-14 w-14 flex items-center justify-center rounded-full mb-4">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Register Account</h3>
              <p className="text-gray-600">Create your organizer account with your university email ID.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 text-blue-600 h-14 w-14 flex items-center justify-center rounded-full mb-4">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Create Campus Event</h3>
              <p className="text-gray-600">Define your event details, schedule, venue, and department affiliation.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 text-blue-600 h-14 w-14 flex items-center justify-center rounded-full mb-4">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Registrations</h3>
              <p className="text-gray-600">Set up free or paid registration options for students and faculty.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 text-blue-600 h-14 w-14 flex items-center justify-center rounded-full mb-4">
                <span className="text-xl font-bold">4</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Track Participation</h3>
              <p className="text-gray-600">Monitor attendance and generate reports for department records.</p>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/auth/register">
              <div className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-md shadow-md transition-colors cursor-pointer">
                Register as Event Organizer
              </div>
            </Link>
            <p className="mt-4 text-sm text-gray-500">Available for all SRM University departments and student clubs.</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
