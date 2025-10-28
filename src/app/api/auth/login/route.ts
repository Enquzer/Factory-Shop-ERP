import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-sqlite';
import { AuthResult } from '@/lib/auth-sqlite';
import { authRateLimiter, getClientId, addRateLimitHeaders } from '@/lib/rate-limiter'; // Import rate limiter
import { handleErrorResponse, ValidationError, AuthenticationError } from '@/lib/error-handler'; // Import error handling
import { NextRequest } from 'next/server';

// POST /api/auth/login - Authenticate a user
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
    
    const { username, password } = await request.json();
    
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }
    
    // Add a small delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result: AuthResult = await authenticateUser(username, password);
    
    if (result.success) {
      // Reset rate limit on successful login
      authRateLimiter.resetLimit(clientId);
      
      // Create a simple JWT-like token (in a real implementation, you would use a proper JWT library)
      const tokenPayload = {
        userId: result.user?.id,
        username: result.user?.username,
        role: result.user?.role,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
      };
      
      // Simple base64 encoding (in a real implementation, you would sign the token)
      const token = btoa(JSON.stringify(tokenPayload));
      
      const response = NextResponse.json({
        ...result,
        token
      });
      
      // Add rate limit headers
      addRateLimitHeaders(response, limitStatus);
      return response;
    } else {
      throw new AuthenticationError(result.message || 'Invalid credentials');
    }
  } catch (error) {
    return handleErrorResponse(error);
  }
}