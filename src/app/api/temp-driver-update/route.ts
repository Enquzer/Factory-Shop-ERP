import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// Temporary endpoint to update driver status for debugging
export async function POST(request: NextRequest) {
  try {
    console.log('[TEMP UPDATE] Updating driver status...');
    
    const { name, status } = await request.json();
    
    if (!name || !status) {
      return NextResponse.json({ error: 'Name and status required' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Update driver status
    const result = await db.run(
      "UPDATE drivers SET status = ? WHERE name = ?", 
      [status, name]
    );
    
    console.log('[TEMP UPDATE] Rows affected:', result.changes);
    
    // Get updated driver
    const updatedDriver = await db.get(
      "SELECT id, name, status, vehicleType FROM drivers WHERE name = ?", 
      [name]
    );
    
    console.log('[TEMP UPDATE] Updated driver:', updatedDriver);
    
    return NextResponse.json({ 
      success: true, 
      message: `Driver ${name} status updated to ${status}`,
      driver: updatedDriver
    });
    
  } catch (error) {
    console.error('[TEMP UPDATE] Error:', error);
    return NextResponse.json({ error: 'Failed to update driver status' }, { status: 500 });
  }
}

// Get driver status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({ error: 'Name parameter required' }, { status: 400 });
    }
    
    const db = await getDB();
    const driver = await db.get(
      "SELECT id, name, status, vehicleType FROM drivers WHERE name = ?", 
      [name]
    );
    
    return NextResponse.json({ driver });
    
  } catch (error) {
    console.error('[TEMP GET] Error:', error);
    return NextResponse.json({ error: 'Failed to get driver status' }, { status: 500 });
  }
}