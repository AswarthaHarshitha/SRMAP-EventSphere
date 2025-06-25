import React, { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertUserSchema } from "@shared/schema";
import { register } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { AtSign, GraduationCap, LockKeyhole, Phone, User } from "lucide-react";

const Register: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Use the schema from shared and extend it for form validation
  const formSchema = insertUserSchema.extend({
    confirmPassword: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

  type RegisterFormValues = z.infer<typeof formSchema>;

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "attendee",
      phoneNumber: "",
      profilePicUrl: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Your account has been created. Welcome to SRMAP Events!",
      });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = data;
      await registerMutation.mutateAsync(registerData);
    } catch (error) {
      // Error is handled in onError callback
      console.error("Registration error:", error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Info */}
      <div 
        className="hidden md:block md:w-1/3 bg-cover bg-center"
        style={{ 
          backgroundImage: `linear-gradient(rgba(0, 40, 90, 0.9), rgba(0, 40, 90, 0.9)), url('https://srmap.edu.in/wp-content/uploads/2023/02/Student-life-srmap.jpg')` 
        }}
      >
        <div className="h-full flex flex-col justify-center p-8 text-white">
          <div className="flex items-center mb-6">
            <img 
              src="https://srmap.edu.in/wp-content/uploads/2022/05/logo.png" 
              alt="SRM University AP" 
              className="h-12 mr-3 bg-white p-1 rounded"
            />
            <h2 className="text-xl font-bold">SRMAP</h2>
          </div>
          
          <h3 className="text-2xl font-bold mb-3">New Student Registration</h3>
          <p className="mb-8 text-gray-200">Create your SRMAP Events account to participate in university events and activities.</p>
          
          <div className="space-y-4">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h4 className="font-semibold mb-2">Why Register?</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-200">
                <li>Book tickets for university events</li>
                <li>Join technical workshops and seminars</li>
                <li>Participate in cultural festivals</li>
                <li>Create and manage club events</li>
              </ul>
            </div>
            
            <div className="flex justify-center mt-6">
              <Link href="/auth/login">
                <a className="text-blue-200 hover:text-white text-sm underline">
                  Already have an account? Login here
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Registration Form */}
      <div className="w-full md:w-2/3 bg-white p-6 md:p-12 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="md:hidden flex justify-center mb-6">
            <img 
              src="https://srmap.edu.in/wp-content/uploads/2022/05/logo.png" 
              alt="SRM University AP" 
              className="h-20"
            />
          </div>
          
          <Card className="border-blue-900/10 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
              <CardTitle className="text-xl font-bold text-center">SRMAP Student Registration</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Full Name</FormLabel>
                          <FormControl>
                            <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                              <div className="px-3 py-2 bg-gray-100 border-r border-gray-300 rounded-l-md">
                                <User size={20} className="text-gray-500" />
                              </div>
                              <Input 
                                placeholder="John Doe" 
                                {...field} 
                                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Registration Number</FormLabel>
                          <FormControl>
                            <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                              <div className="px-3 py-2 bg-gray-100 border-r border-gray-300 rounded-l-md">
                                <GraduationCap size={20} className="text-gray-500" />
                              </div>
                              <Input 
                                placeholder="AP21110010XXX" 
                                {...field} 
                                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Email Address</FormLabel>
                        <FormControl>
                          <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                            <div className="px-3 py-2 bg-gray-100 border-r border-gray-300 rounded-l-md">
                              <AtSign size={20} className="text-gray-500" />
                            </div>
                            <Input
                              type="email"
                              placeholder="student@srmap.edu.in"
                              {...field}
                              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Password</FormLabel>
                          <FormControl>
                            <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                              <div className="px-3 py-2 bg-gray-100 border-r border-gray-300 rounded-l-md">
                                <LockKeyhole size={20} className="text-gray-500" />
                              </div>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                              <div className="px-3 py-2 bg-gray-100 border-r border-gray-300 rounded-l-md">
                                <LockKeyhole size={20} className="text-gray-500" />
                              </div>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Mobile Number</FormLabel>
                          <FormControl>
                            <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                              <div className="px-3 py-2 bg-gray-100 border-r border-gray-300 rounded-l-md">
                                <Phone size={20} className="text-gray-500" />
                              </div>
                              <Input 
                                placeholder="+91 9876543210" 
                                {...field} 
                                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-gray-300">
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="attendee">Student</SelectItem>
                              <SelectItem value="organizer">Club Representative</SelectItem>
                              <SelectItem value="faculty">Faculty Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Select "Club Representative" if you represent a student club or department.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2" 
                      disabled={isLoading}
                    >
                      {isLoading ? "PROCESSING..." : "REGISTER ACCOUNT"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 bg-gray-50 rounded-b-lg p-4">
              <div className="text-sm text-center text-gray-600 md:hidden">
                Already have an account?{" "}
                <Link href="/auth/login">
                  <a className="font-semibold text-blue-800 hover:text-blue-700">
                    Login here
                  </a>
                </Link>
              </div>
              <div className="text-xs text-center text-gray-500 mt-2">
                By registering, you agree to SRMAP's terms of service and privacy policy.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
