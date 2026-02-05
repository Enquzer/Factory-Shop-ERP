import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByUsername, updateCustomer, createCustomer } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/customers/[username] - Get customer by username
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    const customer = await getCustomerByUsername(username);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/customers/[username] - Update customer details
export async function PUT(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure user is updating their own profile or is an admin
    if (authResult.username !== username && authResult.role !== 'admin' && authResult.role !== 'factory') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { firstName, lastName, phone, deliveryAddress, city, preferredShopId, email } = body;
    
    let customer = await getCustomerByUsername(username);
    
    let success = false;
    if (!customer) {
      // If customer record doesn't exist but user is authenticated, create it
      // This can happen if a user was created as 'customer' role but database 
      // insertion for customer details failed or was skipped.
      try {
        await createCustomer({
          username,
          email: email || `${username}@example.com`, // Fallback email if not provided
          firstName: firstName || '',
          lastName: lastName || '',
          phone: phone || '',
          deliveryAddress: deliveryAddress || '',
          city: city || 'Addis Ababa',
          preferredShopId
        });
        success = true;
      } catch (createError) {
        console.error('Error creating missing customer record:', createError);
        return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
      }
    } else {
      success = await updateCustomer(customer.id, {
        firstName,
        lastName,
        phone,
        deliveryAddress,
        city,
        preferredShopId
      });
    }
    
    if (success) {
      const updatedCustomer = await getCustomerByUsername(username);
      return NextResponse.json(updatedCustomer);
    } else {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
