import React from "react";
import { Link } from "wouter";
import { 
  FacebookIcon, 
  TwitterIcon, 
  InstagramIcon, 
  LinkedinIcon 
} from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-heading font-bold mb-4">EventPulse</h3>
            <p className="text-gray-300 mb-4">
              The complete platform for event creation, management, and ticket sales with secure payment processing.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white">
                <FacebookIcon size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <TwitterIcon size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <InstagramIcon size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <LinkedinIcon size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Features</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Event Creation</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Ticket Management</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Payment Processing</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Analytics Dashboard</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Marketing Tools</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Developer API</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Documentation</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Guides & Tutorials</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Blog</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Support Center</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-white">About Us</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Careers</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Terms of Service</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white">Contact Us</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} EventPulse. All rights reserved.
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <div className="mr-4 text-gray-400 text-sm">Powered by</div>
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
