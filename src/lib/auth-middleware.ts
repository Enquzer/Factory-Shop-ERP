import { NextRequest } from 'next/server';
// Remove the cookies-next import as it's not needed for server-side middleware
import { getUserById } from './auth-sqlite';
import { User } from './auth-sqlite'; // Import from auth-sqlite instead of auth

// Extend the User type to include a method for checking roles
export interface AuthenticatedUser extends User {
  hasRole: (role: 'factory' | 'shop') => boolean;
}

// JWT token verification (simplified for this example)
async function verifyToken(token: string): Promise<{ userId: number } | null> {
  try {
    // In a real implementation, you would verify the JWT token here
    // For now, we'll just decode the token (assuming it's a simple base64 encoded JSON)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { userId: payload.userId };
  } catch (error) {
    return null;
  }
}

// Authentication middleware for API routes
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token
    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }
    
    // Get user from database
    const user = await getUserById(payload.userId);
    if (!user) {
      return null;
    }
    
    // Return authenticated user with role checking method
    return {
      ...user,
      hasRole: (role: 'factory' | 'shop') => user.role === role
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Helper function to check if user is factory
export function isFactoryUser(user: AuthenticatedUser | null): boolean {
  return user?.role === 'factory';
}

// Helper function to check if user is shop
export function isShopUser(user: AuthenticatedUser | null): boolean {
  return user?.role === 'shop';
}

// Middleware function for API routes
export async function withAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return handler(request, user);
  };
}

// Middleware function for API routes with role check
export async function withRoleAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>,
  requiredRole: 'factory' | 'shop'
) {
  return async (request: NextRequest) => {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (user.role !== requiredRole) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return handler(request, user);
  };
}