import { Link } from "wouter";
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Mail,
  PhoneCall,
  MapPin,
  ExternalLink
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="https://srmap.edu.in/wp-content/uploads/2022/05/logo.png" 
                alt="SRM University AP" 
                className="h-12 mr-3 bg-white p-1 rounded"
              />
              <h3 className="text-xl font-heading font-bold">SRMAP Events</h3>
            </div>
            <p className="text-gray-300 mb-4">The official event management platform for SRM University AP. Discover and participate in academic, technical, cultural, and sports events.</p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/srmuapandhra" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                <Facebook size={18} />
              </a>
              <a href="https://twitter.com/srmap_official" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                <Twitter size={18} />
              </a>
              <a href="https://www.instagram.com/srmap_official" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                <Instagram size={18} />
              </a>
              <a href="https://www.linkedin.com/school/srmap" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">University Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://srmap.edu.in" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white flex items-center">
                  <ExternalLink size={14} className="mr-2" />
                  Main Website
                </a>
              </li>
              <li>
                <a href="https://srmap.edu.in/academics" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white flex items-center">
                  <ExternalLink size={14} className="mr-2" />
                  Academic Programs
                </a>
              </li>
              <li>
                <a href="https://srmap.edu.in/admissions" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white flex items-center">
                  <ExternalLink size={14} className="mr-2" />
                  Admissions
                </a>
              </li>
              <li>
                <a href="https://srmap.edu.in/research" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white flex items-center">
                  <ExternalLink size={14} className="mr-2" />
                  Research
                </a>
              </li>
              <li>
                <a href="https://srmap.edu.in/clubs-societies" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white flex items-center">
                  <ExternalLink size={14} className="mr-2" />
                  Clubs & Societies
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Platform Features</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/events/create">
                  <a className="text-gray-300 hover:text-white">Create Campus Events</a>
                </Link>
              </li>
              <li>
                <Link href="/dashboard">
                  <a className="text-gray-300 hover:text-white">Event Analytics</a>
                </Link>
              </li>
              <li>
                <Link href="/tickets">
                  <a className="text-gray-300 hover:text-white">My Tickets</a>
                </Link>
              </li>
              <li>
                <Link href="/events">
                  <a className="text-gray-300 hover:text-white">Browse All Events</a>
                </Link>
              </li>
              <li>
                <Link href="/organizer/events">
                  <a className="text-gray-300 hover:text-white">Organizer Dashboard</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Contact Information</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin size={18} className="text-gray-400 mr-2 mt-1 flex-shrink-0" />
                <span className="text-gray-300">
                  SRM University - AP, Andhra Pradesh<br />
                  Neerukonda, Mangalagiri Mandal<br />
                  Guntur District, Andhra Pradesh, 522240
                </span>
              </li>
              <li className="flex items-center">
                <PhoneCall size={18} className="text-gray-400 mr-2 flex-shrink-0" />
                <a href="tel:+918632116000" className="text-gray-300 hover:text-white">+91 863 2116000</a>
              </li>
              <li className="flex items-center">
                <Mail size={18} className="text-gray-400 mr-2 flex-shrink-0" />
                <a href="mailto:info@srmap.edu.in" className="text-gray-300 hover:text-white">info@srmap.edu.in</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-blue-700 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} SRM University AP. All rights reserved.
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <div className="mr-4 text-gray-400 text-sm">Payments secured by</div>
            <img 
              src="https://razorpay.com/build/browser/static/razorpay-logo-white.5cdb58df.svg" 
              alt="Razorpay" 
              className="h-5"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
