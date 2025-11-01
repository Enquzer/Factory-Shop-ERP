"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Shop } from "@/lib/shops";
import { ShopsDashboard } from "./shops-dashboard";
import { ShopsClientPage } from "./shops-client";

export function ShopsPageClient({ initialShops }: { initialShops: Shop[] }) {
    const [shops, setShops] = useState<Shop[]>(initialShops);

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