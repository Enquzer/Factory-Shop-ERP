"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { type ShopInventoryItem } from '@/lib/shop-inventory';
import { InventoryClientPage } from './_components/inventory-client';
import { Loader2 } from "lucide-react";

export default function ShopInventoryPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [inventory, setInventory] = useState<ShopInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalInventoryValue, setTotalInventoryValue] = useState(0);
    const [totalInventoryAmount, setTotalInventoryAmount] = useState(0);

    const fetchInventory = async () => {
        if (!user || user.role !== 'shop') {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            // Fetch shop data
            const shopResponse = await fetch(`/api/shops/${user.username}`);
            if (!shopResponse.ok) {
                throw new Error('Failed to fetch shop data');
            }
            
            const shop = await shopResponse.json();
            
            // Fetch inventory data
            const inventoryResponse = await fetch(`/api/shop-inventory?username=${user.username}`);
            if (!inventoryResponse.ok) {
                throw new Error('Failed to fetch inventory data');
            }
            
            const inventoryData = await inventoryResponse.json();
            setInventory(inventoryData);
            
            // Calculate totals
            const value = inventoryData.reduce((sum: number, item: ShopInventoryItem) => sum + (item.price * item.stock), 0);
            const amount = inventoryData.reduce((sum: number, item: ShopInventoryItem) => sum + item.stock, 0);
            
            setTotalInventoryValue(value);
            setTotalInventoryAmount(amount);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && !authLoading) {
            fetchInventory();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-48">
                <p className="text-destructive">Error: {error}</p>
                <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
            </div>
        );
    }

    if (!user || user.role !== 'shop') {
        return (
            <div className="flex flex-col items-center justify-center h-48">
                <p className="text-destructive">Access denied. Shop access required.</p>
            </div>
        );
    }

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
            
            <InventoryClientPage inventory={inventory} onInventoryUpdate={fetchInventory} />
        </div>
    );
}