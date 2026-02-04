import { NextRequest } from 'next/server';
// Remove the cookies-next import as it's not needed for server-side middleware
import { getUserById } from './auth-sqlite';
import { User } from './auth-sqlite'; // Import from auth-sqlite instead of auth

// Define the expanded role type
export type UserRole = 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'designer' | 'admin' | 'customer';

// Extend the User type to include a method for checking roles
export interface AuthenticatedUser extends Omit<User, 'role'> {
  role: UserRole;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

// JWT token verification using a simple but more secure approach
// In production, use a proper JWT library like jsonwebtoken
function verifyToken(token: string): Promise<{ userId: number } | null> {
  return new Promise((resolve) => {
    try {
      // For now, we'll implement a more secure token verification
      // In a real implementation, use a proper JWT library with secret signing
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        resolve(null);
        return;
      }

      // Decode the payload part (second part)
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        console.error('Token expired');
        resolve(null);
        return;
      }
      
      // Verify signature by checking if the token was signed with our secret
      // This is a simplified approach - in production, use a proper JWT library
      // For signature verification, we need to use the same approach as in the login API
      // Use the encoded header and payload from the token, not the parsed JSON
      const encodedHeader = tokenParts[0];
      const encodedPayload = tokenParts[1];
      const signatureData = encodedHeader + '.' + encodedPayload;
      const secret = process.env.JWT_SECRET || 'fallback_secret_key_for_development';
      const expectedSignature = btoa(signatureData + secret).replace(/[^a-zA-Z0-9]/g, '');
      
      if (tokenParts[2] !== expectedSignature) {
        console.error('Signature mismatch');
        resolve(null);
        return;
      }
      
      resolve({ userId: payload.userId });
    } catch (error) {
      console.error('Token verification error:', error);
      resolve(null);
    }
  });
}



// Authentication middleware for API routes
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get the authorization header
    let token = null;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else {
      // Check cookies
      const tokenCookie = request.cookies.get('token');
      if (tokenCookie) {
        token = tokenCookie.value;
      }
    }

    if (!token) {
      return null;
    }
    
    // Verify the token
    console.log('Verifying token...');
    const payload = await verifyToken(token);
    if (!payload) {
      console.log('Token verification failed');
      return null;
    }
    console.log('Token verified, payload:', payload);
    
    // Get user from database
    console.log(`Getting user by ID: ${payload.userId}`);
    const user = await getUserById(payload.userId);
    if (!user) {
      console.log('User not found in database');
      return null;
    }
    console.log('User found:', { id: user.id, username: user.username, role: user.role });
    
    // Return authenticated user with role checking method
    // Normalize role for legacy names (e.g., "Factory Admin", "Planning Manager", etc.)
    let normalizedRole: UserRole = user.role as UserRole;
    
    if (user.role && typeof user.role === 'string') {
      const roleStr = user.role.toLowerCase();
      
      // Check for various role patterns
      if (roleStr.includes('factory')) {
        normalizedRole = 'factory';
      } else if (roleStr.includes('planning')) {
        normalizedRole = 'planning';
      } else if (roleStr.includes('marketing')) {
        normalizedRole = 'marketing';
      } else if (roleStr.includes('shop')) {
        normalizedRole = 'shop';
      } else if (roleStr.includes('store')) {
        normalizedRole = 'store';
      } else if (roleStr.includes('finance')) {
        normalizedRole = 'finance';
      } else if (roleStr.includes('sample')) {
        normalizedRole = 'sample_maker';
      } else if (roleStr.includes('cutting')) {
        normalizedRole = 'cutting';
      } else if (roleStr.includes('sewing')) {
        normalizedRole = 'sewing';
      } else if (roleStr.includes('finishing')) {
        normalizedRole = 'finishing';
      } else if (roleStr.includes('packing')) {
        normalizedRole = 'packing';
      } else if (roleStr.includes('quality')) {
        normalizedRole = 'quality_inspection';
      } else if (roleStr.includes('designer')) {
        normalizedRole = 'designer';
      } else if (roleStr.includes('customer')) {
        normalizedRole = 'customer';
      } else {
        // If no pattern matches, convert to lowercase and use as is
        normalizedRole = roleStr as UserRole;
      }
    }
    
    console.log(`Normalized role: ${normalizedRole}`);
      return {
        ...user,
        role: normalizedRole,
        hasRole: (role: UserRole | UserRole[]) => {
          if (Array.isArray(role)) {
            return role.includes(normalizedRole);
          }
          return normalizedRole === role;
        }
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

// Helper function to check if user is store
export function isStoreUser(user: AuthenticatedUser | null): boolean {
  return user?.role === 'store';
}

// Helper function to check if user is finance
export function isFinanceUser(user: AuthenticatedUser | null): boolean {
  return user?.role === 'finance';
}

// Middleware function for API routes
export function withAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
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
export function withRoleAuth(
  handler: (request: NextRequest, user: AuthenticatedUser, context?: any) => Promise<Response>,
  requiredRole: UserRole | UserRole[]
) {
  return async (request: NextRequest, context: any) => {
    try {
      const user = await authenticateRequest(request);
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`Checking role for user ${user.username}. Role: ${user.role}, Required: ${requiredRole}`);
      if (!user.hasRole(requiredRole)) {
        console.log(`Role check failed for user ${user.username}. Role: ${user.role}, required one of: ${JSON.stringify(requiredRole)}`);
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.log(`Role check passed for user ${user.username}`);
      
      // Execute the handler and ensure a response is returned
      const result = await handler(request, user, context);
      return result;
    } catch (error) {
      console.error('Error in withRoleAuth middleware:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}