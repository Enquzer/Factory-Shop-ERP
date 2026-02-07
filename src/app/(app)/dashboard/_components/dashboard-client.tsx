"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { useSystemSettings } from "@/contexts/system-settings-context";
import {
  ArrowDownUp,
  Building2,
  Package,
  Wallet,
  Trophy,
  TrendingUp,
  Star,
  Calendar as CalendarIcon,
  RefreshCw,
  ShoppingCart,
  Factory,
  Users,
  Percent,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  ChevronDown,
  Image as ImageIcon,
  Layers,
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
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ComposedChart,
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
import { useResponsive } from "@/contexts/responsive-context";
import {
  ResponsiveGrid,
  ResponsiveGridItem,
} from "@/components/responsive-grid";
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
    label: "Total Sales",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  quantity: {
    label: "Quantity",
    color: "hsl(var(--chart-2))",
  },
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
  value: {
    label: "Value",
    color: "hsl(var(--chart-3))",
  },
};

const CustomXAxisTick = (props: any) => {
  const { x, y, payload, bestSelling, isMobile } = props;
  const item = bestSelling?.find((p: any) => p.name === payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={isMobile ? 9 : 11}
        fontWeight="500"
      >
        {payload.value}
      </text>
      {item?.imageUrl && (
        <g>
          <defs>
            <clipPath id={`clip-tick-${payload.value.replace(/\s+/g, "-")}`}>
              <circle cx="0" cy="35" r="15" />
            </clipPath>
          </defs>
          <circle
            cx="0"
            cy="35"
            r="16"
            fill="white"
            stroke={item.fill || "hsl(var(--primary))"}
            strokeWidth="1"
          />
          <image
            x={-15}
            y={20}
            width="30"
            height="30"
            xlinkHref={item.imageUrl}
            href={item.imageUrl}
            style={{
              clipPath: `url(#clip-tick-${payload.value.replace(/\s+/g, "-")})`,
            }}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}
    </g>
  );
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload, stockInfo } = props;
  const item = stockInfo?.find((p: any) => p.name === payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-150} y={-20} width={140} height={40}>
        <div className="flex items-center justify-end h-full gap-2 w-full">
          <div className="h-8 w-8 rounded overflow-hidden bg-muted flex-shrink-0 relative border border-border">
            {item?.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <span
            className="text-xs font-medium truncate text-right max-w-[90px]"
            title={payload.value}
          >
            {payload.value}
          </span>
        </div>
      </foreignObject>
    </g>
  );
};

const CustomBarLabel = (props: any) => {
  const { x, y, width, height, value, index, stockInfo } = props;
  const item = stockInfo?.[index];

  if (!item) return null;

  // Render inside if bar is wide enough, otherwise outside
  const isInside = width > 60;
  const contentX = isInside ? x + width - 5 : x + width + 5;
  const textColor = isInside ? "white" : "black";
  const textAnchor = isInside ? "end" : "start";

  return (
    <text
      x={contentX}
      y={y + height / 2 + 4}
      fill={textColor}
      fontSize={10}
      fontWeight="600"
      textAnchor={textAnchor}
    >
      {item.totalStock} units
    </text>
  );
};

const ShopSalesLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  
  const isInside = width > 80;
  const contentX = isInside ? x + width - 5 : x + width + 5;
  const textColor = isInside ? "white" : "black";
  const textAnchor = isInside ? "end" : "start";

  return (
    <text x={contentX} y={y + height / 2 + 4} fill={textColor} fontSize={10} fontWeight="600" textAnchor={textAnchor}>
      ETB {value.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact" })}
    </text>
  );
};

const ShopQuantityLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;

  const isInside = width > 40;
  const contentX = isInside ? x + width - 5 : x + width + 5;
  const textColor = isInside ? "white" : "black";
  const textAnchor = isInside ? "end" : "start";

  return (
    <text x={contentX} y={y + height / 2 + 3} fill={textColor} fontSize={9} fontWeight="500" textAnchor={textAnchor}>
      {value}
    </text>
  );
};

type DashboardClientPageProps = {
  products: Product[];
  orders: Order[];
  shops: Shop[];
  marketingOrders: MarketingOrder[];
  rawMaterials: any[]; // Raw materials from /api/raw-materials
};

export function DashboardClientPage({
  products: initialProducts,
  orders: initialOrders,
  shops: initialShops,
  marketingOrders: initialMarketingOrders,
  rawMaterials: initialRawMaterials,
}: DashboardClientPageProps) {
  const [products, setProducts] = useState(
    Array.isArray(initialProducts) ? initialProducts : []
  );
  const [shops, setShops] = useState(
    Array.isArray(initialShops) ? initialShops : []
  );
  const [orders, setOrders] = useState(
    Array.isArray(initialOrders) ? initialOrders : []
  );
  const [marketingOrders, setMarketingOrders] = useState(
    Array.isArray(initialMarketingOrders) ? initialMarketingOrders : []
  );
  const [rawMaterials, setRawMaterials] = useState(
    Array.isArray(initialRawMaterials) ? initialRawMaterials : []
  );
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string | null>(
    null
  );
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'finance') {
      router.replace('/finance/reports');
    } else if (user?.role === 'store') {
      router.replace('/store');
    }
  }, [user, router]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const authHeaders = createAuthHeaders();

      const [freshProducts, freshShops, freshOrders, freshMarketingOrders, freshRawMaterials] =
        await Promise.all([
          fetch(`/api/products?t=${timestamp}`, { headers: authHeaders }).then(
            (res) => res.json()
          ),
          fetch(`/api/shops?t=${timestamp}&limit=0`, {
            headers: authHeaders,
          }).then((res) => res.json()), // limit=0 to get all shops
          fetch(`/api/orders?t=${timestamp}`, { headers: authHeaders }).then(
            (res) => res.json()
          ),
          fetch(`/api/marketing-orders?t=${timestamp}`, {
            headers: authHeaders,
          }).then((res) => res.json()),
          fetch(`/api/raw-materials?t=${timestamp}`, { headers: authHeaders }).then(
            (res) => res.json()
          ),
        ]);

      setProducts(
        Array.isArray(freshProducts)
          ? freshProducts
          : freshProducts?.products || []
      );
      setShops(
        Array.isArray(freshShops) ? freshShops : freshShops?.shops || []
      );
      setOrders(
        Array.isArray(freshOrders) ? freshOrders : freshOrders?.orders || []
      );
      setMarketingOrders(
        Array.isArray(freshMarketingOrders)
          ? freshMarketingOrders
          : freshMarketingOrders?.marketingOrders || []
      );
      setRawMaterials(
        Array.isArray(freshRawMaterials)
          ? freshRawMaterials
          : freshRawMaterials?.rawMaterials || []
      );

      await fetchKpis();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKpis = async () => {
    try {
      const params = new URLSearchParams();
      params.append("type", "owner-kpis");
      if (date?.from) {
        params.append("startDate", format(date.from, "yyyy-MM-dd"));
      } else {
        // Default to "All Time" if no date selected (starts from 2020)
        params.append("startDate", "2020-01-01");
      }

      if (date?.to) {
        params.append("endDate", format(date.to, "yyyy-MM-dd"));
      } else {
        // Default to far future for "All Time"
        params.append(
          "endDate",
          format(
            new Date().setFullYear(new Date().getFullYear() + 1),
            "yyyy-MM-dd"
          )
        );
      }
      if (selectedShop && selectedShop !== "all")
        params.append("shopId", selectedShop);
      if (selectedCategory && selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (selectedOrderStatus && selectedOrderStatus !== "all")
        params.append("orderStatus", selectedOrderStatus);

      const response = await fetch(`/api/reports?${params.toString()}`, {
        headers: createAuthHeaders(),
      });
      const kpiData = await response.json();
      if (kpiData && !kpiData.error) {
        setKpis(kpiData);
      }
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, [date, selectedShop, selectedCategory, selectedOrderStatus]);

  const calculateKpis = () => {
    const apiKpis = kpis || {};

    const safeShops = Array.isArray(shops) ? shops : [];
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeProducts = Array.isArray(products) ? products : [];
    const safeRawMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
    const safeMarketingOrders = Array.isArray(marketingOrders)
      ? marketingOrders
      : [];

    const shopMap = safeShops.reduce((acc, shop) => {
      acc[shop.id] = shop.name;
      return acc;
    }, {} as Record<string, string>);

    // Create a map of active shops only
    const activeShopsMap = safeShops
      .filter(shop => shop.status === 'Active')
      .reduce((acc, shop) => {
        acc[shop.id] = shop.name;
        return acc;
      }, {} as Record<string, string>);

    const filteredOrders = safeOrders.filter((order) => {
      // Date filter
      if (date?.from) {
        const to = date.to || new Date();
        try {
          // Ensure order.date is treated as a string for parseISO
          const orderDate = parseISO(String(order.date));
          if (orderDate < date.from || orderDate > to) return false;
        } catch (e) {
          return true;
        }
      }

      // Shop filter - only include orders from active shops
      const sId = order.shopId;
      const sName = order.shopName;
      
      // Check if either shopId or shopName corresponds to an active shop
      const hasActiveShopById = sId && activeShopsMap[sId];
      const hasActiveShopByName = sName && safeShops.some(shop => 
        shop.name === sName && shop.status === 'Active'
      );
      
      if (sId || sName) {
        if (!hasActiveShopById && !hasActiveShopByName) {
          return false; // Skip orders that don't belong to an active shop
        }
      }

      // Shop name filter
      if (selectedShop && selectedShop !== "all") {
        if (order.shopId !== selectedShop && order.shopName !== selectedShop)
          return false;
      }

      // Status filter
      if (selectedOrderStatus && selectedOrderStatus !== "all") {
        if (order.status !== selectedOrderStatus) return false;
      }

      return true;
    });

    const filteredProducts = safeProducts.filter((product) => {
      if (selectedCategory && selectedCategory !== "all") {
        return product.category === selectedCategory;
      }
      return true;
    });

    // Performance aggregation
    const productSales: Record<
      string,
      {
        id: string;
        name: string;
        quantity: number;
        revenue: number;
        imageUrl?: string;
      }
    > = {};
    const shopPerformance: Record<
      string,
      { name: string; sales: number; quantity: number }
    > = {};
    const categoryStats: Record<
      string,
      { name: string; value: number; quantity: number; topProducts: any[] }
    > = {};
    const salesByDate: Record<string, number> = {};

    filteredOrders.forEach((order) => {
      try {
        const orderDateStr = (
          order.date ||
          order.createdAt ||
          new Date().toISOString()
        ).toString();
        const dateKey = format(parseISO(orderDateStr), "yyyy-MM-dd");
        salesByDate[dateKey] =
          (salesByDate[dateKey] || 0) + (Number(order.amount) || 0);
      } catch (e) {
        console.error("Error parsing order date:", order.date, e);
      }

      const sId = order.shopId;
      if (sId && activeShopsMap[sId]) {
        const officialName = activeShopsMap[sId];
        if (!shopPerformance[officialName]) {
          shopPerformance[officialName] = { name: officialName, sales: 0, quantity: 0 };
        }
        shopPerformance[officialName].sales += Number(order.amount) || 0;
      }

      // Handle items which might be a JSON string if not parsed by the API
      let items = order.items;
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch (e) {
          items = [];
        }
      }

      (Array.isArray(items) ? items : []).forEach((item) => {
        const qty = Number(item.quantity) || 0;
        
        // Accumulate quantity for shop using official name
        const sId = order.shopId;
        if (sId && activeShopsMap[sId]) {
             const officialName = activeShopsMap[sId];
             if (shopPerformance[officialName]) {
                shopPerformance[officialName].quantity += qty;
             }
        }

        const productId = item.productId;
        if (productId) {
          if (!productSales[productId]) {
            const product = safeProducts.find((p) => p.id === productId);
            productSales[productId] = {
              id: productId,
              name: product?.name || item.name || "Unknown",
              quantity: 0,
              revenue: 0,
              imageUrl: product?.imageUrl,
            };
          }
          const price = Number(item.price) || 0;
          productSales[productId].quantity += qty;
          productSales[productId].revenue += price * qty;
        }
      });
    });

    const totalSales = filteredOrders.reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const totalOrdersCount = filteredOrders.length;

    // Stock & Category
    filteredProducts.forEach((product) => {
      const productPrice = Number(product.price) || 0;
      const totalStockValue = (product.variants || []).reduce(
        (vSum, variant) => {
          const stock = Number(variant.stock) || 0;
          if (stock <= 0) return vSum;
          
          let price = productPrice;
          if (product.agePricing && product.agePricing.length > 0) {
            const variantSize = variant.size?.trim().toLowerCase();
            const labelMatch = product.agePricing.find(p => 
              p.sizes?.split(',').map((s: string) => s.trim().toLowerCase()).includes(variantSize)
            );
            if (labelMatch) {
              price = labelMatch.price;
            } else {
              const sizeNum = parseInt(variantSize);
              if (!isNaN(sizeNum)) {
                const rangeMatch = product.agePricing.find(p => 
                  p.ageMin !== undefined && p.ageMax !== undefined &&
                  sizeNum >= (p.ageMin || 0) && sizeNum <= (p.ageMax || 0)
                );
                if (rangeMatch) price = rangeMatch.price;
              }
            }
          }
          return vSum + (price * stock);
        },
        0
      );

      const totalStock = (product.variants || []).reduce(
        (vSum, variant) => vSum + (Number(variant.stock) || 0),
        0
      );
      const stockValue = totalStockValue;

      const cat = product.category || "Uncategorized";
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          name: cat,
          value: 0,
          quantity: 0,
          topProducts: [],
        };
      }
      categoryStats[cat].value += stockValue;
      categoryStats[cat].quantity += totalStock;
      categoryStats[cat].topProducts.push({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        stockValue,
      });
    });

    return {
      totalSalesValue: apiKpis.totalSalesValue ?? totalSales,
      totalOrders: apiKpis.totalOrders ?? totalOrdersCount,
      unitsProduced:
        apiKpis.unitsProduced ??
        safeMarketingOrders.reduce(
          (sum, order) => sum + (order.quantity || 0),
          0
        ),
      activeShops:
        apiKpis.activeShops ??
        safeShops.filter((shop) => shop.status === "Active").length,
      registeredShops: apiKpis.registeredShops ?? safeShops.length,
      activeOrders:
        apiKpis.activeOrders ??
        safeOrders.filter(
          (o) => o.status === "Pending" || o.status === "Dispatched"
        ).length,
      averageOrderValue:
        apiKpis.averageOrderValue ??
        (totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0),
      lowStockAlerts:
        apiKpis.lowStockAlerts ??
        safeProducts.filter((p) => {
          const total = (p.variants || []).reduce(
            (s, v) => s + (v.stock || 0),
            0
          );
          return total === 0; // Only count items that are completely out of stock
        }).length +
        safeRawMaterials.filter((rm: any) => 
          rm.currentBalance === 0 // Only count raw materials that are completely out of stock
        ).length,
      salesTrend:
        apiKpis.salesTrend && apiKpis.salesTrend.length > 0
          ? apiKpis.salesTrend
          : Object.entries(salesByDate)
              .map(([date, total]) => ({ date, totalSales: total }))
              .sort((a, b) => a.date.localeCompare(b.date)),

      bestSellingProducts:
        apiKpis.bestSellingProducts && apiKpis.bestSellingProducts.length > 0
          ? apiKpis.bestSellingProducts
          : Object.values(productSales)
              .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
              .slice(0, 5),

      shopRanking:
        apiKpis.shopRanking && apiKpis.shopRanking.length > 0
          ? apiKpis.shopRanking
          : Object.values(shopPerformance)
              .sort((a: any, b: any) => b.sales - a.sales)
              .slice(0, 10),

      categoryData: Object.values(categoryStats).map((c) => ({
        ...c,
        topProducts: c.topProducts
          .sort((a, b) => b.stockValue - a.stockValue)
          .slice(0, 3),
      })),

      stockInfo:
        apiKpis.stockInfo && apiKpis.stockInfo.length > 0
          ? apiKpis.stockInfo
          : filteredProducts
              .map((product: any) => {
                const totalStock = (product.variants || []).reduce(
                  (sum: number, variant: any) => sum + (variant.stock || 0),
                  0
                );
                return {
                  productId: product.id,
                  name: product.name,
                  category: product.category,
                  totalStock,
                  totalValue: (product.price || 0) * totalStock,
                  imageUrl: product.imageUrl,
                };
              })
              .sort((a: any, b: any) => b.totalValue - a.totalValue)
              .slice(0, 10),
    };
  };

  const [currentKpis, setCurrentKpis] = useState<any>(null);

  useEffect(() => {
    setCurrentKpis(calculateKpis());
  }, [kpis, shops, orders, products, marketingOrders, date]);

  const salesTrendData = useMemo(() => {
    if (currentKpis?.salesTrend && Array.isArray(currentKpis.salesTrend)) {
      return currentKpis.salesTrend.map((item: any) => ({
        date: item.date,
        totalSales: item.totalSales ?? item.total ?? 0,
      }));
    }
    return [];
  }, [currentKpis]);

  const shopPerformanceData = useMemo(() => {
    if (currentKpis?.shopRanking && Array.isArray(currentKpis.shopRanking)) {
      return currentKpis.shopRanking
        .slice(0, 5)
        .map((shop: any, index: number) => ({
          name: shop.name,
          sales: shop.sales,
          quantity: shop.quantity || 0,
          fill: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
        }));
    }
    return [];
  }, [currentKpis]);

  const categoryData = useMemo(() => {
    if (currentKpis?.categoryData && Array.isArray(currentKpis.categoryData)) {
      return currentKpis.categoryData.map((category: any) => ({
        category: category.name || category.category,
        quantity: category.quantity || 0,
        value: category.value,
        products: category.topProducts || [],
      }));
    }
    return [];
  }, [currentKpis]);

  const bestSellingProducts = useMemo(() => {
    if (
      currentKpis?.bestSellingProducts &&
      Array.isArray(currentKpis.bestSellingProducts)
    ) {
      return currentKpis.bestSellingProducts.slice(0, 5);
    }
    return [];
  }, [currentKpis]);

  const stockInfo = useMemo(() => {
    if (currentKpis?.stockInfo && Array.isArray(currentKpis.stockInfo)) {
      return currentKpis.stockInfo.slice(0, 5);
    }
    return [];
  }, [currentKpis]);

  const lowStockProducts = useMemo(() => {
    // Get out of stock products
    const lowStockFinishedGoods = products
      .filter((p) => {
        const total = (p.variants || []).reduce(
          (s, v) => s + (v.stock || 0),
          0
        );
        return total === 0;
      })
      .map(p => ({
        ...p,
        type: 'finished-goods',
        stock: 0
      }));

    // Get out of stock raw materials
    const lowStockRawMaterials = rawMaterials
      .filter((rm) => rm.currentBalance === 0)
      .map(rm => ({
        ...rm,
        type: 'raw-materials',
        stock: 0
      }));

    // Combine and sort by stock level (lowest first)
    return [...lowStockFinishedGoods, ...lowStockRawMaterials]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);
  }, [products, rawMaterials]);

  const exportToPDF = async () => {
    try {
      setIsLoading(true);
      const { generateOwnerKPIReport } = await import("@/lib/pdf-generator");
      const filters = {
        startDate: date?.from ? format(date.from, "yyyy-MM-dd") : null,
        endDate: date?.to ? format(date.to, "yyyy-MM-dd") : null,
        shopId: selectedShop,
        category: selectedCategory,
        orderStatus: selectedOrderStatus,
      };
      
      const branding = {
        companyName: settings.companyName,
        logo: settings.logo || undefined,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor
      };
      
      const pdfBlob = await generateOwnerKPIReport(currentKpis || {}, filters, branding);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `factory-admin-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <LoadingBar
        isLoading={isLoading}
        message="Refreshing dashboard data..."
      />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Factory Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full sm:w-[200px] justify-start text-left font-normal",
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
                  <span>All Time</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium leading-none">Filter Date</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDate(undefined)}
                    className="h-auto p-0 text-muted-foreground hover:text-primary"
                  >
                    Reset
                  </Button>
                </div>
                <Calendar
                  mode="range"
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={isMobile ? 1 : 2}
                />
              </div>
            </PopoverContent>
          </Popover>

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
                    <label>Shop</label>
                    <Select
                      value={selectedShop || "all"}
                      onValueChange={(v) =>
                        setSelectedShop(v === "all" ? null : v)
                      }
                    >
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="All Shops" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shops</SelectItem>
                        {(Array.isArray(shops) ? shops : []).map((shop) => (
                          <SelectItem key={shop.id} value={shop.name}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label>Category</label>
                    <Select
                      value={selectedCategory || "all"}
                      onValueChange={(v) =>
                        setSelectedCategory(v === "all" ? null : v)
                      }
                    >
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Ladies">Ladies</SelectItem>
                        <SelectItem value="Men">Men</SelectItem>
                        <SelectItem value="Kids">Kids</SelectItem>
                        <SelectItem value="Unisex">Unisex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Core KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {[
          {
            title: "Total Sales",
            value: `ETB ${
              currentKpis?.totalSalesValue?.toLocaleString() || "0"
            }`,
            icon: Wallet,
            desc: `+${(currentKpis?.salesGrowthMoM || 0).toFixed(
              1
            )}% vs last month`,
          },
          {
            title: "Total Orders",
            value: currentKpis?.totalOrders || 0,
            icon: ShoppingCart,
            desc: `Fulfillment: ${(
              currentKpis?.orderFulfillmentRate || 0
            ).toFixed(1)}%`,
          },
          {
            title: "Active Shops",
            value: currentKpis?.activeShops || 0,
            icon: Building2,
            desc: `of ${currentKpis?.registeredShops || 0} total`,
          },
          {
            title: "Active Orders",
            value: currentKpis?.activeOrders || 0,
            icon: ShoppingCart,
            desc: "Awaiting fulfillment",
          },
          {
            title: "Total Products",
            value: products.length,
            icon: Package,
            desc: "In catalog",
          },
          {
            title: "Out of Stock Items",
            value: currentKpis?.lowStockAlerts || 0,
            icon: AlertTriangle,
            desc: "Immediate action required",
            color: "text-red-600",
          },
          {
            title: "Units Produced",
            value: currentKpis?.unitsProduced || 0,
            icon: Factory,
            desc: `Efficiency: ${(
              currentKpis?.productionEfficiency || 0
            ).toFixed(1)}%`,
          },
        ].map((kpi: any, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon
                className={cn("h-4 w-4 text-muted-foreground", kpi.color)}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="lg:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Dynamic Trend Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/30 p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground font-medium">
                  Avg Daily Sales
                </p>
                <p className="text-lg font-bold text-primary">
                  ETB{" "}
                  {(
                    (currentKpis?.salesTrend?.length
                      ? currentKpis.totalSalesValue /
                        currentKpis.salesTrend.length
                      : 0) || 0
                  ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground font-medium">
                  Max Daily Sales
                </p>
                <p className="text-lg font-bold text-green-600">
                  ETB{" "}
                  {(
                    Math.max(
                      ...(currentKpis?.salesTrend?.map(
                        (d: any) => d.totalSales || d.total
                      ) || [0])
                    ) || 0
                  ).toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground font-medium">
                  Min Daily Sales
                </p>
                <p className="text-lg font-bold text-red-600">
                  ETB{" "}
                  {(
                    Math.min(
                      ...(currentKpis?.salesTrend
                        ?.filter((d: any) => (d.totalSales || d.total) > 0)
                        .map((d: any) => d.totalSales || d.total) || [0])
                    ) || 0
                  ).toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground font-medium">
                  Avg Transaction
                </p>
                <p className="text-lg font-bold text-blue-600">
                  ETB{" "}
                  {(currentKpis?.averageOrderValue || 0).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 0 }
                  )}
                </p>
              </div>
            </div>

            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <RechartsLineChart data={salesTrendData}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    try {
                      return format(parseISO(v), "MMM dd");
                    } catch (e) {
                      return v;
                    }
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `ETB ${v.toLocaleString()}`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  stroke="var(--color-sales)"
                  strokeWidth={2}
                  dot={false}
                />
              </RechartsLineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Selling Products (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bestSellingProducts.slice(0, 5).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                    <span className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center rounded-br">
                      {i + 1}
                    </span>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 m-2.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ETB {(p.revenue || p.totalValue || 0).toLocaleString()} •{" "}
                      {p.quantity} units
                    </p>
                  </div>
                </div>
              ))}
              {bestSellingProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No sales data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 xl:col-span-1">
          <CardHeader>
            <CardTitle>Shop Performance Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ComposedChart
                data={shopPerformanceData}
                margin={{ top: 10, right: 30, bottom: 0, left: -20 }}
                layout="vertical"
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 10 }}
                  interval={0}
                  tickFormatter={(v) =>
                    v.length > 10 ? `${v.substring(0, 10)}...` : v
                  }
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill="var(--color-sales)"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  label={<ShopSalesLabel />}
                />
                <Bar
                  dataKey="quantity"
                  name="Quantity"
                  fill="var(--color-quantity)"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                  label={<ShopQuantityLabel />}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Inventory and Category Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                data={stockInfo}
                layout="vertical"
                margin={{ left: 40, right: 20 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={(props) => (
                    <CustomYAxisTick {...props} stockInfo={stockInfo} />
                  )}
                  width={160}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="totalValue"
                  fill="var(--color-value)"
                  radius={[0, 4, 4, 0]}
                  label={(props) => (
                    <CustomBarLabel {...props} stockInfo={stockInfo} />
                  )}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Performance (by Stock Value)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ComposedChart
                  data={categoryData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <XAxis
                    dataKey="category"
                    scale="band"
                    padding={{ left: 10, right: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="var(--color-value)"
                    tickFormatter={(v) => `ETB ${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--color-quantity)"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    yAxisId="right"
                    dataKey="quantity"
                    name="Quantity"
                    fill="var(--color-quantity)"
                    barSize={20}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="value"
                    name="Stock Value"
                    stroke="var(--color-value)"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ChartContainer>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categoryData.length > 0 ? (
                  categoryData.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded border bg-card/50"
                    >
                      <span className="text-sm font-medium">{c.category}</span>
                      <span className="text-sm">
                        ETB {c.value?.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm col-span-full">
                    No data
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link href="/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(orders) ? orders : [])
                    .slice(0, 5)
                    .map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-xs">
                          {order.id.split("-").pop()}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]">
                          {order.shopName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "Paid" ? "default" : "secondary"
                            }
                            className="text-[10px] px-1 h-5"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          ETB {order.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Items List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Out of Stock Alert</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link href="/inventory">View inventory</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((item: any) => {
                  const isRawMaterial = item.type === 'raw-materials';
                  const stock = isRawMaterial ? item.currentBalance : (item.variants || []).reduce(
                    (s: number, v: any) => s + (v.stock || 0),
                    0
                  );
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded overflow-hidden bg-muted flex items-center justify-center">
                          {isRawMaterial ? (
                            <Layers className="h-4 w-4 text-muted-foreground" />
                          ) : item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isRawMaterial ? `${item.category} (${item.unitOfMeasure})` : item.category}
                            <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[9px]">
                              {isRawMaterial ? 'Raw Material' : 'Finished Goods'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">
                          {stock}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          in stock
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  All products are well stocked
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
