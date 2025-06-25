import React from "react";
import { Link } from "wouter";
import { CheckCircle, Ticket, Calendar, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const CheckoutSuccessPage: React.FC = () => {
  // Simple share function
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "I'm attending an event!",
          text: "I just booked tickets for an event. Would you like to join?",
          url: window.location.origin + "/events",
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      alert("Share is not supported on this browser");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. Your tickets have been confirmed.
        </p>
        
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center mb-4">
              <Ticket className="h-6 w-6 mr-2 text-primary-600" />
              <h2 className="text-xl font-semibold">Ticket Confirmed</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              We've sent a confirmation email with your ticket details. You can also access your tickets from your dashboard.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-100 text-sm mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Order Reference</span>
                <span className="font-medium">#{Math.floor(Math.random() * 10000000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Purchase Date</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Added to your calendar</span>
            </div>
          </CardContent>
          <CardFooter className="border-t p-6 flex flex-col space-y-3">
            <Button className="w-full flex items-center justify-center">
              <Download className="mr-2 h-4 w-4" />
              Download Tickets
            </Button>
            
            <Button variant="outline" className="w-full flex items-center justify-center" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share With Friends
            </Button>
          </CardFooter>
        </Card>
        
        <div className="flex space-x-4 justify-center">
          <Link href="/dashboard/tickets">
            <Button variant="outline">View My Tickets</Button>
          </Link>
          <Link href="/events">
            <Button>Browse More Events</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
