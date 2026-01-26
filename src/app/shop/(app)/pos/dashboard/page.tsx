"use client";
/** POS Dashboard - Fixed Module Resolution */


import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Calendar, 
  BarChart3, 
  Award,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import VisitorCounterUpdated from '@/components/visitor-counter-updated';
import { toast } from '@/hooks/use-toast';

type SalesSummary = {
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  unitsPerTransaction: number;
};

type BestSellingProduct = {
  name: string;
  productId: string;
  color: string;
  size: string;
  category: string;
  quantity: number;
  totalSales: number;
  imageUrl?: string;
};

type DailySalesData = {
  date: string;
  sales: number;
  transactions: number;
};

export default function POSDashboardPage() {
  const { user } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [bestSellingProducts, setBestSellingProducts] = useState<BestSellingProduct[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get shopId for the current user
  useEffect(() => {
    if (!user || user.role !== 'shop') return;

    const fetchShopId = async () => {
      try {
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const shop = await response.json();
          if (shop) {
            setShopId(shop.id);
          }
        }
      } catch (error) {
        console.error('Error fetching shop ID:', error);
        setError('Failed to load shop data');
      }
    };

    fetchShopId();
  }, [user?.username]);

  useEffect(() => {
    if (shopId) {
      fetchDashboardData();
    }
  }, [shopId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch sales summary
      const summaryResponse = await fetch(`/api/pos/sales-summary?shopId=${shopId}`);
      if (summaryResponse.ok) {
        const summary = await summaryResponse.json();
        setSalesSummary(summary);
      }
      
      // Fetch best selling products
      const productsResponse = await fetch(`/api/pos/best-selling?shopId=${shopId}&limit=5`);
      if (productsResponse.ok) {
        const products = await productsResponse.json();
        setBestSellingProducts(products);
      }
      
      // Fetch daily sales data
      const dailyResponse = await fetch(`/api/pos/daily-sales?shopId=${shopId}&days=7`);
      if (dailyResponse.ok) {
        const daily = await dailyResponse.json();
        setDailySales(daily);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">POS Dashboard</h1>
          <p className="text-muted-foreground">Track your sales performance and metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <VisitorCounterUpdated />
          <Button onClick={() => window.location.href = '/shop/pos'}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Open POS
          </Button>
        </div>
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {salesSummary?.totalSales?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesSummary?.totalTransactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {salesSummary?.averageTransactionValue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average value per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Per Transaction</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesSummary?.unitsPerTransaction?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Items per customer visit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesSummary?.totalTransactions ? 
                ((salesSummary.totalTransactions / 100) * 100).toFixed(1) + '%' : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Visitors to buyers ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Sales (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailySales.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{day.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ETB {day.sales.toLocaleString()}</span>
                    <Badge variant="secondary">{day.transactions} txns</Badge>
                  </div>
                </div>
              ))}
              {dailySales.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No sales data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Best Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Best Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bestSellingProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.color}, {product.size} • {product.quantity} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">ETB {product.totalSales.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {bestSellingProducts.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No sales data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Recent sales will appear here</p>
            <p className="text-sm mt-2">Process sales through the POS to see activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}