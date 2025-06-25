import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

// JWT secret key should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || "event-pulse-jwt-secret-key";

// Define the shape of our JWT payload
interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

// Generate JWT token
export const generateToken = (userId: number, email: string, role: string): string => {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: "24h" });
};

// Verify JWT token
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    // Check if user exists
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    // Set user info in request object
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
    
    next();
  } catch (error) {
    return res.status(500).json({ message: "Authentication error", error });
  }
};

// Role-based authorization middleware
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
};

// Export middleware that checks if user is authenticated but doesn't require it
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    
    if (!payload) {
      return next();
    }
    
    // Check if user exists
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return next();
    }
    
    // Set user info in request object
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
    
    next();
  } catch (error) {
    next();
  }
};
