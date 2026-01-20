"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, parseISO } from "date-fns";
import { LoadingBar } from "@/components/loading-bar";
import { getOrders } from "@/lib/orders";
import { Order } from "@/lib/orders";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  Cell
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function FinanceReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const fetchedOrders = await getOrders();
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on date range and status
  const filteredOrders = orders.filter(order => {
    // Date filter
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = subDays(new Date(), days);
      const orderDate = parseISO(order.date);
      if (orderDate < cutoffDate) return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    
    return true;
  });

  // Calculate report data
  const calculateReportData = () => {
    const paidOrders = filteredOrders.filter(order => order.status === 'Paid');
    const pendingOrders = filteredOrders.filter(order => 
      order.status === 'Awaiting Payment' || order.status === 'Pending'
    );

    // Revenue by status
    const revenueByStatus = [
      {
        name: 'Paid',
        value: paidOrders.reduce((sum, order) => sum + order.amount, 0),
        count: paidOrders.length
      },
      {
        name: 'Pending Payment',
        value: pendingOrders.reduce((sum, order) => sum + order.amount, 0),
        count: pendingOrders.length
      }
    ];

    // Revenue trend by date
    const revenueByDate: Record<string, { date: string; revenue: number; orders: number }> = {};
    
    filteredOrders.forEach(order => {
      if (order.status === 'Paid') {
        const dateKey = format(parseISO(order.date), 'yyyy-MM-dd');
        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
        }
        revenueByDate[dateKey].revenue += order.amount;
        revenueByDate[dateKey].orders += 1;
      }
    });

    const revenueTrend = Object.values(revenueByDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Top shops by revenue
    const shopRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
    
    paidOrders.forEach(order => {
      if (!shopRevenue[order.shopName]) {
        shopRevenue[order.shopName] = { name: order.shopName, revenue: 0, orders: 0 };
      }
      shopRevenue[order.shopName].revenue += order.amount;
      shopRevenue[order.shopName].orders += 1;
    });

    const topShops = Object.values(shopRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalOrders: filteredOrders.length,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      totalRevenue: paidOrders.reduce((sum, order) => sum + order.amount, 0),
      pendingRevenue: pendingOrders.reduce((sum, order) => sum + order.amount, 0),
      revenueByStatus,
      revenueTrend,
      topShops,
      avgOrderValue: paidOrders.length > 0 
        ? paidOrders.reduce((sum, order) => sum + order.amount, 0) / paidOrders.length 
        : 0
    };
  };

  const reportData = calculateReportData();

  const exportReport = () => {
    // Simple CSV export
    const csvContent = [
      ['Shop Name', 'Order Date', 'Status', 'Amount'],
      ...filteredOrders.map(order => [
        order.shopName,
        order.date,
        order.status,
        order.amount.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingBar isLoading={true} message="Loading financial reports..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h1 className="text-2xl font-semibold text-destructive">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={fetchOrders}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">
            Detailed financial analysis and reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchOrders} variant="outline">
            Refresh Data
          </Button>
          <Button onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Date Range</label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Order Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Awaiting Payment">Awaiting Payment</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {reportData.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {reportData.paidOrders} paid orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {reportData.pendingRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {reportData.pendingOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Filtered orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {reportData.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per paid order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Status</CardTitle>
            <CardDescription>Distribution of revenue by order payment status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={reportData.revenueByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {reportData.revenueByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`ETB ${Number(value).toLocaleString()}`, 'Revenue']} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Shops</CardTitle>
            <CardDescription>Shops with highest revenue (paid orders only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.topShops.map((shop, index) => (
                <div key={shop.name} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{shop.name}</p>
                      <p className="text-sm text-muted-foreground">{shop.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">ETB {shop.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              
              {reportData.topShops.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p>No data available for selected period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue from paid orders</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.revenueTrend}>
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis tickFormatter={(value) => `ETB ${value.toLocaleString()}`} />
              <Tooltip 
                formatter={(value) => [`ETB ${Number(value).toLocaleString()}`, 'Revenue']}
                labelFormatter={(value) => format(new Date(value), 'MMMM d, yyyy')}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#8884d8" name="Daily Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}