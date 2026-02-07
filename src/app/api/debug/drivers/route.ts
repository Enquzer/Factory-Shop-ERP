import { NextRequest, NextResponse } from 'next/server';
import { getAllDrivers } from '@/lib/drivers-sqlite';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] /api/debug/drivers called');
    
    const drivers = await getAllDrivers();
    
    console.log('[DEBUG] getAllDrivers returned:', drivers.length, 'drivers');
    
    return NextResponse.json({
      success: true,
      count: drivers.length,
      drivers: drivers
    });
  } catch (error: any) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
