import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getEfficiencyReport, getSAMAnalysis, getLinePerformance, getIEKPIs, getEfficiencyAlerts } from '@/lib/ie-reports';

export const GET = withRoleAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    const results: any = {};

    if (type === 'efficiency' || type === 'all') {
      results.efficiency = await getEfficiencyReport();
    }
    
    if (type === 'sam' || type === 'all') {
      results.sam = await getSAMAnalysis();
    }
    
    if (type === 'performance' || type === 'all') {
      results.performance = await getLinePerformance();
    }
    
    if (type === 'kpi' || type === 'all') {
      results.kpis = await getIEKPIs();
    }

    if (type === 'alerts' || type === 'all') {
      results.alerts = await getEfficiencyAlerts();
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching IE reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);
