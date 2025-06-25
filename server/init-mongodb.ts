import { 
  User, Event, Ticket, Payment, Category,
  connectToMongoDB
} from './mongodb';
import { hashPassword } from './auth';

async function initializeData() {
  try {
    await connectToMongoDB();
    console.log('Connected to MongoDB. Initializing data...');
    
    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    await Ticket.deleteMany({});
    await Payment.deleteMany({});
    await Category.deleteMany({});
    
    // Create default users
    const adminPassword = await hashPassword('admin123');
    const organizerPassword = await hashPassword('password123');
    const userPassword = await hashPassword('password123');
    
    const admin = await User.create({
      id: 1,
      username: 'admin',
      email: 'admin@eventpulse.com',
      password: adminPassword,
      fullName: 'System Admin',
      role: 'admin'
    });
    
    const organizer = await User.create({
      id: 2,
      username: 'organizer',
      email: 'organizer@eventpulse.com',
      password: organizerPassword,
      fullName: 'Event Organizer',
      role: 'organizer'
    });
    
    const attendee = await User.create({
      id: 3,
      username: 'user',
      email: 'user@eventpulse.com',
      password: userPassword,
      fullName: 'Regular User',
      role: 'attendee'
    });
    
    // Create categories
    const workshop = await Category.create({
      id: 1,
      name: 'Workshop',
      description: 'Hands-on learning experiences for various skills',
      icon: 'fa-laptop-code',
      eventCount: 2
    });
    
    const conference = await Category.create({
      id: 2,
      name: 'Conference',
      description: 'Large-scale gatherings with multiple speakers and sessions',
      icon: 'fa-users',
      eventCount: 1
    });
    
    const hackathon = await Category.create({
      id: 3,
      name: 'Hackathon',
      description: 'Competitive coding and problem-solving events',
      icon: 'fa-code',
      eventCount: 1
    });
    
    const cultural = await Category.create({
      id: 4,
      name: 'Cultural',
      description: 'Celebrations of art, music, and heritage',
      icon: 'fa-music',
      eventCount: 0
    });
    
    // Create events
    const webDevEvent = await Event.create({
      id: 1,
      title: 'Web Development Bootcamp',
      description: 'A comprehensive workshop on modern web development techniques using React, Node.js, and MongoDB.',
      imageUrl: '/assets/srmap/photos/event-hall.jpg',
      location: 'SRM AP Tech Building, Room 301',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // +3 hours
      category: 'Workshop',
      organizerId: 2, // organizer
      totalTickets: 50,
      availableTickets: 50,
      ticketPrice: 500,
      isFeatured: true,
      status: 'active'
    });
    
    const aiConference = await Event.create({
      id: 2,
      title: 'AI & Machine Learning Summit',
      description: 'Join leading experts in AI and machine learning for a day of insights, research presentations, and networking.',
      imageUrl: '/assets/srmap/photos/campus2.jpg',
      location: 'SRM AP Main Auditorium',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      category: 'Conference',
      organizerId: 2, // organizer
      totalTickets: 200,
      availableTickets: 180,
      ticketPrice: 1000,
      isFeatured: true,
      status: 'active'
    });
    
    const codingEvent = await Event.create({
      id: 3,
      title: '48-Hour Hackathon Challenge',
      description: 'Put your coding skills to the test in this intensive 48-hour hackathon. Build innovative solutions to real-world problems.',
      imageUrl: '/assets/srmap/photos/campus.jpg',
      location: 'SRM AP Innovation Center',
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now
      category: 'Hackathon',
      organizerId: 2, // organizer
      totalTickets: 100,
      availableTickets: 85,
      ticketPrice: 750,
      isFeatured: false,
      status: 'active'
    });
    
    console.log('Sample data initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing data:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeData();