import { getProducts } from './products-sqlite';
import { getOrdersFromDB } from './orders';
import { getAllShops as getShops } from './shops-sqlite';
import { getDb } from './db';

export type AssistantResponse = {
    answer: string;
    data?: any;
    type: 'text' | 'chart' | 'list';
    isFallback?: boolean;
};

export async function processAssistantQuery(query: string): Promise<AssistantResponse> {
    const normalizedQuery = query.toLowerCase();

    // 1. Fetch all necessary data with error handling
    let products: any[] = [];
    let orders: any[] = [];
    let shops: any[] = [];

    try {
        const results = await Promise.allSettled([
            getProducts(),
            getOrdersFromDB(),
            getShops()
        ]);

        products = results[0].status === 'fulfilled' ? results[0].value : [];
        orders = results[1].status === 'fulfilled' ? results[1].value : [];
        shops = results[2].status === 'fulfilled' ? results[2].value : [];

        if (results.some(r => r.status === 'rejected')) {
            console.error("Some data fetches failed in Assistant Logic:", results.filter(r => r.status === 'rejected'));
        }
    } catch (error) {
        console.error("Critical error fetching assistant data:", error);
    }

    // 2. Logic for "Shop Count"
    if (normalizedQuery.includes('how many') && normalizedQuery.includes('shop')) {
        try {
            const db = await getDb();
            const countResult = await db.get(`SELECT COUNT(*) as count FROM shops`);
            const activeResult = await db.get(`SELECT COUNT(*) as count FROM shops WHERE status = 'Active' OR status = 'active'`);

            return {
                answer: `There are currently **${countResult.count}** shops registered in the system, with **${activeResult.count}** confirmed as active.`,
                type: 'text'
            };
        } catch (error) {
            console.error("Error in shop count query:", error);
            const count = shops.length;
            const activeCount = shops.filter(s => s.status === 'Active' || s.status === 'active').length;
            return {
                answer: `There are currently **${count}** shops registered in the system, with **${activeCount}** confirmed as active.`,
                type: 'text'
            };
        }
    }

    // 3. Logic for "Low Stock"
    if ((normalizedQuery.includes('low') || normalizedQuery.includes('out')) && (normalizedQuery.includes('stock') || normalizedQuery.includes('inventory'))) {
        const lowStockProducts = products.filter(p => {
            const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
            return totalStock < p.minimumStockLevel;
        });

        if (lowStockProducts.length === 0) {
            return {
                answer: "Great news! All products are currently above their minimum stock levels.",
                type: 'text'
            };
        }

        const list = lowStockProducts.map(p => {
            const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
            return `- **${p.name}** (${p.productCode}): Current stock is ${totalStock}, minimum should be ${p.minimumStockLevel}.`;
        }).join('\n');

        return {
            answer: `The following products are running low on stock:\n\n${list}`,
            type: 'list',
            data: lowStockProducts
        };
    }

    // 4. Logic for "Pending Orders"
    if (normalizedQuery.includes('pending') || (normalizedQuery.includes('status') && normalizedQuery.includes('order'))) {
        const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Awaiting Payment');

        if (pendingOrders.length === 0) {
            return {
                answer: "There are no pending orders at the moment. Everything is up to date!",
                type: 'text'
            };
        }

        return {
            answer: `There are currently **${pendingOrders.length}** pending orders that require your attention.`,
            type: 'text',
            data: pendingOrders
        };
    }

    // 5. Logic for "Sales" or "Revenue"
    if (normalizedQuery.includes('sales') || normalizedQuery.includes('revenue') || normalizedQuery.includes('total earned') || normalizedQuery.includes('money')) {
        const confirmedOrders = orders.filter(o => o.status === 'Paid' || o.status === 'Delivered' || o.status === 'Dispatched');
        const totalSales = confirmedOrders.reduce((sum: number, o: any) => sum + o.amount, 0);

        const today = new Date().toISOString().split('T')[0];
        const todaySales = confirmedOrders
            .filter(o => o.date === today)
            .reduce((sum: number, o: any) => sum + o.amount, 0);

        return {
            answer: `Total confirmed revenue is **ETB ${totalSales.toLocaleString()}**. \n- Total Orders: ${orders.length}\n- Confirmed Orders: ${confirmedOrders.length}\n- Revenue Today: **ETB ${todaySales.toLocaleString()}**`,
            type: 'text'
        };
    }

    // 6. Logic for "Recent Activity"
    if (normalizedQuery.includes('recent') || normalizedQuery.includes('activity') || normalizedQuery.includes('last update')) {
        const recentOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
        const orderList = recentOrders.map(o => `- ${o.shopName}: ETB ${o.amount.toLocaleString()} (${o.status})`).join('\n');

        return {
            answer: `Here is the recent activity:\n\n${orderList || "No recent orders found."}`,
            type: 'list'
        };
    }

    // 7. Logic for "Best Shop" or "Top Shop"
    if (normalizedQuery.includes('shop') && (normalizedQuery.includes('best') || normalizedQuery.includes('top') || normalizedQuery.includes('most'))) {
        const shopCounts: Record<string, { count: number, total: number }> = {};
        orders.forEach(o => {
            if (!shopCounts[o.shopName]) shopCounts[o.shopName] = { count: 0, total: 0 };
            shopCounts[o.shopName].count++;
            shopCounts[o.shopName].total += o.amount;
        });

        const sortedShops = Object.entries(shopCounts).sort((a, b) => b[1].total - a[1].total);

        if (sortedShops.length === 0) {
            return {
                answer: "I don't have enough order data yet to determine the top performing shop.",
                type: 'text'
            };
        }

        const topShop = sortedShops[0];
        return {
            answer: `The top performing shop is **${topShop[0]}** with a total order value of **ETB ${topShop[1].total.toLocaleString()}** across ${topShop[1].count} orders.`,
            type: 'text'
        };
    }

    // 8. Logic for "Product Search"
    const productKeywords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    const foundProduct = products.find(p =>
        normalizedQuery.includes(p.name.toLowerCase()) ||
        normalizedQuery.includes(p.productCode.toLowerCase()) ||
        productKeywords.some(kw => p.name.toLowerCase().includes(kw))
    );

    if (foundProduct) {
        const totalStock = foundProduct.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
        const variantsInfo = foundProduct.variants.map((v: any) => `**${v.color}/${v.size}**: ${v.stock} units`).join('\n');
        return {
            answer: `I found details for **${foundProduct.name}** (${foundProduct.productCode}):\n\n- **Category**: ${foundProduct.category}\n- **Price**: ETB ${foundProduct.price.toLocaleString()}\n- **Total Factory Stock**: ${totalStock} units\n\n**Variants breakdown**:\n${variantsInfo}`,
            type: 'text'
        };
    }

    // 9. General help / Fallback
    return {
        answer: "I'm your Smart Assistant. You can ask me things like:\n\n- \"How many **shops** are registered?\"\n- \"Which products are **low in stock**?\"\n- \"How many **pending orders** do we have?\"\n- \"Give me a **sales report**.\"\n- \"What is the **recent activity**?\"\n- \"Which **shop** is our best customer?\"\n- \"Tell me about **[Product Name]**.\"\n\nHow can I help you right now?",
        type: 'text',
        isFallback: true
    };
}
