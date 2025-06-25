import nodemailer from 'nodemailer';
import { log } from './vite';
import type { User, Event, Ticket } from '@shared/schema';

// Check if email credentials are available
export const isUsingMockEmail = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;

// Store mock emails for development testing
const mockEmailStore: Array<{
  to: string;
  subject: string;
  html: string;
  text: string;
  date: Date;
}> = [];

// Create mock or real email transporter
let transporter: nodemailer.Transporter;

if (isUsingMockEmail) {
  log('Using mock email service for development', 'email');
  
  // Create a mock transporter that just logs and stores emails
  transporter = {
    sendMail: async (mailOptions: any) => {
      const { to, subject, html, text } = mailOptions;
      
      log(`Mock email sent to: ${to}`, 'email');
      log(`Subject: ${subject}`, 'email');
      
      // Store the email for retrieval in development
      mockEmailStore.push({
        to,
        subject,
        html: html || '',
        text: text || '',
        date: new Date()
      });
      
      return {
        messageId: `mock_${Date.now()}`,
        accepted: [to],
        rejected: [],
        pending: [],
        response: 'Mock email sent successfully'
      };
    }
  } as any;
} else {
  // Create a real nodemailer transporter with actual credentials
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  log('Using real email service with provided credentials', 'email');
}

/**
 * Send an email using either the real or mock transport
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    const { to, subject, html, text } = options;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@eventpulse.srmap.edu.in',
      to,
      subject,
      html,
      text: text || '',
    });
    
    return true;
  } catch (error) {
    log(`Error sending email: ${(error as Error).message}`, 'email');
    return false;
  }
}

/**
 * Get all mock emails (for development only)
 */
export function getMockEmails() {
  return [...mockEmailStore];
}

/**
 * Clear all mock emails (for development only)
 */
export function clearMockEmails() {
  mockEmailStore.length = 0;
  return true;
}

/**
 * Send a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(user: User) {
  const subject = 'Welcome to SRM AP Event Pulse!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; padding: 20px; color: white; text-align: center;">
        <h1>Welcome to SRM AP Event Pulse!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${user.fullName || user.username},</p>
        <p>Thank you for joining SRM AP Event Pulse! We're excited to have you on board.</p>
        <p>With your new account, you can:</p>
        <ul>
          <li>Browse upcoming events at SRM AP</li>
          <li>Book tickets for events you're interested in</li>
          <li>Keep track of your bookings in your profile</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>The SRM AP Event Pulse Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: user.email,
    subject,
    html
  });
}

/**
 * Send ticket confirmation email to attendee
 */
export async function sendTicketConfirmationEmail(options: {
  user: User;
  event: Event;
  ticket: Ticket;
}) {
  const { user, event, ticket } = options;
  const subject = `Ticket Confirmation: ${event.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; padding: 20px; color: white; text-align: center;">
        <h1>Your Ticket is Confirmed!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${user.fullName || user.username},</p>
        <p>Your ticket for the following event has been confirmed:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h2 style="margin-top: 0;">${event.title}</h2>
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleString()}</p>
          <p><strong>Location:</strong> ${event.location}</p>
          <p><strong>Ticket ID:</strong> ${ticket.id}</p>
          <p><strong>Quantity:</strong> ${ticket.quantity}</p>
          <p><strong>Total Amount:</strong> ₹${ticket.totalAmount}</p>
        </div>
        
        <p>Please bring this email or your ticket ID to the event for entry.</p>
        <p>We look forward to seeing you there!</p>
        <p>Best regards,<br>The SRM AP Event Pulse Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: user.email,
    subject,
    html
  });
}

/**
 * Send ticket notification to event organizer
 */
export async function sendOrganizerTicketNotification(options: {
  organizer: User;
  event: Event;
  ticket: Ticket;
  attendee: User;
}) {
  const { organizer, event, ticket, attendee } = options;
  const subject = `New Ticket Booking: ${event.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; padding: 20px; color: white; text-align: center;">
        <h1>New Ticket Booking</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${organizer.fullName || organizer.username},</p>
        <p>A new ticket has been booked for your event:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h2 style="margin-top: 0;">${event.title}</h2>
          <p><strong>Attendee:</strong> ${attendee.fullName || attendee.username} (${attendee.email})</p>
          <p><strong>Ticket ID:</strong> ${ticket.id}</p>
          <p><strong>Quantity:</strong> ${ticket.quantity}</p>
          <p><strong>Total Amount:</strong> ₹${ticket.totalAmount}</p>
          <p><strong>Purchase Date:</strong> ${new Date(ticket.purchaseDate).toLocaleString()}</p>
        </div>
        
        <p>You can view all bookings for your events in your organizer dashboard.</p>
        <p>Best regards,<br>The SRM AP Event Pulse Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: organizer.email,
    subject,
    html
  });
}

/**
 * Send event creation confirmation to organizer
 */
export async function sendEventCreationEmail(options: {
  organizer: User;
  event: Event;
}) {
  const { organizer, event } = options;
  const subject = `Event Created: ${event.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; padding: 20px; color: white; text-align: center;">
        <h1>Event Successfully Created</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${organizer.fullName || organizer.username},</p>
        <p>Your event has been successfully created and is now live on SRM AP Event Pulse:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h2 style="margin-top: 0;">${event.title}</h2>
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleString()}</p>
          <p><strong>Location:</strong> ${event.location}</p>
          <p><strong>Category:</strong> ${event.category}</p>
          <p><strong>Total Tickets:</strong> ${event.totalTickets}</p>
          <p><strong>Ticket Price:</strong> ₹${event.ticketPrice}</p>
        </div>
        
        <p>You can monitor bookings and manage your event through your organizer dashboard.</p>
        <p>Best regards,<br>The SRM AP Event Pulse Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: organizer.email,
    subject,
    html
  });
}

/**
 * Send event reminder email to attendees
 */
export async function sendEventReminderEmail(options: {
  user: User;
  event: Event;
  ticket: Ticket;
}) {
  const { user, event, ticket } = options;
  const subject = `Reminder: ${event.title} is Tomorrow!`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; padding: 20px; color: white; text-align: center;">
        <h1>Event Reminder</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${user.fullName || user.username},</p>
        <p>This is a friendly reminder that you have tickets for the following event tomorrow:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h2 style="margin-top: 0;">${event.title}</h2>
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleString()}</p>
          <p><strong>Location:</strong> ${event.location}</p>
          <p><strong>Ticket ID:</strong> ${ticket.id}</p>
        </div>
        
        <p>Please remember to bring your ticket ID for entry.</p>
        <p>We look forward to seeing you there!</p>
        <p>Best regards,<br>The SRM AP Event Pulse Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: user.email,
    subject,
    html
  });
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(options: {
  user: User;
  event: Event;
  paymentId: string;
  orderId: string;
  amount: string;
}) {
  const { user, event, paymentId, orderId, amount } = options;
  const subject = `Payment Receipt: ${event.title}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; padding: 20px; color: white; text-align: center;">
        <h1>Payment Receipt</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hello ${user.fullName || user.username},</p>
        <p>Thank you for your payment. Here is your receipt:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h2 style="margin-top: 0;">${event.title}</h2>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Amount:</strong> ₹${amount}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>If you have any questions about your payment, please contact us.</p>
        <p>Best regards,<br>The SRM AP Event Pulse Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: user.email,
    subject,
    html
  });
}