import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { insertTicketSchema } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CreditCard, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { isLoggedIn, getCurrentUser } from '@/lib/auth';
import { Event, InsertTicket } from '@shared/schema';

interface TicketBookingProps {
  event: Event;
}

// Extend the insertTicketSchema with validation
const ticketFormSchema = insertTicketSchema.extend({
  quantity: z.coerce.number().min(1, 'Minimum 1 ticket required').max(10, 'Maximum 10 tickets allowed'),
  // Add payment fields if needed
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

const TicketBooking: React.FC<TicketBookingProps> = ({ event }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentStep, setPaymentStep] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  // Check if user is logged in
  const loggedIn = isLoggedIn();
  const currentUser = getCurrentUser();
  
  // Create form
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      eventId: event.id,
      userId: currentUser?.id || 0,
      quantity: 1,
      totalAmount: event.ticketPrice,
    },
  });
  
  // Calculate total amount based on quantity
  const quantity = form.watch('quantity');
  const totalAmount = (Number(event.ticketPrice) * quantity).toString();
  
  // Update total amount when quantity changes
  React.useEffect(() => {
    form.setValue('totalAmount', totalAmount);
  }, [quantity, totalAmount, form]);

  const isMockRazorpay = true; // Using mock Razorpay for development
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (formData: TicketFormValues) => {
      return apiRequest('POST', '/api/payments/orders', {
        amount: Number(formData.totalAmount),
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
      });
    },
    onSuccess: async (response) => {
      const orderData = await response.json();
      if (orderData.id) {
        setPaymentId(orderData.id);
        setPaymentStep(true);
        handlePayment(orderData);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating order',
        description: error.message || 'Failed to create the order. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Book ticket mutation
  const bookTicketMutation = useMutation({
    mutationFn: async (data: InsertTicket) => {
      return apiRequest('POST', '/api/tickets', data);
    },
    onSuccess: async () => {
      toast({
        title: 'Booking successful!',
        description: 'Your ticket has been booked successfully.',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id] });
      
      // Navigate to tickets page
      navigate('/tickets');
    },
    onError: (error: any) => {
      toast({
        title: 'Booking failed',
        description: error.message || 'Failed to book the ticket. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle payment
  const handlePayment = (orderData: any) => {
    // Mock Razorpay integration for development
    if (isMockRazorpay) {
      simulateSuccessfulPayment(orderData);
      return;
    }
    
    // This would typically use the actual Razorpay SDK
    // Here we're just simulating a successful payment for development
    const options = {
      key: "mock_razorpay_key_id", // Would use real key in production
      amount: orderData.amount,
      currency: orderData.currency,
      name: "EventPulse",
      description: `Tickets for ${event.title}`,
      order_id: orderData.id,
      handler: function(response: any) {
        verifyPayment({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      prefill: {
        name: currentUser?.fullName || '',
        email: currentUser?.email || '',
        contact: currentUser?.phoneNumber || '',
      },
      theme: {
        color: "#3399cc",
      },
    };
    
    // In a real implementation, this would create a Razorpay checkout modal
    const rzp1 = new (window as any).Razorpay(options);
    rzp1.open();
  };
  
  // Simulate successful payment (for development)
  const simulateSuccessfulPayment = (orderData: any) => {
    setTimeout(() => {
      verifyPayment({
        razorpayPaymentId: `pay_${Date.now()}`,
        razorpayOrderId: orderData.id,
        razorpaySignature: 'mocked_signature',
      });
    }, 2000);
  };
  
  // Verify payment
  const verifyPayment = async (paymentDetails: any) => {
    try {
      const response = await apiRequest('POST', '/api/payments/verify', paymentDetails);
      
      if (response.ok) {
        const data = await response.json();
        
        // Create ticket
        const ticketData = form.getValues();
        bookTicketMutation.mutate({
          ...ticketData,
          status: 'valid',
        });
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      toast({
        title: 'Payment verification failed',
        description: error.message || 'Failed to verify payment. Please contact support.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: TicketFormValues) => {
    if (!loggedIn) {
      toast({
        title: 'Login required',
        description: 'Please login to continue with the booking.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    
    if (event.availableTickets < data.quantity) {
      toast({
        title: 'Not enough tickets',
        description: `Only ${event.availableTickets} tickets available.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Since we have mock Razorpay, we can either use the payment flow or directly create tickets
    if (isMockRazorpay) {
      // Directly create the ticket without the payment flow (simpler approach)
      bookTicketMutation.mutate({
        ...data,
        status: 'valid',
      });
    } else {
      // Proceed to payment flow (for real Razorpay integration)
      createOrderMutation.mutate(data);
    }
  };
  
  // Show login prompt if not logged in
  if (!loggedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Book Tickets</CardTitle>
          <CardDescription>Please login to book tickets for this event</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/login')} className="w-full">
            Login to Continue
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Show processing UI during payment step
  if (paymentStep) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Payment</CardTitle>
          <CardDescription>Please do not close this window</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          {isMockRazorpay && (
            <>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Development Mode</AlertTitle>
                <AlertDescription>
                  Using mock payment processing. In production, the Razorpay payment window would appear.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p>Simulating payment processing...</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Ticket booking form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Tickets</CardTitle>
        <CardDescription>Fill in the details to book your tickets</CardDescription>
      </CardHeader>
      <CardContent>
        {event.availableTickets === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sold Out</AlertTitle>
            <AlertDescription>
              Sorry, all tickets for this event have been sold out.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Tickets</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min={1}
                        max={Math.min(10, event.availableTickets)}
                      />
                    </FormControl>
                    <FormDescription>
                      {event.availableTickets} tickets available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="py-4">
                <div className="flex justify-between py-2">
                  <span>Price per ticket:</span>
                  <span>₹{Number(event.ticketPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span>Total Amount:</span>
                  <span>₹{Number(totalAmount).toLocaleString()}</span>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={
                  event.availableTickets === 0 ||
                  createOrderMutation.isPending ||
                  bookTicketMutation.isPending
                }
              >
                {bookTicketMutation.isPending || createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isMockRazorpay ? "Book Now" : "Proceed to Payment"}
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 items-start">
        {isMockRazorpay && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Mock Payment Mode</AlertTitle>
            <AlertDescription>
              Running in development mode with mock Razorpay integration.
            </AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
};

export default TicketBooking;