
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, doc, WriteBatch, serverTimestamp, addDoc } from 'firebase/firestore';

export type StockEvent = {
    id?: string;
    productId: string;
    variantId: string;
    type: 'Stock In' | 'Stock Out';
    quantity: number;
    reason: 'Initial stock' | 'Manual adjustment' | 'Order fulfillment' | 'Return';
    createdAt: Date;
}

// Function to create a stock event within a batch write
export const createStockEvent = (
    event: Omit<StockEvent, 'id' | 'createdAt'>,
    batch: WriteBatch
) => {
    const stockEventRef = doc(collection(db, 'stockEvents'));
    batch.set(stockEventRef, {
        ...event,
        createdAt: serverTimestamp(),
    });
};

export async function getStockEventsForProduct(productId: string): Promise<StockEvent[]> {
    const q = query(
        collection(db, "stockEvents"),
        where("productId", "==", productId),
        orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as StockEvent;
    });
}
