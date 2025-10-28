import { NextResponse } from 'next/server';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public details?: any;
  
  constructor(message: string, details?: any) {
    super(message, 400);
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// Centralized error response handler
export function handleErrorResponse(error: any): NextResponse {
  // Log the error for debugging (in production, you might want to use a proper logging service)
  console.error('Application error:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...(error.details ? { details: error.details } : {})
  });

  // Handle known error types
  if (error instanceof ValidationError) {
    // For operational errors, return appropriate status code and message
    if (process.env.NODE_ENV === 'production' && !error.isOperational) {
      // In production, don't expose internal errors to clients
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const response: any = { error: error.message };
    if (error.details) {
      response.details = error.details;
    }

    return NextResponse.json(response, { status: error.statusCode });
  }
  
  if (error instanceof AppError) {
    // For operational errors, return appropriate status code and message
    if (process.env.NODE_ENV === 'production' && !error.isOperational) {
      // In production, don't expose internal errors to clients
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return NextResponse.json(
      { 
        error: 'Validation failed', 
        details: error.errors 
      },
      { status: 400 }
    );
  }

  // Handle database errors
  if (error.code === 'SQLITE_CONSTRAINT') {
    return NextResponse.json(
      { error: 'Data constraint violation' },
      { status: 400 }
    );
  }

  // Handle generic errors
  if (process.env.NODE_ENV === 'production') {
    // In production, don't expose internal errors to clients
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  // In development, provide more detailed error information
  return NextResponse.json(
    { 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    },
    { status: 500 }
  );
}

// Helper function to wrap async route handlers with error handling
export function withErrorHandling(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleErrorResponse(error);
    }
  };
}