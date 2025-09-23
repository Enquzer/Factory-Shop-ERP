

import { getOrders, type Order } from "@/lib/orders";
import { getProducts, type Product } from "@/lib/products";
import { getShops, type Shop } from "@/lib/shops";
import { DashboardClientPage } from "./_components/dashboard-client";

const LOW_STOCK_THRESHOLD = 10;

const getLowStockItems = (products: Product[]) => {
    const lowStockItems: { id: string; name: string; category: string; stock: number; isLow: boolean; }[] = [];
    products.forEach(product => {
        const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
        const minStock = product.minimumStockLevel ?? LOW_STOCK_THRESHOLD * product.variants.length;
        
        if (totalStock < minStock && totalStock > 0) {
            lowStockItems.push({
                id: product.id,
                name: product.name,
                category: product.category,
                stock: totalStock,
                isLow: true,
            });
        }
    });
    return lowStockItems.sort((a,b) => a.stock - b.stock);
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
