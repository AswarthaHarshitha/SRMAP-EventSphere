import { IStorage } from './storage';
import { 
  User, Event, Ticket, Payment, Category,
  connectToMongoDB
} from './mongodb';
import type { 
  User as UserType,
  Event as EventType,
  Ticket as TicketType,
  Payment as PaymentType,
  Category as CategoryType,
  InsertUser,
  InsertEvent,
  InsertTicket,
  InsertPayment,
  InsertCategory
} from '@shared/schema';

// Connect to MongoDB when the file is imported
connectToMongoDB();

export class MongoStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<UserType | undefined> {
    try {
      const user = await User.findOne({ id });
      return user ? user.toObject() as unknown as UserType : undefined;
    } catch (error) {
      console.error('Error retrieving user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    try {
      const user = await User.findOne({ username });
      return user ? user.toObject() as unknown as UserType : undefined;
    } catch (error) {
      console.error('Error retrieving user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<UserType | undefined> {
    try {
      const user = await User.findOne({ email });
      return user ? user.toObject() as unknown as UserType : undefined;
    } catch (error) {
      console.error('Error retrieving user by email:', error);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<UserType> {
    try {
      // Find the maximum id and increment
      const maxUser = await User.findOne().sort({ id: -1 });
      const nextId = maxUser ? (maxUser.get('id') as number) + 1 : 1;
      
      const user = new User({
        ...userData,
        id: nextId
      });
      await user.save();
      return user.toObject() as unknown as UserType;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<UserType>): Promise<UserType | undefined> {
    try {
      const user = await User.findOneAndUpdate({ id }, userData, { new: true });
      return user ? user.toObject() as unknown as UserType : undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // Event operations
  async getEvent(id: number): Promise<EventType | undefined> {
    try {
      const event = await Event.findOne({ id });
      return event ? event.toObject() as unknown as EventType : undefined;
    } catch (error) {
      console.error('Error retrieving event:', error);
      return undefined;
    }
  }

  async getAllEvents(): Promise<EventType[]> {
    try {
      const events = await Event.find().sort({ startDate: 1 });
      return events.map(event => event.toObject() as unknown as EventType);
    } catch (error) {
      console.error('Error retrieving all events:', error);
      return [];
    }
  }

  async getFeaturedEvents(limit?: number): Promise<EventType[]> {
    try {
      const query = Event.find({ isFeatured: true }).sort({ startDate: 1 });
      if (limit) {
        query.limit(limit);
      }
      const events = await query.exec();
      return events.map(event => event.toObject() as unknown as EventType);
    } catch (error) {
      console.error('Error retrieving featured events:', error);
      return [];
    }
  }

  async getEventsByCategory(category: string): Promise<EventType[]> {
    try {
      const events = await Event.find({ category }).sort({ startDate: 1 });
      return events.map(event => event.toObject() as unknown as EventType);
    } catch (error) {
      console.error('Error retrieving events by category:', error);
      return [];
    }
  }

  async getEventsByOrganizer(organizerId: number): Promise<EventType[]> {
    try {
      const events = await Event.find({ organizerId }).sort({ startDate: 1 });
      return events.map(event => event.toObject() as unknown as EventType);
    } catch (error) {
      console.error('Error retrieving events by organizer:', error);
      return [];
    }
  }

  async createEvent(eventData: InsertEvent): Promise<EventType> {
    try {
      // Find the maximum id and increment
      const maxEvent = await Event.findOne().sort({ id: -1 });
      const nextId = maxEvent ? (maxEvent.get('id') as number) + 1 : 1;
      
      const event = new Event({
        ...eventData,
        id: nextId
      });
      await event.save();
      
      // Update category event count
      await Category.findOneAndUpdate(
        { name: eventData.category },
        { $inc: { eventCount: 1 } }
      );
      
      return event.toObject() as unknown as EventType;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: number, eventData: Partial<EventType>): Promise<EventType | undefined> {
    try {
      const event = await Event.findOneAndUpdate({ id }, eventData, { new: true });
      return event ? event.toObject() as unknown as EventType : undefined;
    } catch (error) {
      console.error('Error updating event:', error);
      return undefined;
    }
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      const event = await Event.findOne({ id });
      if (!event) return false;
      
      // Update category event count
      await Category.findOneAndUpdate(
        { name: event.get('category') as string },
        { $inc: { eventCount: -1 } }
      );
      
      await Event.deleteOne({ id });
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  // Ticket operations
  async getTicket(id: number): Promise<TicketType | undefined> {
    try {
      const ticket = await Ticket.findOne({ id });
      return ticket ? ticket.toObject() as unknown as TicketType : undefined;
    } catch (error) {
      console.error('Error retrieving ticket:', error);
      return undefined;
    }
  }

  async getTicketsByUser(userId: number): Promise<TicketType[]> {
    try {
      const tickets = await Ticket.find({ userId });
      return tickets.map(ticket => ticket.toObject() as unknown as TicketType);
    } catch (error) {
      console.error('Error retrieving tickets by user:', error);
      return [];
    }
  }

  async getTicketsByEvent(eventId: number): Promise<TicketType[]> {
    try {
      const tickets = await Ticket.find({ eventId });
      return tickets.map(ticket => ticket.toObject() as unknown as TicketType);
    } catch (error) {
      console.error('Error retrieving tickets by event:', error);
      return [];
    }
  }

  async createTicket(ticketData: InsertTicket): Promise<TicketType> {
    try {
      // Find the maximum id and increment
      const maxTicket = await Ticket.findOne().sort({ id: -1 });
      const nextId = maxTicket ? (maxTicket.get('id') as number) + 1 : 1;
      
      const ticket = new Ticket({
        ...ticketData,
        id: nextId,
        purchaseDate: new Date()
      });
      await ticket.save();
      return ticket.toObject() as unknown as TicketType;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  async updateTicket(id: number, ticketData: Partial<TicketType>): Promise<TicketType | undefined> {
    try {
      const ticket = await Ticket.findOneAndUpdate({ id }, ticketData, { new: true });
      return ticket ? ticket.toObject() as unknown as TicketType : undefined;
    } catch (error) {
      console.error('Error updating ticket:', error);
      return undefined;
    }
  }

  // Payment operations
  async getPayment(id: number): Promise<PaymentType | undefined> {
    try {
      const payment = await Payment.findOne({ id });
      return payment ? payment.toObject() as unknown as PaymentType : undefined;
    } catch (error) {
      console.error('Error retrieving payment:', error);
      return undefined;
    }
  }

  async getPaymentByRazorpayId(razorpayPaymentId: string): Promise<PaymentType | undefined> {
    try {
      const payment = await Payment.findOne({ razorpayPaymentId });
      return payment ? payment.toObject() as unknown as PaymentType : undefined;
    } catch (error) {
      console.error('Error retrieving payment by Razorpay ID:', error);
      return undefined;
    }
  }

  async getPaymentsByUser(userId: number): Promise<PaymentType[]> {
    try {
      const payments = await Payment.find({ userId });
      return payments.map(payment => payment.toObject() as unknown as PaymentType);
    } catch (error) {
      console.error('Error retrieving payments by user:', error);
      return [];
    }
  }

  async createPayment(paymentData: InsertPayment): Promise<PaymentType> {
    try {
      // Find the maximum id and increment
      const maxPayment = await Payment.findOne().sort({ id: -1 });
      const nextId = maxPayment ? (maxPayment.get('id') as number) + 1 : 1;
      
      const payment = new Payment({
        ...paymentData,
        id: nextId,
        paymentDate: new Date()
      });
      await payment.save();
      return payment.toObject() as unknown as PaymentType;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async updatePayment(id: number, paymentData: Partial<PaymentType>): Promise<PaymentType | undefined> {
    try {
      const payment = await Payment.findOneAndUpdate({ id }, paymentData, { new: true });
      return payment ? payment.toObject() as unknown as PaymentType : undefined;
    } catch (error) {
      console.error('Error updating payment:', error);
      return undefined;
    }
  }

  // Category operations
  async getAllCategories(): Promise<CategoryType[]> {
    try {
      const categories = await Category.find();
      return categories.map(category => category.toObject() as unknown as CategoryType);
    } catch (error) {
      console.error('Error retrieving all categories:', error);
      return [];
    }
  }

  async getCategory(id: number): Promise<CategoryType | undefined> {
    try {
      const category = await Category.findOne({ id });
      return category ? category.toObject() as unknown as CategoryType : undefined;
    } catch (error) {
      console.error('Error retrieving category:', error);
      return undefined;
    }
  }

  async getCategoryByName(name: string): Promise<CategoryType | undefined> {
    try {
      const category = await Category.findOne({ name });
      return category ? category.toObject() as unknown as CategoryType : undefined;
    } catch (error) {
      console.error('Error retrieving category by name:', error);
      return undefined;
    }
  }

  async createCategory(categoryData: InsertCategory): Promise<CategoryType> {
    try {
      // Find the maximum id and increment
      const maxCategory = await Category.findOne().sort({ id: -1 });
      const nextId = maxCategory ? (maxCategory.get('id') as number) + 1 : 1;
      
      const category = new Category({
        ...categoryData,
        id: nextId
      });
      await category.save();
      return category.toObject() as unknown as CategoryType;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: number, categoryData: Partial<CategoryType>): Promise<CategoryType | undefined> {
    try {
      const category = await Category.findOneAndUpdate({ id }, categoryData, { new: true });
      return category ? category.toObject() as unknown as CategoryType : undefined;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }
}