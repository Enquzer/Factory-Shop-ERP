'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Factory, 
  Users, 
  Settings, 
  BarChart3, 
  Calendar,
  AlertTriangle,
  Clock,
  TrendingUp,
  Layout
} from 'lucide-react';
import Link from 'next/link';

export default function IEDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOperations: 0,
    activeOrders: 0,
    efficiencyRate: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch IE operations count
      const operationsRes = await fetch('/api/ie/operations', { headers });
      if (operationsRes.ok) {
        const operations = await operationsRes.json();
        setStats(prev => ({ ...prev, totalOperations: operations.length }));
      } else if (operationsRes.status === 401) {
        console.error('Unauthorized access to IE operations API');
        // Don't show error to user, just set operations count to 0
        setStats(prev => ({ ...prev, totalOperations: 0 }));
      }

      // Fetch active marketing orders (this would need to be implemented)
      // const ordersRes = await fetch('/api/marketing-orders?status=active');
      // if (ordersRes.ok) {
      //   const orders = await ordersRes.json();
      //   setStats(prev => ({ ...prev, activeOrders: orders.length }));
      // }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Industrial Engineering</h1>
          <p className="text-muted-foreground">
            Standard Allowed Minutes, Line Balancing & Efficiency Management
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            {user?.role === 'ie_admin' ? 'IE Administrator' : 'IE User'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operations Library</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOperations}</div>
            <p className="text-xs text-muted-foreground">GSD/Pro-SMV Database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground">With IE Workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.efficiencyRate}%</div>
            <p className="text-xs text-muted-foreground">Line Performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">SAM Changes</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Operation Management
            </CardTitle>
            <CardDescription>
              Manage the GSD/Pro-SMV operation library and standards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/ie/operations">
                  <Factory className="mr-2 h-4 w-4" />
                  Operation Library
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/ie/ob-builder">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  OB Builder
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Create and maintain standard operation times for all production processes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Line Management
            </CardTitle>
            <CardDescription>
              Digital line balancing and resource planning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild className="flex-1 min-w-[140px]">
                <Link href="/ie/line-balancing">
                  <Users className="mr-2 h-4 w-4" />
                  Line Balancing
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1 min-w-[140px]">
                <Link href="/ie/layout-designer">
                  <Layout className="mr-2 h-4 w-4" />
                  Layout Designer
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1 min-w-[140px]">
                <Link href="/ie/efficiency">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Efficiency Monitor
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Optimize line layouts and monitor real-time production efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest IE module activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="bg-primary/10 p-2 rounded-full">
                <Factory className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Operation Library Updated</p>
                <p className="text-sm text-muted-foreground">New sewing operations added to database</p>
              </div>
              <Badge variant="secondary">Just now</Badge>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="bg-green-500/10 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Line Efficiency Improved</p>
                <p className="text-sm text-muted-foreground">Line 05 showing 85% efficiency rate</p>
              </div>
              <Badge variant="secondary">2 hours ago</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}