import { pgTable, text, serial, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles enum
export const userRoleEnum = pgEnum("user_role", ["admin", "organizer", "attendee"]);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").default("attendee").notNull(),
  phoneNumber: text("phone_number"),
  profilePicUrl: text("profile_pic_url"),
});

// Event schema
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  location: text("location").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  organizerId: integer("organizer_id").notNull(),
  category: text("category").notNull(),
  totalTickets: integer("total_tickets").notNull(),
  availableTickets: integer("available_tickets").notNull(),
  ticketPrice: numeric("ticket_price", { precision: 10, scale: 2 }).notNull(),
  isFeatured: boolean("is_featured").default(false),
  status: text("status").default("active").notNull(), // active, cancelled, completed
});

// Ticket schema
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  quantity: integer("quantity").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
  status: text("status").default("valid").notNull(), // valid, used, cancelled
});

// Payment schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id"),
  userId: integer("user_id").notNull(),
  razorpayPaymentId: text("razorpay_payment_id").notNull(),
  razorpayOrderId: text("razorpay_order_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // created, authorized, captured, failed, refunded
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
});

// Category schema - for display purposes
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  eventCount: integer("event_count").default(0),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, purchaseDate: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, paymentDate: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });

// Login Schema
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

// Create Order Schema
export const createOrderSchema = z.object({
  amount: z.number().min(1),
  currency: z.string().default("INR"),
  receipt: z.string().optional(),
});

// Verify Payment Schema
export const verifyPaymentSchema = z.object({
  razorpayPaymentId: z.string(),
  razorpayOrderId: z.string(),
  razorpaySignature: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Category = typeof categories.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type LoginCredentials = z.infer<typeof loginSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentSchema>;
