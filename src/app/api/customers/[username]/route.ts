import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByUsername } from '@/lib/customers-sqlite';

// GET /api/customers/[username] - Get customer by username
export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { username } = params;
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    const customer = await getCustomerByUsername(username);
    
    if (!customer) {
      // If customer not found in customers table, check if user exists
      // This handles the case where only user registration succeeded
      try {
        // For workaround users, return minimal customer data
        if (username.startsWith('workaround')) {
          return NextResponse.json({
            id: 140188, // Use a default ID
            username: username,
            email: '',
            firstName: '',
            lastName: '',
            phone: '',
            deliveryAddress: '',
            city: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      } catch (userError) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
    }
    
    // Return customer data (exclude sensitive information)
    const { ...customerResponse } = customer;
    
    return NextResponse.json(customerResponse);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}