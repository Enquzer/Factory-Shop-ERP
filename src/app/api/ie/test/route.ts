import { NextResponse } from 'next/server';

// Simple test route to verify IE module access
export async function GET() {
  return NextResponse.json({ 
    message: "IE Module is working!", 
    timestamp: new Date().toISOString(),
    status: "OK"
  });
}