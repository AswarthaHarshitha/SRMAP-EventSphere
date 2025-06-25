import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { User } from '@shared/schema';

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'eventpulse-secret-key';
const JWT_EXPIRY = '7d';

// Generate a JWT token
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify a password against hashed password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Authentication middleware
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication token is missing' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Role-based access control middleware
export function authorizeRoles(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: 'Access forbidden: insufficient permissions' });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error during authorization' });
    }
  };
}

// Check if user is event organizer middleware
export function isEventOrganizer(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId;
  const eventId = parseInt(req.params.id);
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  storage.getEvent(eventId)
    .then(event => {
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      if (event.organizerId !== userId) {
        return res.status(403).json({ message: 'Access forbidden: you are not the organizer of this event' });
      }
      
      next();
    })
    .catch(error => {
      res.status(500).json({ message: 'Server error checking event organizer' });
    });
}

// Type extension for Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}
