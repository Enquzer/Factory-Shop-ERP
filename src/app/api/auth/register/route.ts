import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth-sqlite';
import { AuthResult } from '@/lib/auth-sqlite';
import { authRateLimiter, getClientId, addRateLimitHeaders } from '@/lib/rate-limiter'; // Import rate limiter
import { handleErrorResponse, ValidationError } from '@/lib/error-handler'; // Import error handling
import { NextRequest } from 'next/server';
import { userSchema, sanitizeInput } from '@/lib/validation'; // Import validation

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientId(request);
    const limitStatus = authRateLimiter.checkLimit(clientId);
    
    if (!limitStatus.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      addRateLimitHeaders(response, limitStatus);
      return response;
    }
    
    const { username, password, role } = await request.json();
    
    // Sanitize input data
    const sanitizedData = sanitizeInput({ username, password, role });
    
    // Validate input data
    try {
      userSchema.parse(sanitizedData);
    } catch (validationError: any) {
      throw new ValidationError('Invalid input data', validationError.errors);
    }
    
    if (!sanitizedData.username || !sanitizedData.password || !sanitizedData.role) {
      throw new ValidationError('Username, password, and role are required');
    }
    
    const result: AuthResult = await registerUser(sanitizedData.username, sanitizedData.password, sanitizedData.role as 'factory' | 'shop');
    
    if (result.success) {
      // Reset rate limit on successful registration
      authRateLimiter.resetLimit(clientId);
      
      return NextResponse.json(result, { status: 201 });
    } else {
      throw new Error(result.message || 'Failed to register user');
    }
  } catch (error) {
    return handleErrorResponse(error);
  }
}