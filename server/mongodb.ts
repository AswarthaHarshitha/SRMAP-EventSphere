import mongoose from 'mongoose';
import { log } from './vite';

// MongoDB connection string - adjust as needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventpulse';

// Connect to MongoDB
export async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('Connected to MongoDB successfully', 'mongodb');
    return true;
  } catch (error) {
    log(`Error connecting to MongoDB: ${(error as Error).message}`, 'mongodb');
    return false;
  }
}

// MongoDB schemas
export const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'organizer', 'attendee'], default: 'attendee' },
  profilePicture: { type: String, default: null },
  bio: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String },
  location: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  category: { type: String, required: true },
  organizerId: { type: Number, required: true },
  totalTickets: { type: Number, required: true },
  availableTickets: { type: Number, required: true },
  ticketPrice: { type: Number, required: true },
  isFeatured: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'cancelled', 'completed'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export const TicketSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  userId: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' }
});

export const PaymentSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  ticketId: { type: Number },
  razorpayPaymentId: { type: String, required: true },
  razorpayOrderId: { type: String, required: true },
  amount: { type: String, required: true },
  status: { type: String, enum: ['created', 'authorized', 'captured', 'refunded', 'failed'], required: true },
  paymentDate: { type: Date, default: Date.now }
});

export const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  icon: { type: String },
  eventCount: { type: Number, default: 0 }
});

// Create models
export const User = mongoose.model('User', UserSchema);
export const Event = mongoose.model('Event', EventSchema);
export const Ticket = mongoose.model('Ticket', TicketSchema);
export const Payment = mongoose.model('Payment', PaymentSchema);
export const Category = mongoose.model('Category', CategorySchema);