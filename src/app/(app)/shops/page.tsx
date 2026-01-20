import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getShops, type Shop } from "@/lib/shops";
import { ShopsPageClient } from "./_components/shops-page-client";
import { BulkSelectionProvider } from "@/contexts/bulk-selection-context";

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
        <BulkSelectionProvider>
            <ShopsPageClient initialShops={shops} />
        </BulkSelectionProvider>
    );
}