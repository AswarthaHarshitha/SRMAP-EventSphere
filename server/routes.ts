import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertEventSchema, 
  insertTicketSchema,
  insertPaymentSchema,
  loginSchema, 
  createOrderSchema, 
  verifyPaymentSchema
} from "@shared/schema";
import { 
  generateToken, 
  hashPassword, 
  verifyPassword, 
  authenticateJWT, 
  authorizeRoles,
  isEventOrganizer
} from "./auth";
import { 
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  isUsingMockRazorpay
} from "./razorpay";
import * as emailService from "./email";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Error handling middleware for Zod validation errors
  const handleZodError = (error: any, res: Response) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  };

  // ==================== AUTH ROUTES ====================

  // Register a new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create the user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Send welcome email
      emailService.sendWelcomeEmail(user)
        .catch(err => console.error('Failed to send welcome email:', err));
      
      // Return user data without password and token
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ 
        message: "User registered successfully",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      // Find user by username
      const user = await storage.getUserByUsername(credentials.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Verify password
      const isPasswordValid = await verifyPassword(credentials.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return user data without password and token
      const { password, ...userWithoutPassword } = user;
      res.status(200).json({
        message: "Login successful",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateJWT, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update user profile
  app.put("/api/auth/profile", authenticateJWT, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive fields from update data
      const { password, role, ...updateData } = req.body;
      
      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return updated user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.status(200).json({
        message: "Profile updated successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== EVENT ROUTES ====================

  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get featured events
  app.get("/api/events/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await storage.getFeaturedEvents(limit);
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get events by category
  app.get("/api/events/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const events = await storage.getEventsByCategory(category);
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create new event
  app.post("/api/events", authenticateJWT, authorizeRoles("admin", "organizer"), async (req, res) => {
    try {
      const userId = req.userId!;
      const eventData = insertEventSchema.parse({
        ...req.body,
        organizerId: userId
      });
      
      const event = await storage.createEvent(eventData);
      
      res.status(201).json({
        message: "Event created successfully",
        event
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update event
  app.put("/api/events/:id", authenticateJWT, isEventOrganizer, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Do not allow updating organizerId
      const { organizerId, ...updateData } = req.body;
      
      const updatedEvent = await storage.updateEvent(eventId, updateData);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(200).json({
        message: "Event updated successfully",
        event: updatedEvent
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete event
  app.delete("/api/events/:id", authenticateJWT, isEventOrganizer, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const deleted = await storage.deleteEvent(eventId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get events created by the authenticated user
  app.get("/api/organizer/events", authenticateJWT, authorizeRoles("admin", "organizer"), async (req, res) => {
    try {
      const userId = req.userId!;
      const events = await storage.getEventsByOrganizer(userId);
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== TICKET ROUTES ====================

  // Create a ticket for an event
  app.post("/api/tickets", authenticateJWT, async (req, res) => {
    try {
      const userId = req.userId!;
      const ticketData = insertTicketSchema.parse(req.body);
      
      // Check if event exists
      const event = await storage.getEvent(ticketData.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if there are available tickets
      if (event.availableTickets < ticketData.quantity) {
        return res.status(400).json({ 
          message: `Not enough tickets available. Only ${event.availableTickets} left.` 
        });
      }
      
      // Create a ticket
      const ticket = await storage.createTicket({
        ...ticketData,
        userId
      });
      
      // Update event available tickets
      await storage.updateEvent(event.id, {
        availableTickets: event.availableTickets - ticketData.quantity
      });
      
      // Try to send ticket confirmation email
      try {
        const user = await storage.getUser(userId);
        if (user) {
          await emailService.sendTicketConfirmationEmail({
            user,
            event,
            ticket
          });
          
          // If event has an organizer, notify them too
          const organizer = await storage.getUser(event.organizerId);
          if (organizer) {
            await emailService.sendOrganizerTicketNotification({
              organizer,
              event, 
              ticket,
              attendee: user
            });
          }
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the request if email fails
      }
      
      // Create a payment record if using mock Razorpay
      if (isUsingMockRazorpay) {
        try {
          // Create a mock payment for the ticket
          await storage.createPayment({
            userId,
            ticketId: ticket.id,
            razorpayPaymentId: `mock_pay_${Date.now()}`,
            razorpayOrderId: `mock_order_${Date.now()}`,
            amount: ticketData.totalAmount.toString(),
            status: "captured"
          });
        } catch (paymentError) {
          console.error("Failed to create mock payment record:", paymentError);
          // Don't fail the request if payment record creation fails
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Get tickets for authenticated user
  app.get("/api/tickets", authenticateJWT, async (req, res) => {
    try {
      const userId = req.userId!;
      const tickets = await storage.getTicketsByUser(userId);
      
      // Get event details for each ticket
      const ticketsWithEvent = await Promise.all(
        tickets.map(async ticket => {
          const event = await storage.getEvent(ticket.eventId);
          return { ...ticket, event };
        })
      );
      
      res.status(200).json(ticketsWithEvent);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get tickets for a specific event (for organizers)
  app.get("/api/events/:id/tickets", authenticateJWT, isEventOrganizer, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const tickets = await storage.getTicketsByEvent(eventId);
      
      // Get user details for each ticket
      const ticketsWithUser = await Promise.all(
        tickets.map(async ticket => {
          const user = await storage.getUser(ticket.userId);
          if (user) {
            const { password, ...userWithoutPassword } = user;
            return { ...ticket, user: userWithoutPassword };
          }
          return ticket;
        })
      );
      
      res.status(200).json(ticketsWithUser);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== PAYMENT ROUTES ====================

  // Create Razorpay order
  app.post("/api/payments/orders", authenticateJWT, async (req, res) => {
    try {
      const userId = req.userId!;
      const createOrderData = createOrderSchema.parse(req.body);
      
      // Create a Razorpay order
      try {
        const order = await createOrder({
          amount: createOrderData.amount,
          currency: createOrderData.currency || "INR",
          receipt: createOrderData.receipt || `receipt_${Date.now()}`
        });
      
        // Order created successfully
        return res.status(200).json({
          message: "Order created successfully",
          id: order.id,
          amount: createOrderData.amount,
          currency: createOrderData.currency || "INR"
        });
      } catch (error) {
        console.error('Order creation error:', error);
        return res.status(500).json({ message: "Failed to create payment order" });
      }
      
      // Removed duplicate response code
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Verify Razorpay payment
  app.post("/api/payments/verify", authenticateJWT, async (req, res) => {
    try {
      const userId = req.userId!;
      const verifyData = verifyPaymentSchema.parse(req.body);
      
      // Verify payment signature
      const isVerified = verifyPaymentSignature({
        orderId: verifyData.razorpayOrderId,
        paymentId: verifyData.razorpayPaymentId,
        signature: verifyData.razorpaySignature
      });
      
      if (!isVerified) {
        return res.status(400).json({ message: "Payment verification failed" });
      }
      
      // Create payment record
      const payment = await storage.createPayment({
        userId,
        razorpayPaymentId: verifyData.razorpayPaymentId,
        razorpayOrderId: verifyData.razorpayOrderId,
        amount: "1000", // Mock amount for demonstration
        status: "captured",
        ticketId: null
      });
      
      res.status(200).json({
        message: "Payment verified successfully",
        success: true
      });
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Get payment history for authenticated user
  app.get("/api/payments/history", authenticateJWT, async (req, res) => {
    try {
      const userId = req.userId!;
      const payments = await storage.getPaymentsByUser(userId);
      
      // Get ticket and event details for each payment
      const paymentDetails = await Promise.all(
        payments.map(async payment => {
          let ticket = null;
          let event = null;
          
          if (payment.ticketId) {
            ticket = await storage.getTicket(payment.ticketId);
            if (ticket) {
              event = await storage.getEvent(ticket.eventId);
            }
          }
          
          return { ...payment, ticket, event };
        })
      );
      
      res.status(200).json(paymentDetails);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== CATEGORY ROUTES ====================

  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== DASHBOARD ROUTES ====================

  // Get dashboard stats for admin/organizer
  app.get("/api/dashboard/stats", authenticateJWT, authorizeRoles("admin", "organizer"), async (req, res) => {
    try {
      const userId = req.userId!;
      
      // Get organizer's events
      const events = await storage.getEventsByOrganizer(userId);
      
      let totalSales = 0;
      let totalTicketsSold = 0;
      let eventStats = [];
      
      // Calculate stats for each event
      for (const event of events) {
        const tickets = await storage.getTicketsByEvent(event.id);
        
        const eventSold = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
        const eventRevenue = tickets.reduce((sum, ticket) => sum + parseFloat(ticket.totalAmount.toString()), 0);
        
        totalTicketsSold += eventSold;
        totalSales += eventRevenue;
        
        eventStats.push({
          id: event.id,
          title: event.title,
          sold: eventSold,
          total: event.totalTickets,
          revenue: eventRevenue
        });
      }
      
      res.status(200).json({
        totalEvents: events.length,
        activeEvents: events.filter(e => e.status === 'active').length,
        totalSales,
        totalTicketsSold,
        eventStats
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==================== DEBUG/TESTING ROUTES ====================
  
  if (emailService.isUsingMockEmail) {
    // These routes are only available when using mock email (for testing)
    
    // Get all mock emails
    app.get("/api/debug/emails", async (req, res) => {
      try {
        const emails = emailService.getMockEmails();
        res.status(200).json(emails);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });
    
    // Clear mock emails 
    app.post("/api/debug/emails/clear", async (req, res) => {
      try {
        const result = emailService.clearMockEmails();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });
    
    // Send test email
    app.post("/api/debug/emails/send-test", async (req, res) => {
      try {
        const { to, subject, html } = req.body;
        
        if (!to || !subject) {
          return res.status(400).json({ message: "Missing required fields: to, subject" });
        }
        
        const result = await emailService.sendEmail({
          to,
          subject: subject || "Test Email",
          html: html || "<p>This is a test email sent from the EventPulse application.</p>"
        });
        
        res.status(200).json({
          message: "Test email sent successfully",
          result
        });
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });
  }

  return httpServer;
}
