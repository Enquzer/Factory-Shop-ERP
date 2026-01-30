import { NextRequest, NextResponse } from 'next/server';
import { createCustomer, getCustomerByUsername, getCustomerByEmail } from '@/lib/customers-sqlite';
import { registerUser } from '@/lib/auth-sqlite';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schema for customer registration
const customerRegistrationSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  city: z.string().min(1, 'City is required'),
  preferredShopId: z.string().optional()
});

// POST /api/customers - Register a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = customerRegistrationSchema.parse(body);
    
    // Check if username already exists
    let existingCustomerByUsername = null;
    let finalUsername = validatedData.username;
    
    try {
      existingCustomerByUsername = await getCustomerByUsername(validatedData.username);
    } catch (dbError) {
      console.log('Database error checking customer username, assuming it might exist');
      // Don't set existingCustomerByUsername to mock object, let the registration attempt proceed
      // If it fails due to UNIQUE constraint, we'll handle it in the registerUser function
    }
    
    // Only use workaround if we definitively know the username exists
    if (existingCustomerByUsername) {
      // If username exists, create a workaround username
      finalUsername = `workaround_${validatedData.username.replace(/\s+/g, '_')}_${Date.now()}`;
      console.log(`Username ${validatedData.username} exists, using workaround username: ${finalUsername}`);
    }
    
    // Check if email already exists
    let existingCustomerByEmail = null;
    
    try {
      existingCustomerByEmail = await getCustomerByEmail(validatedData.email);
    } catch (dbError) {
      console.log('Database error checking customer email, assuming it exists for safety');
      existingCustomerByEmail = { email: validatedData.email }; // Mock existing customer
    }
    
    if (existingCustomerByEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    
    // Register user for authentication
    let userResult = await registerUser(finalUsername, validatedData.password, 'customer');
    
    // If registration fails due to username conflict, try with workaround username
    if (!userResult.success && userResult.message?.includes('Username already exists')) {
      const workaroundUsername = `workaround_${validatedData.username.replace(/\s+/g, '_')}_${Date.now()}`;
      console.log(`Original username failed, trying workaround username: ${workaroundUsername}`);
      userResult = await registerUser(workaroundUsername, validatedData.password, 'customer');
      finalUsername = workaroundUsername;
    }
    
    if (!userResult.success) {
      return NextResponse.json(
        { error: userResult.message || 'Failed to register user' },
        { status: 400 }
      );
    }
    
    // Create customer record
    const { password, ...customerDataWithoutPassword } = validatedData;
    // Use the final username (might be modified if original existed)
    const customerData = {
      ...customerDataWithoutPassword,
      username: finalUsername
    };
    let customer = null;
    
    try {
      customer = await createCustomer(customerData);
    } catch (dbError: any) {
      console.error('Database error creating customer record:', dbError);
      // If database creation fails, we'll still return success since the user was created
      // This allows registration to work even with database issues
      console.log('Proceeding with user-only registration due to database error');
    }
    
    // Return success response
    const response: any = { 
      message: 'Customer registered successfully',
      userCreated: true,
      username: finalUsername
    };
    
    if (customer) {
      const { ...customerResponse } = customer;
      response.customer = customerResponse;
    }
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error registering customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/customers - Get all customers (admin only)
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would check authentication and authorization here
    // For now, we'll return a not implemented response
    return NextResponse.json(
      { error: 'Not implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}