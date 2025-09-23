import { getShopById, type Shop } from '@/lib/shops';
import { getOrdersForShop, type Order } from '@/lib/orders';
import { ShopAnalyticsClientPage } from './_components/analytics-client';

// This is a placeholder. In a real app, you'd get this from the user's session.
const MOCK_SHOP_ID = "SHP-001";

export default async function ShopAnalyticsPage() {
    const shop = await getShopById(MOCK_SHOP_ID);
    const orders = await getOrdersForShop(MOCK_SHOP_ID);

    if (!shop) {
        return <div>Shop not found.</div>;
    }

    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">My Analytics</h1>
        <ShopAnalyticsClientPage shop={shop} orders={orders} />
      </div>
    )
}
