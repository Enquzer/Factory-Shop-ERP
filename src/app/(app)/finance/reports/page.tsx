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
  DollarSign,
  Truck,
  Box,
  Hash
} from "lucide-react";
import { getShops } from "@/lib/shops";
import { Shop } from "@/lib/shops";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format, subDays, parseISO, addDays } from "date-fns";
import { LoadingBar } from "@/components/loading-bar";
import { getOrders } from "@/lib/orders";
import { Order } from "@/lib/orders";
import { exportFinancialReportToPDF } from "@/lib/pdf-export-utils";
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
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'financial' | 'logistics'>('financial');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const fetchedOrders = await getOrders();
      setOrders(fetchedOrders);
      
      // Also fetch shops for the filter
      const fetchedShops = await getShops();
      setShops(fetchedShops);
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

    // Shop filter
    if (shopFilter !== 'all' && order.shopName !== shopFilter) {
      return false;
    }
    
    return true;
  });

  // Calculate Logistics stats
  const calculateLogisticsData = () => {
    const dispatchedOrders = filteredOrders.filter(order => order.status === 'Dispatched' || order.status === 'Delivered');
    
    const totalDispatchedQty = dispatchedOrders.reduce((total, order) => {
      return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);

    const totalDispatchedValue = dispatchedOrders.reduce((sum, order) => sum + order.amount, 0);

    return {
      dispatchedCount: dispatchedOrders.length,
      totalQty: totalDispatchedQty,
      totalValue: totalDispatchedValue,
      orders: dispatchedOrders.map(order => {
        const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          id: order.id,
          shopName: order.shopName,
          dispatchDate: order.actualDispatchDate || order.dispatchInfo?.dispatchDate || order.date,
          totalQty: totalQty,
          totalValue: order.amount,
          padNumber: order.padNumber || order.dispatchInfo?.padNumber || 'N/A',
          receiptNumber: order.dispatchInfo?.receiptNumber || 'N/A'
        };
      })
    };
  };

  const logisticsData = calculateLogisticsData();

  // Calculate report data
  const calculateReportData = () => {
    // Define status categories
    const REVENUE_STATUSES = ['Paid', 'Released', 'Dispatched', 'Delivered'];
    const PENDING_STATUSES = ['Pending', 'Awaiting Payment', 'Payment Slip Attached'];

    const paidOrders = filteredOrders.filter(order => REVENUE_STATUSES.includes(order.status));
    const pendingOrders = filteredOrders.filter(order => PENDING_STATUSES.includes(order.status));

    // Revenue by status
    const revenueByStatus = [
      {
        name: 'Confirmed Revenue',
        value: paidOrders.reduce((sum, order) => sum + order.amount, 0),
        count: paidOrders.length
      },
      {
        name: 'Pending Payment',
        value: pendingOrders.reduce((sum, order) => sum + order.amount, 0),
        count: pendingOrders.length
      }
    ];

    // Revenue trend by date (fill gaps for last 30 days or chosen range)
    const revenueByDate: Record<string, { date: string; revenue: number; orders: number }> = {};
    
    // Determine the timeline start
    const daysToTrack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 30;
    const startDate = subDays(new Date(), daysToTrack - 1);
    
    // Initialize the timeline with zero values
    for (let i = 0; i < daysToTrack; i++) {
      const date = addDays(startDate, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      revenueByDate[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
    }
    
    filteredOrders.forEach(order => {
      if (REVENUE_STATUSES.includes(order.status)) {
        const dateKey = format(parseISO(order.date), 'yyyy-MM-dd');
        if (revenueByDate[dateKey]) {
          revenueByDate[dateKey].revenue += order.amount;
          revenueByDate[dateKey].orders += 1;
        }
      }
    });

    const revenueTrend = Object.values(revenueByDate)
      .sort((a, b) => a.date.localeCompare(b.date));

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

  const exportToPDF = async () => {
    if (activeTab === 'financial') {
      await exportFinancialReportToPDF({
        title: "Financial Analysis Report",
        subtitle: `Period: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange}`}`,
        columns: ['Shop Name', 'Order Date', 'Status', 'Amount (ETB)'],
        data: filteredOrders.map(order => [
          order.shopName,
          format(new Date(order.date), 'MMM d, yyyy'),
          order.status,
          order.amount.toLocaleString()
        ]),
        summaryData: [
          { label: 'Total Revenue', value: `ETB ${reportData.totalRevenue.toLocaleString()}` },
          { label: 'Total Orders', value: reportData.totalOrders.toString() },
          { label: 'Paid Orders', value: reportData.paidOrders.toString() },
          { label: 'Avg Value', value: `ETB ${reportData.avgOrderValue.toLocaleString()}` },
        ],
        fileName: 'financial-analysis'
      });
    } else {
      await exportFinancialReportToPDF({
        title: "Logistics & Dispatch Report",
        subtitle: `Period: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange}`}`,
        columns: ['Date', 'Shop Name', 'Qty (Pcs)', 'Value (ETB)', 'PAD #', 'Receipt #'],
        data: logisticsData.orders.map(order => [
          format(new Date(order.dispatchDate), 'MMM d, yyyy'),
          order.shopName,
          order.totalQty.toString(),
          order.totalValue.toLocaleString(),
          order.padNumber,
          order.receiptNumber
        ]),
        summaryData: [
          { label: 'Dispatched Orders', value: logisticsData.dispatchedCount.toString() },
          { label: 'Total Items', value: logisticsData.totalQty.toLocaleString() },
          { label: 'Total Value', value: `ETB ${logisticsData.totalValue.toLocaleString()}` },
        ],
        fileName: 'logistics-report'
      });
    }
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
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
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
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Shop</label>
              <Select value={shopFilter} onValueChange={setShopFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops.map(shop => (
                    <SelectItem key={shop.id} value={shop.name}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="financial">
            <BarChart3 className="mr-2 h-4 w-4" />
            Financial Analysis
          </TabsTrigger>
          <TabsTrigger value="logistics">
            <Truck className="mr-2 h-4 w-4" />
            Logistics Report
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="financial" className="space-y-6 pt-4">
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
                <CardDescription>Shops with highest revenue (confirmed orders only)</CardDescription>
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
              <CardDescription>Daily revenue from confirmed orders</CardDescription>
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
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dispatched Orders</CardTitle>
                <Truck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{logisticsData.dispatchedCount}</div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items Dispatched</CardTitle>
                <Box className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{logisticsData.totalQty.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Pieces delivered</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Logistics Value</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">ETB {logisticsData.totalValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Value of transit/delivered</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logistics & Dispatch Log</CardTitle>
                <CardDescription>Detailed record of all dispatched items</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {logisticsData.orders.length} Records
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Shop Name</th>
                      <th className="px-4 py-3 text-left font-medium">Qty (Pcs)</th>
                      <th className="px-4 py-3 text-left font-medium">Value (ETB)</th>
                      <th className="px-4 py-3 text-left font-medium">
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          PAD #
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-medium font-mono">
                        <div className="flex items-center gap-1 font-sans">
                          <FileText className="h-3 w-3" />
                          Receipt #
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logisticsData.orders.map((order, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {format(new Date(order.dispatchDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 font-medium">{order.shopName}</td>
                        <td className="px-4 py-3">{order.totalQty}</td>
                        <td className="px-4 py-3 font-medium">ETB {order.totalValue.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {order.padNumber}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{order.receiptNumber}</td>
                      </tr>
                    ))}
                    {logisticsData.orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No dispatch records found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}