import {
  type User, type Event, type Ticket, type Payment, type Category,
  type InsertUser, type InsertEvent, type InsertTicket, type InsertPayment, type InsertCategory
} from "@shared/schema";
import { MongoStorage } from './mongodb-storage';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getFeaturedEvents(limit?: number): Promise<Event[]>;
  getEventsByCategory(category: string): Promise<Event[]>;
  getEventsByOrganizer(organizerId: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Ticket operations
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketsByUser(userId: number): Promise<Ticket[]>;
  getTicketsByEvent(eventId: number): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, ticketData: Partial<Ticket>): Promise<Ticket | undefined>;
  
  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByRazorpayId(razorpayPaymentId: string): Promise<Payment | undefined>;
  getPaymentsByUser(userId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined>;
  
  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined>;
}

// For backward compatibility, we'll keep the MemStorage class definition
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private tickets: Map<number, Ticket>;
  private payments: Map<number, Payment>;
  private categories: Map<number, Category>;
  
  private userIdCounter: number;
  private eventIdCounter: number;
  private ticketIdCounter: number;
  private paymentIdCounter: number;
  private categoryIdCounter: number;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.tickets = new Map();
    this.payments = new Map();
    this.categories = new Map();
    
    this.userIdCounter = 1;
    this.eventIdCounter = 1;
    this.ticketIdCounter = 1;
    this.paymentIdCounter = 1;
    this.categoryIdCounter = 1;
    
    // Initialize with some categories
    this.initializeCategories();
    
    // Add a default admin user
    this.initializeDefaultUsers();
    
    // Add sample events
    this.initializeSampleEvents();
  }
  
  private async initializeDefaultUsers() {
    // Admin user - Dean of Engineering
    await this.createUser({
      username: "dean_engineering",
      password: "$2a$10$JrRsJYAAGT3QOD5c0c/JBufX/A4UEwbz5eRz5nL7JsAI2Ai2bY3Uy", // "admin123"
      email: "dean.engineering@srmap.edu.in",
      fullName: "Dr. Sridhar Condoor",
      role: "admin",
      phoneNumber: "+919876543210",
      profilePicUrl: null
    });
    
    // Organizer user - Robotics Club Faculty Advisor
    await this.createUser({
      username: "robotics_advisor",
      password: "$2a$10$JrRsJYAAGT3QOD5c0c/JBufX/A4UEwbz5nL7JsAI2Ai2bY3Uy", // "organizer123"
      email: "robotics.advisor@srmap.edu.in",
      fullName: "Dr. Ramesh Kumar",
      role: "organizer",
      phoneNumber: "+918765432109",
      profilePicUrl: null
    });
    
    // Organizer user - Cultural Club Coordinator
    await this.createUser({
      username: "cultural_coordinator",
      password: "$2a$10$JrRsJYAAGT3QOD5c0c/JBufX/A4UEwbz5nL7JsAI2Ai2bY3Uy", // "organizer123"
      email: "cultural.club@srmap.edu.in",
      fullName: "Prof. Priya Sharma",
      role: "organizer",
      phoneNumber: "+917654321098",
      profilePicUrl: null
    });
    
    // Organizer user - Student Council President
    await this.createUser({
      username: "student_council",
      password: "$2a$10$JrRsJYAAGT3QOD5c0c/JBufX/A4UEwbz5nL7JsAI2Ai2bY3Uy", // "organizer123"
      email: "student.council@srmap.edu.in",
      fullName: "Arjun Reddy",
      role: "organizer",
      phoneNumber: "+916543210987",
      profilePicUrl: null
    });
    
    // Attendee user - Regular Student
    await this.createUser({
      username: "cse_student",
      password: "$2a$10$JrRsJYAAGT3QOD5c0c/JBufX/A4UEwbz5nL7JsAI2Ai2bY3Uy", // "attendee123"
      email: "student2023@srmap.edu.in",
      fullName: "Sneha Patel",
      role: "attendee",
      phoneNumber: "+915432109876",
      profilePicUrl: null
    });
  }
  
  private async initializeSampleEvents() {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Technical Events
    
    // Technical Workshops
    await this.createEvent({
      title: "MERN Stack Workshop",
      description: "A 2-day intensive workshop by the CSE Department covering MongoDB, Express, React, and Node.js. Get hands-on experience building full-stack web applications. Certificate provided.",
      imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952",
      location: "CSE Dept Lab 3, SRM AP University",
      startDate: new Date(now.getTime() + 7 * oneDay),
      endDate: new Date(now.getTime() + 8 * oneDay),
      organizerId: 2, // Robotics advisor
      category: "Technical Workshop",
      totalTickets: 50,
      availableTickets: 12,
      ticketPrice: "500",
      isFeatured: true,
      status: "active"
    });
    
    await this.createEvent({
      title: "Machine Learning with Python",
      description: "Learn practical ML techniques using Python and scikit-learn. This workshop is perfect for students interested in AI/ML research. Bring your laptops with Python installed.",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
      location: "Electronics & Electrical Engineering Lab, SRM AP",
      startDate: new Date(now.getTime() + 14 * oneDay),
      endDate: new Date(now.getTime() + 15 * oneDay),
      organizerId: 2,
      category: "Technical Workshop",
      totalTickets: 40,
      availableTickets: 5,
      ticketPrice: "600",
      isFeatured: false,
      status: "active"
    });
    
    // Department Events
    await this.createEvent({
      title: "Guest Lecture: Industry 4.0",
      description: "Dr. Ramesh Sharma from Microsoft will discuss the future of Industry 4.0 and its impact on engineering graduates. Attendance is mandatory for final year Mechanical Engineering students.",
      imageUrl: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f",
      location: "Seminar Hall B, SRM University AP",
      startDate: new Date(now.getTime() + 3 * oneDay),
      endDate: new Date(now.getTime() + 3 * oneDay),
      organizerId: 1, // Dean
      category: "Guest Lecture",
      totalTickets: 200,
      availableTickets: 143,
      ticketPrice: "0",
      isFeatured: true,
      status: "active"
    });
    
    // Hackathons
    await this.createEvent({
      title: "SRM Hackathon 2023: Build for Social Good",
      description: "A 36-hour hackathon to build solutions for social challenges. Cash prizes worth ₹50,000 for winning teams! Open to all SRM AP students.",
      imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
      location: "Innovation Center, SRM University AP",
      startDate: new Date(now.getTime() + 21 * oneDay),
      endDate: new Date(now.getTime() + 23 * oneDay),
      organizerId: 3, // Student Council
      category: "Hackathon",
      totalTickets: 100,
      availableTickets: 32,
      ticketPrice: "200",
      isFeatured: true,
      status: "active"
    });
    
    // Conferences
    await this.createEvent({
      title: "SRM-AP Research Symposium 2023",
      description: "Annual research conference showcasing projects from SRM AP faculty and students. Special focus on sustainable technologies and renewable energy research.",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
      location: "University Main Auditorium",
      startDate: new Date(now.getTime() + 30 * oneDay),
      endDate: new Date(now.getTime() + 32 * oneDay),
      organizerId: 1, // Dean
      category: "Academic Conference",
      totalTickets: 200,
      availableTickets: 156,
      ticketPrice: "0",
      isFeatured: true,
      status: "active"
    });
    
    // Webinars
    await this.createEvent({
      title: "Cybersecurity Career Paths",
      description: "Online webinar from industry experts on career opportunities in cybersecurity. Learn about roles, skills required, and how to prepare for a career in information security.",
      imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3",
      location: "Online (Microsoft Teams)",
      startDate: new Date(now.getTime() + 10 * oneDay),
      endDate: new Date(now.getTime() + 10 * oneDay),
      organizerId: 2, // Robotics advisor
      category: "Technical Webinar",
      totalTickets: 500,
      availableTickets: 321,
      ticketPrice: "0",
      isFeatured: false,
      status: "active"
    });
    
    // Club Events
    await this.createEvent({
      title: "Robotics Club: Line Following Robot Competition",
      description: "Design and build a robot that can autonomously follow a line course. Open to all engineering students. Team registration of 2-3 members required.",
      imageUrl: "https://images.unsplash.com/photo-1561144257-e32e8efc6c4f",
      location: "Robotics Lab, SRM University AP",
      startDate: new Date(now.getTime() + 5 * oneDay),
      endDate: new Date(now.getTime() + 5 * oneDay),
      organizerId: 2, // Robotics advisor
      category: "Robotics Competition",
      totalTickets: 50,
      availableTickets: 14,
      ticketPrice: "300",
      isFeatured: false,
      status: "active"
    });
    
    // Cultural Events
    
    // Music
    await this.createEvent({
      title: "SRM-AP Cultural Fest 2023",
      description: "Annual cultural festival with music performances, dance competitions, fashion show, and more. Join us for three days of celebration and talent showcase.",
      imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3",
      location: "University Amphitheater, SRM AP",
      startDate: new Date(now.getTime() + 45 * oneDay),
      endDate: new Date(now.getTime() + 47 * oneDay),
      organizerId: 3, // Student Council
      category: "Campus Festival",
      totalTickets: 2000,
      availableTickets: 1245,
      ticketPrice: "150",
      isFeatured: true,
      status: "active"
    });
    
    // Sports
    await this.createEvent({
      title: "SRM Inter-Department Cricket Tournament",
      description: "Annual cricket tournament between various departments. Form your department team and register now. Trophy and cash prizes for winners.",
      imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da",
      location: "University Sports Complex",
      startDate: new Date(now.getTime() + 12 * oneDay),
      endDate: new Date(now.getTime() + 16 * oneDay),
      organizerId: 4, // Cultural coordinator
      category: "Sports Tournament",
      totalTickets: 16,
      availableTickets: 7,
      ticketPrice: "1000",
      isFeatured: true,
      status: "active"
    });
    
    // Career Development
    await this.createEvent({
      title: "Campus Placement Training Workshop",
      description: "Prepare for the upcoming placement season with mock interviews, resume building, and aptitude test preparation. Mandatory for all pre-final year students.",
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
      location: "Room 301-305, Academic Block 1",
      startDate: new Date(now.getTime() + 15 * oneDay),
      endDate: new Date(now.getTime() + 17 * oneDay),
      organizerId: 1, // Dean
      category: "Placement Training",
      totalTickets: 300,
      availableTickets: 87,
      ticketPrice: "0",
      isFeatured: false,
      status: "active"
    });
    
    // Industry Visit
    await this.createEvent({
      title: "Industrial Visit to ISRO Satellite Center",
      description: "Educational visit to the ISRO Satellite Center in Bangalore. Transportation and accommodation provided. Limited seats available.",
      imageUrl: "https://images.unsplash.com/photo-1534996858221-380b92700493",
      location: "Departure from University Main Gate",
      startDate: new Date(now.getTime() + 25 * oneDay),
      endDate: new Date(now.getTime() + 27 * oneDay),
      organizerId: 2, // Robotics advisor
      category: "Industry Visit",
      totalTickets: 40,
      availableTickets: 10,
      ticketPrice: "1500",
      isFeatured: true,
      status: "active"
    });
    
    // Student Activities
    await this.createEvent({
      title: "Freshers Welcome Party 2023",
      description: "Welcome celebration for the new batch of students. Games, music, and fun activities planned. Food and refreshments will be provided.",
      imageUrl: "https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28",
      location: "University Food Court",
      startDate: new Date(now.getTime() + 18 * oneDay),
      endDate: new Date(now.getTime() + 18 * oneDay),
      organizerId: 3, // Student Council
      category: "Club Event",
      totalTickets: 250,
      availableTickets: 50,
      ticketPrice: "200",
      isFeatured: false,
      status: "active"
    });
  }

  private initializeCategories() {
    const defaultCategories = [
      // Academic Schools at SRMAP
      { name: "School of Engineering", icon: "fa-cogs", eventCount: 48 },
      { name: "School of Liberal Arts", icon: "fa-landmark", eventCount: 33 },
      { name: "School of Management", icon: "fa-chart-line", eventCount: 27 },
      
      // Departmental Events
      { name: "CSE Department", icon: "fa-laptop-code", eventCount: 35 },
      { name: "ECE Department", icon: "fa-microchip", eventCount: 29 },
      { name: "Mechanical Department", icon: "fa-wrench", eventCount: 22 },
      { name: "Physics Department", icon: "fa-atom", eventCount: 18 },
      
      // Campus Clubs
      { name: "Next Tech Lab", icon: "fa-robot", eventCount: 32 },
      { name: "Coding Ninjas", icon: "fa-code", eventCount: 41 },
      { name: "IEDC Club", icon: "fa-lightbulb", eventCount: 26 },
      { name: "Cultural Club", icon: "fa-guitar", eventCount: 35 },
      { name: "Literary Club", icon: "fa-book-open", eventCount: 22 },
      
      // Standard Event Types
      { name: "Technical Workshop", icon: "fa-tools", eventCount: 43 },
      { name: "Guest Lecture", icon: "fa-chalkboard-teacher", eventCount: 37 },
      { name: "Hackathon", icon: "fa-keyboard", eventCount: 19 },
      { name: "Research Symposium", icon: "fa-microscope", eventCount: 16 },
      { name: "Cultural Fest", icon: "fa-theater-masks", eventCount: 12 },
      
      // Special Categories
      { name: "SRM Signature Series", icon: "fa-award", eventCount: 8 },
      { name: "International Conference", icon: "fa-globe", eventCount: 5 },
      { name: "Industry Connect", icon: "fa-handshake", eventCount: 14 },
      { name: "Freshers Events", icon: "fa-user-graduate", eventCount: 6 },
      { name: "Sports Tournament", icon: "fa-running", eventCount: 22 },
      
      // Career Development
      { name: "Placement Training", icon: "fa-briefcase", eventCount: 31 },
      { name: "Industry Visit", icon: "fa-industry", eventCount: 15 },
    ];

    defaultCategories.forEach(cat => {
      this.createCategory(cat);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Ensure required fields have proper values
    const user: User = { 
      ...userData, 
      id,
      role: userData.role || "attendee",
      phoneNumber: userData.phoneNumber || null,
      profilePicUrl: userData.profilePicUrl || null 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getFeaturedEvents(limit?: number): Promise<Event[]> {
    const featuredEvents = Array.from(this.events.values())
      .filter(event => event.isFeatured && event.status === 'active');
    
    return limit ? featuredEvents.slice(0, limit) : featuredEvents;
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.category === category && event.status === 'active');
  }

  async getEventsByOrganizer(organizerId: number): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.organizerId === organizerId);
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const event: Event = { 
      ...eventData, 
      id,
      status: eventData.status || "active",
      imageUrl: eventData.imageUrl || null,
      isFeatured: eventData.isFeatured || false
    };
    this.events.set(id, event);
    
    // Update category event count
    const category = await this.getCategoryByName(eventData.category);
    if (category) {
      await this.updateCategory(category.id, { 
        eventCount: (category.eventCount || 0) + 1 
      });
    }
    
    return event;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const event = await this.getEvent(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...eventData };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const event = await this.getEvent(id);
    if (!event) return false;
    
    // Update category event count
    const category = await this.getCategoryByName(event.category);
    if (category) {
      await this.updateCategory(category.id, { 
        eventCount: Math.max(0, (category.eventCount || 0) - 1) 
      });
    }
    
    return this.events.delete(id);
  }

  // Ticket operations
  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketsByUser(userId: number): Promise<Ticket[]> {
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.userId === userId);
  }

  async getTicketsByEvent(eventId: number): Promise<Ticket[]> {
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.eventId === eventId);
  }

  async createTicket(ticketData: InsertTicket): Promise<Ticket> {
    const id = this.ticketIdCounter++;
    const ticket: Ticket = { 
      ...ticketData, 
      id,
      purchaseDate: new Date(),
      status: ticketData.status || "valid"
    };
    this.tickets.set(id, ticket);
    
    // Update available tickets for the event
    const event = await this.getEvent(ticketData.eventId);
    if (event) {
      const updatedAvailableTickets = event.availableTickets - ticketData.quantity;
      await this.updateEvent(event.id, { availableTickets: updatedAvailableTickets });
    }
    
    return ticket;
  }

  async updateTicket(id: number, ticketData: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;
    
    const updatedTicket = { ...ticket, ...ticketData };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentByRazorpayId(razorpayPaymentId: string): Promise<Payment | undefined> {
    return Array.from(this.payments.values())
      .find(payment => payment.razorpayPaymentId === razorpayPaymentId);
  }

  async getPaymentsByUser(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId);
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const payment: Payment = { 
      id,
      userId: paymentData.userId,
      razorpayPaymentId: paymentData.razorpayPaymentId,
      razorpayOrderId: paymentData.razorpayOrderId,
      amount: paymentData.amount,
      status: paymentData.status,
      ticketId: paymentData.ticketId ?? null,
      paymentDate: new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    const payment = await this.getPayment(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...paymentData };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values())
      .find(category => category.name.toLowerCase() === name.toLowerCase());
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const category: Category = { 
      ...categoryData, 
      id,
      eventCount: categoryData.eventCount || 0
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const category = await this.getCategory(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
}

// Using MongoDB storage instead of in-memory storage
// Switch to MemStorage for Replit environment
export const storage = new MemStorage();
