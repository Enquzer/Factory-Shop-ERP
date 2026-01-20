import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Add your production domains here
  process.env.NEXT_PUBLIC_BASE_URL ? process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '') : '',
  // Add additional production domains as needed
  // 'https://yourdomain.com',
  // 'https://www.yourdomain.com',
].filter(origin => origin !== '');

// Helper function to check if origin is allowed
function isOriginAllowed(origin: string): boolean {
  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // In production, check against allowed origins
  return allowedOrigins.includes(origin);
}

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    
    if (isOriginAllowed(origin)) {
      addCorsHeaders(response, origin);
    }
    
    return response;
  }
  
  // Handle regular requests
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Add CORS headers if origin is allowed
  if (isOriginAllowed(origin)) {
    addCorsHeaders(response, origin);
  }
  
  // Remove predictable rate limiting headers to prevent information disclosure
  // (These were removed to prevent exposing system information)
  
  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};