import { apiRequest } from "./queryClient";
import { User, LoginCredentials, InsertUser } from "@shared/schema";

export interface AuthResponse {
  message: string;
  user: Omit<User, "password">;
  token: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", credentials);
  const data = await response.json();
  
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  
  return data;
}

export async function register(userData: InsertUser): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/register", userData);
  const data = await response.json();
  
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  
  return data;
}

export function logout(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  
  // Redirect to home page
  window.location.href = "/";
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem("token");
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getCurrentUser(): Omit<User, "password"> | null {
  const userJson = localStorage.getItem("user");
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error("Failed to parse user data:", error);
    return null;
  }
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return !!user && user.role === "admin";
}

export function isOrganizer(): boolean {
  const user = getCurrentUser();
  return !!user && (user.role === "organizer" || user.role === "admin");
}

// Add auth headers to fetch requests
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
