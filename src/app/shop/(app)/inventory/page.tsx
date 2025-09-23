import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Wallet } from 'lucide-react';
import { getShopInventory, type ShopInventoryItem } from '@/lib/shop-inventory';
import { InventoryClientPage } from './_components/inventory-client';

// This is a placeholder. In a real app, you'd get this from the user's session.
const MOCK_SHOP_ID = "SHP-001";

export default async function ShopInventoryPage() {
    const inventory = await getShopInventory(MOCK_SHOP_ID);
    
    const { totalInventoryValue, totalInventoryAmount } = (() => {
        const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
        const totalAmount = inventory.reduce((sum, item) => sum + item.stock, 0);
        return { totalInventoryValue: totalValue, totalInventoryAmount: totalAmount };
    })();

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">My Inventory</h1>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Amount</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalInventoryAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total units in your stock</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ETB {totalInventoryValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                        <p className="text-xs text-muted-foreground">Total value of your stock (based on factory price)</p>
                    </CardContent>
                </Card>
            </div>
            
            <InventoryClientPage inventory={inventory} />
        </div>
    );
}
