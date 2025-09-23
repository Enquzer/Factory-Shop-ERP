

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';

const mockShops = [
    {
        id: "SHP-001",
        name: "Bole Boutique",
        contactPerson: "Abebe Bikila",
        city: "Addis Ababa",
        exactLocation: "Bole, next to Edna Mall",
        discount: 5,
        status: "Active"
    },
    {
        id: "SHP-002",
        name: "Hawassa Habesha",
        contactPerson: "Tirunesh Dibaba",
        city: "Hawassa",
        exactLocation: "Piassa, near the lake",
        discount: 0,
        status: "Active"
    },
    {
        id: "SHP-003",
        name: "Merkato Style",
        contactPerson: "Kenenisa Bekele",
        city: "Addis Ababa",
        exactLocation: "Merkato, main market area",
        discount: 10,
        status: "Pending"
    },
    {
        id: "SHP-004",
        name: "Adama Modern",
        contactPerson: "Meseret Defar",
        city: "Adama",
        exactLocation: "City center, across from the post office",
        discount: 5,
        status: "Inactive"
    }
];

export type Shop = typeof mockShops[0] & {
    tinNumber?: string;
    tradeLicenseNumber?: string;
    username?: string;
};

let shops: Shop[] = [];

export async function getShops(): Promise<Shop[]> {
    try {
        const querySnapshot = await getDocs(collection(db, "shops"));
        if (querySnapshot.empty) {
            console.log("No shops found in Firestore, populating with mock data.");
            const batch = await import('firebase/firestore').then(m => m.writeBatch(db));
            mockShops.forEach((shop) => {
                const docRef = doc(collection(db, "shops"), shop.id);
                batch.set(docRef, shop);
            });
            await batch.commit();
            shops = mockShops;
            return shops;
        }

        shops = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Shop));
        return shops;
    } catch (error) {
        console.error("Error fetching shops:", error);
        console.log("Falling back to mock shops due to error.");
        shops = mockShops;
        return shops;
    }
}

export async function addShop(shopData: Omit<Shop, 'id' | 'status'>): Promise<Shop> {
    // In a real app, you'd likely have a more robust ID generation system
    const newShopId = `SHP-${Date.now().toString().slice(-6)}`;
    const newShop: Shop = {
        ...shopData,
        id: newShopId,
        status: "Active", // Default status for new shops
    };

    const shopRef = doc(db, 'shops', newShopId);
    await setDoc(shopRef, newShop);

    // Invalidate local cache
    shops = [];
    
    return newShop;
}

