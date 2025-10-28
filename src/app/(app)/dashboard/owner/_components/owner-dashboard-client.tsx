"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Package,
  Wallet,
  ShoppingCart,
  TrendingUp,
  Factory,
  Users,
  Percent,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  Calendar as CalendarIcon,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart as RechartsPieChart,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Area,
  AreaChart,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Order } from "@/lib/orders";
import { Product } from "@/lib/products";
import { Shop } from "@/lib/shops";
import { MarketingOrder } from "@/lib/marketing-orders";
import { LoadingBar } from "@/components/loading-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAuthHeaders } from "@/lib/auth-helpers";

const PIE_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
  quantity: {
    label: "Quantity",
  },
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-2))",
  },
  value: {
    label: "Value",
    color: "hsl(var(--chart-3))",
  },
};

type OwnerDashboardClientPageProps = {
  products: Product[];
  shops: Shop[];
  orders: Order[];
  marketingOrders: MarketingOrder[];
};

export function OwnerDashboardClientPage({ 
  products: initialProducts, 
  shops: initialShops, 
  orders: initialOrders, 
  marketingOrders: initialMarketingOrders 
}: OwnerDashboardClientPageProps) {
  const [products, setProducts] = useState(initialProducts);
  const [shops, setShops] = useState(initialShops);
  const [orders, setOrders] = useState(initialOrders);
  const [marketingOrders, setMarketingOrders] = useState(initialMarketingOrders);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Add timestamp to bust cache
      const timestamp = Date.now();
      
      // Get auth headers
      const authHeaders = createAuthHeaders();
      
      // Fetch fresh data
      const [freshProducts, freshShops, freshOrders, freshMarketingOrders] = await Promise.all([
        fetch(`/api/products?t=${timestamp}`, { headers: authHeaders }).then(res => res.json()),
        fetch(`/api/shops?t=${timestamp}`, { headers: authHeaders }).then(res => res.json()),
        fetch(`/api/orders?t=${timestamp}`, { headers: authHeaders }).then(res => res.json()),
        fetch(`/api/marketing-orders?t=${timestamp}`, { headers: authHeaders }).then(res => res.json())
      ]);

      setProducts(freshProducts);
      setShops(freshShops);
      setOrders(freshOrders);
      setMarketingOrders(freshMarketingOrders);
      
      // Fetch KPIs
      await fetchKpis();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKpis = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'owner-kpis'); // Add type parameter to specify report type
      if (date?.from) params.append('startDate', format(date.from, 'yyyy-MM-dd'));
      if (date?.to) params.append('endDate', format(date.to, 'yyyy-MM-dd'));
      if (selectedShop && selectedShop !== "all") params.append('shopId', selectedShop);
      if (selectedCategory && selectedCategory !== "all") params.append('category', selectedCategory);
      if (selectedOrderStatus && selectedOrderStatus !== "all") params.append('orderStatus', selectedOrderStatus);
      
      const response = await fetch(`/api/reports?${params.toString()}`, {
        headers: createAuthHeaders()
      });
      const kpiData = await response.json();
      setKpis(kpiData);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, [date, selectedShop, selectedCategory, selectedOrderStatus]);

  // Calculate KPIs if not loaded from API
  const calculateKpis = () => {
    if (kpis) return kpis;
    
    // Ensure we have arrays before trying to use array methods
    const safeShops = Array.isArray(shops) ? shops : [];
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeProducts = Array.isArray(products) ? products : [];
    const safeMarketingOrders = Array.isArray(marketingOrders) ? marketingOrders : [];
    
    // Fallback calculation if API fails
    const filteredOrders = safeOrders.filter(order => {
      if (!date?.from) return true;
      const to = date.to || new Date();
      const orderDate = parseISO(order.date);
      return orderDate >= date.from && orderDate <= to;
    });
    
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = filteredOrders.length;
    const activeShops = safeShops.filter(shop => shop.status === 'Active').length;
    
    return {
      totalSalesValue: totalSales,
      totalOrders,
      unitsProduced: safeMarketingOrders.reduce((sum, order) => sum + (order.quantity || 0), 0),
      activeShops,
      registeredShops: safeShops.length,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      unitsPerTransaction: 0,
      customerRetentionRate: 0,
      orderFulfillmentRate: 0,
      onTimeDeliveryRate: 0,
      marketingOrderCompletionRate: 0,
      bestSellingProduct: { name: 'N/A', quantity: 0 },
      topPerformingShop: { name: 'N/A', sales: 0 },
      salesGrowthMoM: 0,
      totalStockQuantity: safeProducts.reduce((sum, product) => sum + (product.variants || []).reduce((vSum, variant) => vSum + (variant.stock || 0), 0), 0),
      totalStockValue: safeProducts.reduce((sum, product) => sum + ((product.price || 0) * (product.variants || []).reduce((vSum, variant) => vSum + (variant.stock || 0), 0)), 0),
      lowStockAlerts: safeProducts.filter(product => {
        const totalStock = (product.variants || []).reduce((sum, variant) => sum + (variant.stock || 0), 0);
        return totalStock < (product.minimumStockLevel || 10);
      }).length,
      productionEfficiency: 0,
      shopRanking: [],
    };
  };

  // Use useEffect to avoid setState during render
  const [currentKpis, setCurrentKpis] = useState<any>(null);
  
  useEffect(() => {
    setCurrentKpis(calculateKpis());
  }, [kpis, shops, orders, products, marketingOrders, date]);

  // Prepare chart data - use API data when available, fallback to client calculation
  const salesData = useMemo(() => {
    // If we have KPIs from API with sales trend data, use that
    if (currentKpis?.salesTrend && Array.isArray(currentKpis.salesTrend)) {
      return currentKpis.salesTrend.map((item: any) => ({
        date: item.date,
        total: item.totalSales
      }));
    }
    
    // Fallback to client-side calculation
    return (Array.isArray(orders) ? orders : [])
      .filter(order => {
        if (!date?.from) return true;
        const to = date.to || new Date();
        const orderDate = parseISO(order.date);
        return orderDate >= date.from && orderDate <= to;
      })
      .reduce((acc: any[], order) => {
        const dateKey = format(parseISO(order.date), "yyyy-MM-dd");
        const existing = acc.find(item => item.date === dateKey);
        if (existing) {
          existing.total += order.amount;
        } else {
          acc.push({ date: dateKey, total: order.amount });
        }
        return acc;
      }, [])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [currentKpis, orders, date]);

  const shopPerformanceData = useMemo(() => {
    // If we have KPIs from API with shop ranking data, use that
    if (currentKpis?.shopRanking && Array.isArray(currentKpis.shopRanking)) {
      return currentKpis.shopRanking.slice(0, 5).map((shop: any, index: number) => ({
        name: shop.name,
        sales: shop.sales,
        fill: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
      }));
    }
    
    // Fallback to client-side calculation
    return [];
  }, [currentKpis]);

  // Enhanced category data with product images - use API data when available
  const categoryData = useMemo(() => {
    // If we have KPIs from API with category data, use that
    if (currentKpis?.categoryData && Array.isArray(currentKpis.categoryData)) {
      return currentKpis.categoryData.map((category: any) => ({
        category: category.name,
        value: category.value,
        products: category.topProducts || []
      }));
    }
    
    // Fallback to client-side calculation
    return (Array.isArray(products) ? products : []).reduce((acc: any[], product) => {
      const existing = acc.find(item => item.category === product.category);
      const stockValue = (product.price || 0) * (product.variants || []).reduce((sum, variant) => sum + (variant.stock || 0), 0);
      if (existing) {
        existing.value += stockValue;
        // Keep track of products in this category for image display
        if (!existing.products) existing.products = [];
        existing.products.push({
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          stockValue
        });
      } else {
        acc.push({ 
          category: product.category, 
          value: stockValue,
          products: [{
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            stockValue
          }]
        });
      }
      return acc;
    }, []);
  }, [currentKpis, products]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    return [...new Set((Array.isArray(products) ? products : []).map(product => product.category))];
  }, [products]);

  // Prepare best selling products data with images - use API data when available
  const bestSellingProducts = useMemo(() => {
    // If we have KPIs from API with best selling products data, use that
    if (currentKpis?.bestSellingProducts && Array.isArray(currentKpis.bestSellingProducts)) {
      return currentKpis.bestSellingProducts.slice(0, 5);
    }
    
    // Fallback to client-side calculation
    if (currentKpis?.productInfo) {
      return Object.values(currentKpis.productInfo)
        .sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0))
        .slice(0, 5);
    }
    
    return [];
  }, [currentKpis]);

  // Prepare stock information for display - use API data when available
  const stockInfo = useMemo(() => {
    // If we have KPIs from API with stock data, use that
    if (currentKpis?.stockInfo && Array.isArray(currentKpis.stockInfo)) {
      return currentKpis.stockInfo.slice(0, 5);
    }
    
    // Fallback to client-side calculation
    if (currentKpis?.stockByProduct) {
      return (currentKpis.stockByProduct as any[])
        .sort((a: any, b: any) => (b.totalValue || 0) - (a.totalValue || 0))
        .slice(0, 5);
    }
    
    return [];
  }, [currentKpis]);

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      setIsLoading(true);
      
      // Import the PDF generator function
      const { generateOwnerKPIReport } = await import('@/lib/pdf-generator');
      
      // Get the current filters
      const filters = {
        startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : null,
        endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : null,
        shopId: selectedShop,
        category: selectedCategory,
        orderStatus: selectedOrderStatus
      };
      
      // Generate the PDF
      const pdfBlob = await generateOwnerKPIReport(currentKpis || {}, filters);
      
      // Create a download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `owner-kpi-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      // Show error message to user
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <LoadingBar isLoading={isLoading} message="Refreshing dashboard data..." />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Owner KPI Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          {/* Filter Dropdowns */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Filter Options</h4>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label htmlFor="shop">Shop</label>
                    <Select value={selectedShop || "all"} onValueChange={(value) => setSelectedShop(value === "all" ? null : value)}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="All Shops" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shops</SelectItem>
                        {(Array.isArray(shops) ? shops : []).map(shop => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label htmlFor="category">Category</label>
                    <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label htmlFor="status">Order Status</label>
                    <Select value={selectedOrderStatus || "all"} onValueChange={(value) => setSelectedOrderStatus(value === "all" ? null : value)}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Awaiting Payment">Awaiting Payment</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Dispatched">Dispatched</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      // Trigger a refresh to apply filters
                      fetchKpis();
                    }}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      {/* Best Selling Products with Images */}
      {bestSellingProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Best Selling Products
            </CardTitle>
            <CardDescription>Top products by units sold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {bestSellingProducts.map((product: any) => (
                <div key={product.name} className="border rounded-lg p-3 flex flex-col items-center">
                  <div className="relative w-full h-32 mb-2 rounded overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm text-center truncate w-full">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{product.quantity || 0} units sold</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Category Performance with Product Images */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Category Performance
            </CardTitle>
            <CardDescription>Inventory value by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-[300px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <RechartsPieChart width={400} height={300}>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="category"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ChartContainer>
              </div>
              <div>
                <h4 className="font-medium mb-3">Top Products by Category</h4>
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {categoryData.map((category: any) => {
                    // Get top product in this category
                    const topProduct = (category.products || [])
                      .sort((a: any, b: any) => (b.stockValue || 0) - (a.stockValue || 0))[0];
                    
                    return (
                      <div key={category.category} className="flex items-center gap-3 p-2 border rounded">
                        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                          {topProduct?.imageUrl ? (
                            <img 
                              src={topProduct.imageUrl} 
                              alt={topProduct.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-product.png';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{category.category}</p>
                          <p className="text-xs text-muted-foreground truncate">{topProduct?.name || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">ETB {(category.value || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stock Information Card */}
      {stockInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Inventory Items
            </CardTitle>
            <CardDescription>Highest value products in stock</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockInfo.map((product: any) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right">{product.totalStock || 0}</TableCell>
                    <TableCell className="text-right">ETB {(product.totalValue || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Core KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Value</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {currentKpis?.totalSalesValue?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              +{(currentKpis?.salesGrowthMoM || 0).toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentKpis?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Order Fulfillment: {(currentKpis?.orderFulfillmentRate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shops</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentKpis?.activeShops || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {currentKpis?.registeredShops || 0} registered
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Produced</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentKpis?.unitsProduced || 0}</div>
            <p className="text-xs text-muted-foreground">
              Efficiency: {(currentKpis?.productionEfficiency || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {(currentKpis?.averageOrderValue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Units per Order: {(currentKpis?.unitsPerTransaction || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Retention</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(currentKpis?.customerRetentionRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              On-Time Delivery: {(currentKpis?.onTimeDeliveryRate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentKpis?.lowStockAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total Stock: {currentKpis?.totalStockQuantity || 0}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performing Shop</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{currentKpis?.topPerformingShop?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              ETB {(currentKpis?.topPerformingShop?.sales || 0)?.toLocaleString() || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Monthly Sales Growth</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {salesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <RechartsLineChart data={salesData} width={653} height={300}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value: string) => format(new Date(value), "MMM dd")}
                  />
                  <YAxis
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="var(--color-sales)" 
                    strokeWidth={2} 
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </RechartsLineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Shop Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {shopPerformanceData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <RechartsPieChart width={653} height={300}>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={shopPerformanceData}
                    dataKey="sales"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {shopPerformanceData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No shop performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Product Category Contribution</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <RechartsPieChart width={653} height={300}>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={categoryData} width={653} height={300}>
                  <XAxis
                    dataKey="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No stock data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Shop Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Shops</CardTitle>
          <CardDescription>Ranked by total sales value</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead className="text-right">Sales Value</TableHead>
                <TableHead className="text-right">Order Fulfillment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(currentKpis?.shopRanking || []).slice(0, 10).map((shop: any, index: number) => (
                <TableRow key={shop.id}>
                  <TableCell className="font-medium">#{index + 1}</TableCell>
                  <TableCell>{shop.name}</TableCell>
                  <TableCell className="text-right">ETB {shop.sales?.toLocaleString() || '0.00'}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">N/A</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!currentKpis?.shopRanking || currentKpis.shopRanking.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No shop ranking data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}