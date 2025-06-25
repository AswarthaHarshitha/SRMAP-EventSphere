import type { User, Event, Ticket } from "@shared/schema";

/**
 * Send an email notification
 * This is a mock implementation - in production, you would integrate
 * with a real email service like SendGrid, Mailgun, etc.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log(`Sending email to ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  
  // In a real implementation, we'd use an email service
  // For now, we just pretend we sent the email
  return true;
}

/**
 * Send a ticket confirmation email to a user
 */
export async function sendTicketConfirmation(user: User, event: Event, ticket: Ticket): Promise<boolean> {
  const subject = `Your tickets for ${event.title}`;
  const body = `
    Hello ${user.fullName},
    
    Thank you for purchasing tickets to ${event.title}!
    
    Event Details:
    - Date: ${event.startDate.toLocaleString()}
    - Venue: ${event.venue}, ${event.location}
    - Quantity: ${ticket.quantity}
    - Total paid: ₹${ticket.totalPrice.toFixed(2)}
    
    Please keep this email as your receipt.
    
    Best regards,
    The EventPulse Team
  `;
  
  return sendEmail(user.email, subject, body);
}

/**
 * Send a payment confirmation email to a user
 */
export async function sendPaymentConfirmation(user: User, amount: number, orderId: string): Promise<boolean> {
  const subject = "Payment Confirmation";
  const body = `
    Hello ${user.fullName},
    
    Your payment of ₹${amount.toFixed(2)} has been successfully processed.
    
    Order ID: ${orderId}
    
    Thank you for using EventPulse!
    
    Best regards,
    The EventPulse Team
  `;
  
  return sendEmail(user.email, subject, body);
}

/**
 * Send an event creation confirmation to the organizer
 */
export async function sendEventCreationConfirmation(user: User, event: Event): Promise<boolean> {
  const subject = "Your event has been created";
  const body = `
    Hello ${user.fullName},
    
    Your event "${event.title}" has been successfully created and is now live on EventPulse!
    
    Event Details:
    - Date: ${event.startDate.toLocaleString()}
    - Venue: ${event.venue}, ${event.location}
    - Price: ₹${event.price.toFixed(2)}
    - Available tickets: ${event.availableTickets}
    
    You can manage your event through the dashboard.
    
    Best regards,
    The EventPulse Team
  `;
  
  return sendEmail(user.email, subject, body);
}
