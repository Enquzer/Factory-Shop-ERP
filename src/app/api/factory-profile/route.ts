import { NextRequest, NextResponse } from 'next/server';
import { getFactoryProfile, updateFactoryProfile } from '@/lib/factory-profile-sqlite';
import { withRoleAuth } from '@/lib/auth-middleware';
import { sanitizeInput } from '@/lib/validation';
import { handleErrorResponse, ValidationError } from '@/lib/error-handler';

export async function GET() {
  try {
    const profile = await getFactoryProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Factory profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const handler = withRoleAuth(async (req, user) => {
    try {
      const body = await req.json();
      const sanitizedData = sanitizeInput(body);

      // Validate basic fields
      if (sanitizedData.name === '') throw new ValidationError('Factory name is required');
      
      const success = await updateFactoryProfile(sanitizedData);
      
      if (success) {
        return NextResponse.json({ message: 'Factory profile updated successfully' });
      } else {
        throw new Error('Failed to update factory profile');
      }
    } catch (error) {
      return handleErrorResponse(error);
    }
  }, 'factory');

  return handler(request);
}
