
import {
  ArrowDownUp,
  Building2,
  Package,
  Wallet,
  Trophy,
  TrendingUp,
  Star,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  Cell,
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
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { getOrders, type Order } from "@/lib/orders";
import { getProducts, type Product } from "@/lib/products";
import { getShops, type Shop } from "@/lib/shops";
import { DashboardClientPage } from "./_components/dashboard-client";

const LOW_STOCK_THRESHOLD = 10;

const PIE_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const getLowStockItems = (products: Product[]) => {
    const lowStockItems: { id: string; name: string; category: string; stock: number; isLow: boolean; }[] = [];
    products.forEach(product => {
        product.variants.forEach(variant => {
            if (variant.stock < LOW_STOCK_THRESHOLD) {
                lowStockItems.push({
                    id: `${product.id}-${variant.id}`,
                    name: `${product.name} (${variant.color}, ${variant.size})`,
                    category: product.category,
                    stock: variant.stock,
                    isLow: true,
                });
            }
        });
    });
    return lowStockItems;
};

export default async function DashboardPage() {
    const [products, orders, shops] = await Promise.all([
      getProducts(),
      getOrders(),
      getShops()
    ]);
  
    const metrics = {
      totalProducts: products.length,
      registeredShops: shops.length,
      activeOrders: orders.filter(o => o.status === 'Pending' || o.status === 'Dispatched').length,
      recentOrders: orders.slice(0, 4)
    };
  
    const lowStockItems = getLowStockItems(products);
  
    return (
        <DashboardClientPage
            products={products}
            orders={orders}
            shops={shops}
            metrics={metrics}
            lowStockItems={lowStockItems}
        />
    )
}
