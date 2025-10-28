// Simple in-memory rate limiter (for production, you would use Redis or a database)
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  // Check if a client has exceeded the rate limit
  checkLimit(clientId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const clientData = this.requests.get(clientId);

    // If no record exists or the window has expired, create a new one
    if (!clientData || clientData.resetTime <= now) {
      const resetTime = now + this.windowMs;
      this.requests.set(clientId, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    // If the client has exceeded the limit, deny the request
    if (clientData.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: clientData.resetTime };
    }

    // Increment the request count
    clientData.count++;
    this.requests.set(clientId, clientData);
    return { allowed: true, remaining: this.maxRequests - clientData.count, resetTime: clientData.resetTime };
  }

  // Reset the rate limit for a client
  resetLimit(clientId: string): void {
    this.requests.delete(clientId);
  }

  // Get the current rate limit status for a client
  getLimitStatus(clientId: string): { count: number; remaining: number; resetTime: number } | null {
    const clientData = this.requests.get(clientId);
    if (!clientData) {
      return null;
    }

    const now = Date.now();
    if (clientData.resetTime <= now) {
      this.requests.delete(clientId);
      return null;
    }

    return {
      count: clientData.count,
      remaining: Math.max(0, this.maxRequests - clientData.count),
      resetTime: clientData.resetTime
    };
  }
}

// Create a global rate limiter instance
export const globalRateLimiter = new RateLimiter(60000, 1000); // 1000 requests per minute

// Create an authentication rate limiter (stricter limits)
export const authRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute for auth endpoints

// Create an API rate limiter
export const apiRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute for API endpoints

// Helper function to generate a client identifier
export function getClientId(request: Request): string {
  // Use IP address as client identifier
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') || 
             'unknown';
  
  // Include user agent to differentiate clients
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Include path to differentiate endpoints
  const path = new URL(request.url).pathname;
  
  return `${ip}-${userAgent}-${path}`;
}

// Helper function to add rate limit headers to response
export function addRateLimitHeaders(
  response: Response, 
  limitStatus: { allowed: boolean; remaining: number; resetTime: number }
): void {
  response.headers.set('X-RateLimit-Limit', '1000');
  response.headers.set('X-RateLimit-Remaining', limitStatus.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(limitStatus.resetTime).toISOString());
  
  if (!limitStatus.allowed) {
    response.headers.set('Retry-After', Math.ceil((limitStatus.resetTime - Date.now()) / 1000).toString());
  }
}