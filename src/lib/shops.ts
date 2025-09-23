

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';

const mockShops = [
    {
        id: "SHP-001",
        username: "bole_boutique",
        name: "Bole Boutique",
        contactPerson: "Abebe Bikila",
        city: "Addis Ababa",
        exactLocation: "Bole, next to Edna Mall",
        discount: 0.05,
        status: "Active",
        monthlySalesTarget: 50000,
    },
    {
        id: "SHP-002",
        username: "hawassa_habesha",
        name: "Hawassa Habesha",
        contactPerson: "Tirunesh Dibaba",
        city: "Hawassa",
        exactLocation: "Piassa, near the lake",
        discount: 0,
        status: "Active",
        monthlySalesTarget: 30000,
    },
    {
        id: "SHP-003",
        username: "merkato_style",
        name: "Merkato Style",
        contactPerson: "Kenenisa Bekele",
        city: "Addis Ababa",
        exactLocation: "Merkato, main market area",
        discount: 0.10,
        status: "Pending",
        monthlySalesTarget: 75000,
    },
    {
        id: "SHP-004",
        username: "adama_modern",
        name: "Adama Modern",
        contactPerson: "Meseret Defar",
        city: "Adama",
        exactLocation: "City center, across from the post office",
        discount: 0.05,
        status: "Inactive",
        monthlySalesTarget: 25000,
    }
];

export type Shop = {
    id: string;
    username: string;
    name: string;
    contactPerson: string;
    city: string;
    exactLocation: string;
    discount: number; // Stored as a decimal, e.g., 0.05 for 5%
    status: "Active" | "Pending" | "Inactive";
    monthlySalesTarget?: number;
    tinNumber?: string;
    tradeLicenseNumber?: string;
    password?: string; // This is NOT secure, for demo only
};

let shopsCache: Shop[] | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getShops(forceRefresh: boolean = false): Promise<Shop[]> {
    const now = Date.now();
    if (!forceRefresh && shopsCache && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
        return shopsCache;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "shops"));
        if (querySnapshot.empty) {
            console.log("No shops found in Firestore, populating with mock data.");
            const batch = writeBatch(db);
            mockShops.forEach((shop) => {
                const docRef = doc(collection(db, "shops"), shop.id);
                batch.set(docRef, shop);
            });
            await batch.commit();
            shopsCache = mockShops as Shop[];
        } else {
             shopsCache = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Shop));
        }

        lastFetchTime = now;
        return shopsCache;
    } catch (error) {
        console.error("Error fetching shops:", error);
        return shopsCache || mockShops as Shop[];
    }
}

export async function getShopById(shopId: string): Promise<Shop | null> {
    const allShops = await getShops();
    return allShops.find(s => s.id === shopId) || null;
}

export async function addShop(shopData: Omit<Shop, 'id' | 'status'>): Promise<Shop> {
    // In a real app, you'd likely have a more robust ID generation system
    // and would hash the password.
    const newShopId = `SHP-${Date.now().toString().slice(-6)}`;
    
    const newShop: Shop = {
        ...shopData,
        id: newShopId,
        status: "Active", // Default status for new shops
    };

    const shopRef = doc(db, 'shops', newShopId);
    await setDoc(shopRef, newShop);

    // Invalidate local cache
    shopsCache = null;
    
    return newShop;
}
