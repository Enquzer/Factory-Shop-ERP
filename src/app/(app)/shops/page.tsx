import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { RegisterShopDialog } from "@/components/register-shop-dialog";
import { getShops, type Shop } from "@/lib/shops";
import { ShopsClientPage } from "./_components/shops-client";

export const dynamic = 'force-dynamic';

export default async function ShopsPage() {
    let shops: Shop[] = [];
    try {
        shops = await getShops();
    } catch (error) {
        console.error('Error fetching shops for server-side rendering:', error);
        shops = [];
    }
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold self-start sm:self-center">Shops</h1>
                {/* The dialog trigger is inside the client component to handle state */}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Shop List</CardTitle>
                    <CardDescription>Manage registered shops here.</CardDescription>
                </CardHeader>
                <CardContent>
                   <ShopsClientPage initialShops={shops} />
                </CardContent>
            </Card>
        </div>
    );
}