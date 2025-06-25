import React, { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Calendar, Clock, MapPin, CreditCard, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Event } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders, getCurrentUser } from "@/lib/auth";

// Define form schema
const checkoutSchema = z.object({
  quantity: z.string().min(1, "Please select quantity")
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: {
    eventId: string;
    ticketId: string;
  };
  theme: {
    color: string;
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CheckoutPage: React.FC = () => {
  const [matched, params] = useRoute("/checkout/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const eventId = matched ? parseInt(params.id) : null;
  const search = window.location.search;
  const searchParams = new URLSearchParams(search);
  const quantityParam = searchParams.get("quantity") || "1";
  
  const currentUser = getCurrentUser();
  
  // Form setup
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      quantity: quantityParam
    }
  });
  
  // Fetch event details
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: { eventId: number; quantity: number }) => {
      const response = await apiRequest(
        "POST",
        "/api/payments/create-order",
        data
      );
      return response.json();
    }
  });

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (data: {
      razorpayPaymentId: string;
      razorpayOrderId: string;
      razorpaySignature: string;
      ticketId: number;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/payments/verify",
        data
      );
      return response.json();
    },
    onSuccess: () => {
      navigate("/checkout/success");
    },
    onError: (error: any) => {
      toast({
        title: "Payment verification failed",
        description: error.message || "There was an issue verifying your payment.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!event || !currentUser) return;
    
    setIsProcessing(true);
    
    try {
      // Create order
      const orderResponse = await createOrderMutation.mutateAsync({
        eventId: event.id,
        quantity: parseInt(values.quantity)
      });
      
      if (!orderResponse.order || !orderResponse.ticketId) {
        throw new Error("Failed to create order");
      }
      
      // Initialize Razorpay
      const options: RazorpayOptions = {
        key: orderResponse.key,
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        name: "EventPulse",
        description: `Tickets for ${event.title}`,
        order_id: orderResponse.order.id,
        prefill: {
          name: currentUser.fullName,
          email: currentUser.email,
          contact: currentUser.phoneNumber || ""
        },
        notes: {
          eventId: event.id.toString(),
          ticketId: orderResponse.ticketId.toString()
        },
        theme: {
          color: "#6366F1"
        }
      };
      
      const rzp = new window.Razorpay(options);
      
      rzp.on("payment.success", (response: any) => {
        verifyPaymentMutation.mutate({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
          ticketId: orderResponse.ticketId
        });
      });
      
      rzp.on("payment.failed", (response: any) => {
        toast({
          title: "Payment failed",
          description: response.error.description || "Your payment was not successful. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      });
      
      rzp.open();
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error.message || "An error occurred during checkout. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "MMMM d, yyyy");
  };

  const formatTime = (date: string) => {
    return format(new Date(date), "h:mm a");
  };

  if (eventError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
              <CardDescription>Failed to load event details</CardDescription>
            </CardHeader>
            <CardContent>
              <p>There was an error loading the event information. Please try again.</p>
            </CardContent>
            <CardFooter>
              <Link href="/events">
                <Button>Browse Events</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link href={eventId ? `/events/${eventId}` : "/events"}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent>
                {eventLoading ? (
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                    <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  </div>
                ) : event ? (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">{event.title}</h2>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-5 w-5 mr-2 text-gray-500" />
                        <span>{formatTime(event.startDate)} - {formatTime(event.endDate)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ticket Quantity</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isProcessing}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select quantity" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from(
                                    { length: Math.min(10, event.availableTickets) },
                                    (_, i) => (
                                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {i + 1} {i === 0 ? "ticket" : "tickets"}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </div>
                ) : (
                  <p>Event not found</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {eventLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ) : event ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price per ticket</span>
                      <span>₹{event.ticketPrice.toString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity</span>
                      <span>{form.watch("quantity")}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>₹{(
                          Number(event.ticketPrice) * parseInt(form.watch("quantity"))
                        ).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="flex-col space-y-4">
                <Button
                  className="w-full"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={eventLoading || isProcessing || !event || event.availableTickets === 0}
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : event && event.availableTickets === 0 ? (
                    "Sold Out"
                  ) : (
                    <span className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Securely
                    </span>
                  )}
                </Button>
                
                <div className="text-xs text-center text-gray-500 flex items-center justify-center">
                  <Shield className="h-3 w-3 mr-1" />
                  <span>Secured by Razorpay with 256-bit encryption</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
