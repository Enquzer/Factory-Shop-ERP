// API endpoint for dynamic rerouting services
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { dynamicRoutingService, checkAndOptimizeRoutes } from '@/lib/dynamic-routing';

// GET /api/dynamic-routing/traffic - Get current traffic conditions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'conditions';
    
    switch (action) {
      case 'conditions':
        const conditions = await dynamicRoutingService.monitorTrafficConditions();
        return NextResponse.json({
          success: true,
          trafficConditions: conditions,
          timestamp: new Date().toISOString()
        });
        
      case 'analyze':
        const clusterId = searchParams.get('clusterId');
        if (!clusterId) {
          return NextResponse.json({
            error: 'Missing clusterId parameter'
          }, { status: 400 });
        }
        
        const analysis = await dynamicRoutingService.analyzeRouteEfficiency(clusterId);
        return NextResponse.json({
          success: true,
          clusterId,
          analysis,
          timestamp: new Date().toISOString()
        });
        
      case 'optimize':
        const clusterIdForOptimization = searchParams.get('clusterId');
        if (!clusterIdForOptimization) {
          return NextResponse.json({
            error: 'Missing clusterId parameter'
          }, { status: 400 });
        }
        
        const optimizations = await dynamicRoutingService.suggestRouteOptimizations(clusterIdForOptimization);
        return NextResponse.json({
          success: true,
          clusterId: clusterIdForOptimization,
          suggestedOptimizations: optimizations,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter',
          validActions: ['conditions', 'analyze', 'optimize']
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Dynamic routing API error:', error);
    return NextResponse.json({
      error: 'Failed to process request',
      details: error.message
    }, { status: 500 });
  }
}

// POST /api/dynamic-routing/optimize - Apply route optimization
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { clusterId, newRoute } = body;
    
    if (!clusterId || !newRoute) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['clusterId', 'newRoute']
      }, { status: 400 });
    }
    
    const success = await dynamicRoutingService.applyDynamicRerouting(clusterId, newRoute);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Route optimization applied successfully',
        clusterId,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        error: 'Failed to apply route optimization'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Dynamic routing optimization error:', error);
    return NextResponse.json({
      error: 'Failed to apply route optimization',
      details: error.message
    }, { status: 500 });
  }
}

// PUT /api/dynamic-routing/auto-optimize - Trigger automatic route optimization for all clusters
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    // Trigger automatic optimization check
    await checkAndOptimizeRoutes();
    
    return NextResponse.json({
      success: true,
      message: 'Automatic route optimization check completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Auto optimization error:', error);
    return NextResponse.json({
      error: 'Failed to perform automatic optimization',
      details: error.message
    }, { status: 500 });
  }
}