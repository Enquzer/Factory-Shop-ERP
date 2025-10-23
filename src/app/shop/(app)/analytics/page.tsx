'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { ShopAnalyticsClientPage } from './_components/analytics-client';
import { type Shop } from '@/lib/shops';
import { type Order } from '@/lib/orders';

export default function ShopAnalyticsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || user.role !== 'shop') {
                router.push('/shop/login');
                return;
            }

            try {
                // Fetch shop data through API
                const shopResponse = await fetch(`/api/shops/${user.username}`);
                if (!shopResponse.ok) {
                    throw new Error('Failed to fetch shop data');
                }
                
                const shopData: Shop = await shopResponse.json();
                setShop(shopData);

                // Fetch orders through API
                const ordersResponse = await fetch(`/api/orders?shopId=${shopData.id}`);
                if (ordersResponse.ok) {
                    const ordersData: Order[] = await ordersResponse.json();
                    setOrders(ordersData);
                }
            } catch (err) {
                console.error('Error fetching analytics data:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-48">
                <h1 className="text-2xl font-semibold">Error</h1>
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="flex flex-col items-center justify-center h-48">
                <h1 className="text-2xl font-semibold">Shop Not Found</h1>
                <p className="text-muted-foreground">Please contact the factory administrator.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">My Analytics</h1>
            <ShopAnalyticsClientPage shop={shop} orders={orders} />
        </div>
    )
}