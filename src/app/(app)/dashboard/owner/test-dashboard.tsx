// Simple test component to verify the owner dashboard is working
import { OwnerDashboardClientPage } from "./_components/owner-dashboard-client";
import { AIInsightsWidget } from "./_components/ai-insights-widget";
import { Shop } from "@/lib/shops";
import { Order } from "@/lib/orders";
import { MarketingOrder } from "@/lib/marketing-orders";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAuthHeaders } from "@/lib/auth-helpers";

const PIE_CHART_COLORS = [
  "rgba(255, 99, 132, 0.2)",
  "rgba(54, 162, 235, 0.2)",
  "rgba(255, 206, 86, 0.2)",
  "rgba(75, 192, 192, 0.2)",
  "rgba(153, 102, 255, 0.2)",
  "rgba(255, 159, 64, 0.2)",
];

// Mock data for testing
const mockProducts = [
  {
    id: "1",
    productCode: "P001",
    name: "Summer Dress",
    category: "Women",
    price: 299.99,
    minimumStockLevel: 10,
    variants: [
      { id: "v1", productId: "1", color: "Red", size: "M", stock: 15 },
      { id: "v2", productId: "1", color: "Blue", size: "L", stock: 8 }
    ]
  }
];

const mockShops: Shop[] = [
  {
    id: "1",
    username: "shop1",
    name: "Fashion Hub",
    contactPerson: "John Doe",
    contactPhone: "1234567890",
    city: "Addis Ababa",
    exactLocation: "Bole",
    tradeLicenseNumber: "TL123",
    tinNumber: "TIN123",
    discount: 0.1,
    status: "Active",
    monthlySalesTarget: 50000
  }
];

const mockOrders: Order[] = [
  {
    id: "1",
    shopId: "1",
    shopName: "Fashion Hub",
    date: "2023-06-15",
    status: "Delivered",
    amount: 1500,
    items: [
      {
        productId: "1",
        name: "Summer Dress",
        price: 299.99,
        imageUrl: "",
        variant: {
          id: "v1",
          color: "Red",
          size: "M",
          stock: 15,
          imageUrl: ""
        },
        quantity: 2
      }
    ],
    createdAt: new Date()
  }
];

const mockMarketingOrders: MarketingOrder[] = [
  {
    id: "1",
    orderNumber: "MO001",
    productName: "Summer Dress",
    productCode: "P001",
    description: "Summer collection dress",
    quantity: 100,
    status: "Completed",
    isCompleted: true,
    createdBy: "Factory Manager",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      { orderId: "1", size: "M", color: "Red", quantity: 50 },
      { orderId: "1", size: "L", color: "Blue", quantity: 50 }
    ]
  }
];

export function TestOwnerDashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Owner Dashboard Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">AI Insights Widget</h2>
        <AIInsightsWidget />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Dashboard Client Page</h2>
        <OwnerDashboardClientPage 
          products={mockProducts}
          shops={mockShops}
          orders={mockOrders}
          marketingOrders={mockMarketingOrders}
        />
      </div>
    </div>
  );
}