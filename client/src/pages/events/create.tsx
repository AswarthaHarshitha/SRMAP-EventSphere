import React, { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  Clock,
  Upload,
  Info,
  MapPin,
  Tag,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertEventSchema, Event, Category } from "@shared/schema";
import { format } from "date-fns";

const CreateEventPage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Create custom schema for the form with extended validation
  const formSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    imageUrl: z.string().url("Please enter a valid URL").optional(),
    location: z.string().min(5, "Location must be at least 5 characters"),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date",
    }),
    startTime: z.string(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date",
    }),
    endTime: z.string(),
    category: z.string(),
    totalTickets: z.coerce.number().min(1, "Must have at least 1 ticket"),
    ticketPrice: z.coerce.number().min(0, "Price cannot be negative"),
    isFeatured: z.boolean().default(false),
  }).refine(
    (data) => {
      const start = new Date(`${data.startDate}T${data.startTime}`);
      const end = new Date(`${data.endDate}T${data.endTime}`);
      return start < end;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      location: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "18:00",
      endDate: format(new Date(), "yyyy-MM-dd"),
      endTime: "21:00",
      category: "",
      totalTickets: 100,
      ticketPrice: 0,
      isFeatured: false,
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: Omit<Event, "id" | "availableTickets" | "status" | "organizerId">) => {
      const res = await apiRequest("POST", "/api/events", {
        ...data,
        availableTickets: data.totalTickets,
        status: "active",
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event created",
        description: "Your event has been created successfully!",
      });
      navigate(`/events/${data.event.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create event",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    // Combine date and time fields
    const startDate = new Date(`${values.startDate}T${values.startTime}`);
    const endDate = new Date(`${values.endDate}T${values.endTime}`);

    // Prepare data for submission
    const eventData = {
      title: values.title,
      description: values.description,
      imageUrl: values.imageUrl || undefined,
      location: values.location,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      category: values.category,
      totalTickets: values.totalTickets,
      availableTickets: values.totalTickets,
      ticketPrice: values.ticketPrice,
      isFeatured: values.isFeatured,
      status: "active",
    };

    createEventMutation.mutate(eventData);
  };

  const nextStep = () => {
    const fieldsToValidate: Record<number, string[]> = {
      1: ["title", "description", "imageUrl"],
      2: ["location", "startDate", "startTime", "endDate", "endTime", "category"],
      3: ["totalTickets", "ticketPrice"],
    };

    form.trigger(fieldsToValidate[step] as any).then((isValid) => {
      if (isValid) {
        setStep((prev) => Math.min(prev + 1, totalSteps));
      }
    });
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Create a New Event</h1>
        <p className="text-gray-500 text-center mb-8">
          Fill in the details below to create and publish your event
        </p>

        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex flex-col items-center justify-center ${
                  step === stepNumber
                    ? "text-primary-600"
                    : stepNumber < step
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                    step === stepNumber
                      ? "border-primary-600 bg-primary-50"
                      : stepNumber < step
                      ? "border-green-600 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  } mb-2`}
                >
                  {stepNumber < step ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                <span className="text-sm font-medium">
                  {stepNumber === 1
                    ? "Basic Info"
                    : stepNumber === 2
                    ? "Date & Location"
                    : "Tickets & Settings"}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 h-1 mt-4 rounded-full">
            <div
              className="bg-primary-600 h-1 rounded-full transition-all"
              style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1
                ? "Event Details"
                : step === 2
                ? "Date & Location"
                : "Tickets & Pricing"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "Provide basic information about your event"
                : step === 2
                ? "Set when and where your event will take place"
                : "Configure ticket options and pricing"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Summer Music Festival 2023" {...field} />
                          </FormControl>
                          <FormDescription>
                            Choose a clear, descriptive title for your event.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your event, what attendees can expect, etc."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide a detailed description to attract attendees.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Image URL</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <Input
                                placeholder="e.g. https://example.com/event-image.jpg"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Provide a URL for your event's featured image. Recommended size: 1200x600px.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Location</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <MapPin className="mr-2 h-4 w-4 text-gray-500 mt-3" />
                              <Input placeholder="e.g. Central Park, New York City" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Enter the physical location or venue for your event.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 mt-3" />
                                  <Input type="date" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <Clock className="mr-2 h-4 w-4 text-gray-500 mt-3" />
                                  <Input type="time" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 mt-3" />
                                  <Input type="date" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <Clock className="mr-2 h-4 w-4 text-gray-500 mt-3" />
                                  <Input type="time" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the category that best describes your event.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="totalTickets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Tickets</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <Users className="mr-2 h-4 w-4 text-gray-500 mt-3" />
                                <Input type="number" min="1" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Maximum number of tickets available for sale.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ticketPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticket Price (₹)</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <Tag className="mr-2 h-4 w-4 text-gray-500 mt-3" />
                                <Input type="number" min="0" step="0.01" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Set to 0 for free events.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <FormField
                      control={form.control}
                      name="isFeatured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Featured Event</FormLabel>
                            <FormDescription>
                              Featured events appear prominently on the homepage.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center p-4 mt-4 text-sm text-blue-800 rounded-lg bg-blue-50">
                      <Info className="flex-shrink-0 inline w-4 h-4 mr-3" />
                      <span>
                        By creating this event, you agree to our terms of service and privacy policy.
                      </span>
                    </div>
                  </>
                )}
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
            >
              Back
            </Button>
            
            {step === totalSteps ? (
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? "Creating Event..." : "Create Event"}
              </Button>
            ) : (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CreateEventPage;
