
import { db } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

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

export type Shop = typeof mockShops[0];

let shops: Shop[] = [];

export async function getShops(): Promise<Shop[]> {
    if (shops.length > 0) {
        return shops;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "shops"));
        if (querySnapshot.empty) {
            console.log("No shops found in Firestore, populating with mock data.");
            // If no shops in DB, populate with mock data
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
        // Fallback to mock data in case of an error
        shops = mockShops;
        return shops;
    }
}
