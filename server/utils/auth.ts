import { User, InsertUser } from "@shared/schema";
import { storage } from "../storage";

// This is a simple mock implementation of password hashing
// In a real application, you would use bcrypt or similar
export async function hashPassword(password: string): Promise<string> {
  // Prefix with $2a$ to mimic bcrypt format
  return `$2a$10$${Buffer.from(password).toString("base64")}`;
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  token: string;
}

export async function registerUser(userData: InsertUser): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }
  
  // Hash the password
  const hashedPassword = await hashPassword(userData.password);
  
  // Create the user with hashed password
  const user = await storage.createUser({
    ...userData,
    password: hashedPassword,
  });
  
  // Generate a JWT token (simplified for this example)
  const token = generateToken(user);
  
  // Return the user without the password and the token
  const { password, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token,
  };
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  // Find the user
  const user = await storage.getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }
  
  // Compare passwords
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }
  
  // Generate a JWT token
  const token = generateToken(user);
  
  // Return the user without the password and the token
  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token,
  };
}

function generateToken(user: User): string {
  // In a real application, use a proper JWT library
  const payload = {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  };
  
  // Encode payload as base64
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function verifyToken(token: string): { id: number; email: string; isAdmin: boolean } | null {
  try {
    // Decode the token
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    return payload;
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(req: any): { id: number; email: string; isAdmin: boolean } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}
