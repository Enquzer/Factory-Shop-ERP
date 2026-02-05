"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Shop } from "@/lib/shops";
import { ShopsDashboard } from "./shops-dashboard";
import { ShopsClientPage } from "./shops-client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ShopsPageClient({ initialShops }: { initialShops: Shop[] }) {
    const { user } = useAuth();
    const [shops, setShops] = useState<Shop[]>(initialShops);

    if (user?.role === 'ecommerce') {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <Card className="max-w-md text-center p-6 border-red-100 bg-red-50/50">
                    <CardHeader>
                        <CardTitle className="text-red-700">Access Restricted</CardTitle>
                        <CardDescription>
                            eCommerce Managers cannot access full Shop Management. Please use the Website Config page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/ecommerce-manager/settings">
                            <Button className="bg-red-600 hover:bg-red-700">Go to Website Config</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleShopsUpdate = (updatedShops: Shop[]) => {
        setShops(updatedShops);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold self-start sm:self-center">Shops</h1>
                {/* Export and register buttons are inside the client component */}
            </div>
            
            {/* Mock shop tester component removed as part of mock shop cleanup */}
            
            <ShopsDashboard shops={shops} />
            
            <Card>
                <CardHeader>
                    <CardTitle>Shop List</CardTitle>
                    <CardDescription>Manage registered shops here.</CardDescription>
                </CardHeader>
                <CardContent>
                   <ShopsClientPage initialShops={shops} onShopsUpdate={handleShopsUpdate} />
                </CardContent>
            </Card>
        </div>
    );
}