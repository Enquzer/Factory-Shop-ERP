import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Initialize analytics table
async function initializeAnalyticsTable() {
  try {
    const db = await getDb();
    
    // Create analytics table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS website_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventType TEXT NOT NULL,
        userAgent TEXT,
        ipAddress TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        pageUrl TEXT,
        referrer TEXT,
        screenWidth INTEGER,
        screenHeight INTEGER,
        deviceType TEXT
      )
    `);
    
    console.log('Analytics table initialized');
  } catch (error) {
    console.error('Error initializing analytics table:', error);
  }
}

// Initialize the table when the module loads
initializeAnalyticsTable().catch(console.error);

// POST /api/analytics - Track website events
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const db = await getDb();
    
    // Insert analytics event
    await db.run(`
      INSERT INTO website_analytics (
        eventType, userAgent, ipAddress, pageUrl, referrer, 
        screenWidth, screenHeight, deviceType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, 
    data.eventType || 'page_view',
    data.userAgent || null,
    data.ipAddress || null,
    data.pageUrl || null,
    data.referrer || null,
    data.screenWidth || null,
    data.screenHeight || null,
    data.deviceType || null
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

// GET /api/analytics - Get analytics summary (protected - factory only)
export async function GET(request: Request) {
  try {
    // In a real implementation, you would authenticate the user
    // For now, we'll return a basic summary
    
    const db = await getDb();
    
    // Get total page views
    const totalViews = await db.get(`
      SELECT COUNT(*) as count FROM website_analytics 
      WHERE eventType = 'page_view'
    `);
    
    // Get unique visitors
    const uniqueVisitors = await db.get(`
      SELECT COUNT(DISTINCT ipAddress) as count FROM website_analytics 
      WHERE ipAddress IS NOT NULL
    `);
    
    // Get popular pages
    const popularPages = await db.all(`
      SELECT pageUrl, COUNT(*) as count FROM website_analytics 
      WHERE eventType = 'page_view' AND pageUrl IS NOT NULL
      GROUP BY pageUrl
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Get device types
    const deviceTypes = await db.all(`
      SELECT deviceType, COUNT(*) as count FROM website_analytics 
      WHERE deviceType IS NOT NULL
      GROUP BY deviceType
      ORDER BY count DESC
    `);
    
    return NextResponse.json({
      totalViews: totalViews?.count || 0,
      uniqueVisitors: uniqueVisitors?.count || 0,
      popularPages,
      deviceTypes
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}