import React, { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Link } from "wouter";
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
} from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, LoginCredentials } from "@shared/schema";
import { login } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LockKeyhole, User } from "lucide-react";

const Login: React.FC = () => {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if there's a redirect URL in the query string
  const searchParams = new URLSearchParams(search);
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Use the same schema from shared and extend it for form validation
  const formSchema = loginSchema;

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "You've been successfully logged in.",
      });
      navigate(redirectTo);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  async function onSubmit(data: LoginCredentials) {
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled in onError callback
      console.error("Login error:", error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img 
              src="https://srmap.edu.in/wp-content/uploads/2022/05/logo.png" 
              alt="SRM University AP" 
              className="h-24"
            />
          </div>
          
          <Card className="border-blue-900/10 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
              <CardTitle className="text-xl font-bold text-center">SRMAP Student Login</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Registration Number / Username</FormLabel>
                        <FormControl>
                          <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                            <div className="px-3 py-2 bg-gray-100 border-r border-gray-300 rounded-l-md">
                              <User size={20} className="text-gray-500" />
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
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Authenticating..." : "LOGIN"}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 bg-gray-50 rounded-b-lg p-4">
              <div className="text-sm text-center text-gray-600">
                New student?{" "}
                <Link href="/auth/register">
                  <a className="font-semibold text-blue-800 hover:text-blue-700">
                    Register here
                  </a>
                </Link>
              </div>
              <div className="text-xs text-center text-gray-500 mt-2">
                For any login issues, contact ITS Help Desk at its.helpdesk@srmap.edu.in
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Right side - Banner Image */}
      <div 
        className="hidden md:block md:w-1/2 bg-cover bg-center"
        style={{ 
          backgroundImage: `linear-gradient(rgba(0, 20, 60, 0.8), rgba(0, 20, 60, 0.8)), url('https://srmap.edu.in/wp-content/uploads/2022/06/Campus-Life.jpg')` 
        }}
      >
        <div className="h-full flex flex-col justify-center items-center px-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Welcome to SRMAP Event Portal</h2>
          <p className="text-xl mb-6 text-center">Discover and participate in campus events, workshops, and activities</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-center">
              <div className="text-3xl font-bold">50+</div>
              <div className="text-sm">Active Events</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-center">
              <div className="text-3xl font-bold">20+</div>
              <div className="text-sm">Student Clubs</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-center">
              <div className="text-3xl font-bold">8</div>
              <div className="text-sm">Schools</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-center">
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm">Faculty Members</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
