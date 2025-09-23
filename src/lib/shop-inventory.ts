
'use client';

import { db } from './firebase';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import type { OrderItem } from './orders';

export type ShopInventoryItem = {
    productId: string;
    name: string;
    price: number; // Storing price at time of purchase for valuation
    variant: {
        id: string;
        color: string;
        size: string;
    };
    stock: number;
};

type ShopInventoryDoc = {
    items: ShopInventoryItem[];
}

// Get the entire inventory for a shop
export async function getShopInventory(shopId: string): Promise<ShopInventoryItem[]> {
    const inventoryRef = doc(db, 'shopInventories', shopId);
    const docSnap = await getDoc(inventoryRef);

    if (docSnap.exists()) {
        return (docSnap.data() as ShopInventoryDoc).items || [];
    } else {
        return [];
    }
}

// Add items from a delivered order to the shop's inventory
export async function addItemsToShopInventory(shopId: string, orderItems: OrderItem[]) {
    const inventoryRef = doc(db, 'shopInventories', shopId);

    try {
        await runTransaction(db, async (transaction) => {
            const inventoryDoc = await transaction.get(inventoryRef);
            
            let currentItems: ShopInventoryItem[] = [];
            if (inventoryDoc.exists()) {
                currentItems = (inventoryDoc.data() as ShopInventoryDoc).items;
            }

            orderItems.forEach(orderItem => {
                const existingItemIndex = currentItems.findIndex(
                    invItem => invItem.variant.id === orderItem.variant.id
                );

                if (existingItemIndex > -1) {
                    // Item already exists, just update stock
                    currentItems[existingItemIndex].stock += orderItem.quantity;
                } else {
                    // New item for the inventory
                    currentItems.push({
                        productId: orderItem.productId,
                        name: orderItem.name,
                        price: orderItem.price,
                        variant: {
                           id: orderItem.variant.id,
                           color: orderItem.variant.color,
                           size: orderItem.variant.size,
                        },
                        stock: orderItem.quantity,
                    });
                }
            });

            if (inventoryDoc.exists()) {
                 transaction.update(inventoryRef, { items: currentItems });
            } else {
                 transaction.set(inventoryRef, { items: currentItems });
            }
        });
        console.log(`Inventory for shop ${shopId} updated successfully.`);
    } catch (error) {
        console.error("Transaction failed: ", error);
    }
}
