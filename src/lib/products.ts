import { db, storage } from './firebase';
import { collection, getDocs, doc, writeBatch, deleteDoc, getDoc, Transaction, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

const mockProducts = [
    { 
        id: "MCT-001", 
        productCode: "MC-TS-001",
        name: "Men's Classic Tee", 
        category: "Men", 
        price: 500.00, 
        variants: [
            { id: "VAR-001", productId: "MCT-001", color: "White", size: "M", stock: 15, imageUrl: "https://picsum.photos/seed/prod1-white/800/1000" },
            { id: "VAR-002", productId: "MCT-001", color: "White", size: "L", stock: 10, imageUrl: "https://picsum.photos/seed/prod1-white/800/1000" },
            { id: "VAR-003", productId: "MCT-001", color: "Black", size: "M", stock: 20, imageUrl: "https://picsum.photos/seed/prod1-black/800/1000" },
            { id: "VAR-004", productId: "MCT-001", color: "Black", size: "XL", stock: 5, imageUrl: "https://picsum.photos/seed/prod1-black/800/1000" },
        ]
    },
    { 
        id: "WSD-012", 
        productCode: "WM-DR-012",
        name: "Women's Summer Dress", 
        category: "Women", 
        price: 1200.00, 
        variants: [
            { id: "VAR-005", productId: "WSD-012", color: "Floral", size: "S", stock: 8, imageUrl: "https://picsum.photos/seed/prod2/800/1000" },
            { id: "VAR-006", productId: "WSD-012", color: "Floral", size: "M", stock: 12, imageUrl: "https://picsum.photos/seed/prod2/800/1000" },
        ]
    },
    { 
        id: "KGH-034", 
        productCode: "KD-HD-034",
        name: "Kid's Graphic Hoodie", 
        category: "Kids", 
        price: 850.00, 
        variants: [
            { id: "VAR-007", productId: "KGH-034", color: "Blue", size: "6Y", stock: 18, imageUrl: "https://picsum.photos/seed/prod3-blue/800/1000" },
            { id: "VAR-008", productId: "KGH-034", color: "Pink", size: "8Y", stock: 22, imageUrl: "https://picsum.photos/seed/prod3-pink/800/1000" },
        ]
    },
    { 
        id: "UDJ-007", 
        productCode: "UN-JK-007",
        name: "Unisex Denim Jacket",
        category: "Unisex", 
        price: 2500.00, 
        variants: [
            { id: "VAR-009", productId: "UDJ-007", color: "Indigo", size: "L", stock: 7, imageUrl: "https://picsum.photos/seed/prod4/800/1000" },
        ]
    },
    { 
        id: "MST-002", 
        productCode: "MN-SH-002",
        name: "Men's Striped Shirt", 
        category: "Men", 
        price: 950.00, 
        variants: [
            { id: "VAR-010", productId: "MST-002", color: "Navy/White", size: "M", stock: 14, imageUrl: "https://picsum.photos/seed/prod5/800/1000" },
            { id: "VAR-011", productId: "MST-002", color: "Navy/White", size: "L", stock: 11, imageUrl: "https://picsum.photos/seed/prod5/800/1000" },
        ]
    },
    { 
        id: "WJP-005", 
        productCode: "WM-JS-005",
        name: "Women's Jumpsuit", 
        category: "Women", 
        price: 1800.00, 
        variants: [
            { id: "VAR-012", productId: "WJP-005", color: "Black", size: "S", stock: 9, imageUrl: "https://picsum.photos/seed/prod6-black/800/1000" },
            { id: "VAR-013", productId: "WJP-005", color: "Olive", size: "M", stock: 6, imageUrl: "https://picsum.photos/seed/prod6-olive/800/1000" },
        ]
    },
    {
        id: "CK-PN-001",
        productCode: "CK-PN-001",
        name: "Tshirt",
        category: "Men",
        price: 1000.00,
        variants: [
            { id: "VAR-014", productId: "CK-PN-001", color: "Green", size: "L", stock: 25, imageUrl: "https://picsum.photos/seed/prod7-green/800/1000" },
        ]
    }
].map(product => ({
    ...product,
    imageUrl: product.variants[0].imageUrl,
}));


export type Product = {
    id: string;
    productCode: string;
    name: string;
    category: string;
    price: number;
    description?: string;
    imageUrl: string;
    imageHint?: string;
    variants: {
        id: string;
        color: string;
        size: string;
        stock: number;
        imageUrl: string;
    }[];
};
export type ProductVariant = Product["variants"][0];

let productsCache: Product[] | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getProducts(forceRefresh: boolean = false): Promise<Product[]> {
    const now = Date.now();
    if (!forceRefresh && productsCache && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
        return productsCache;
    }

    const productsCollection = collection(db, "products");
    const querySnapshot = await getDocs(productsCollection);

    if (querySnapshot.empty) {
        // If no products in DB, populate with mock data
        const batch = writeBatch(db);
        mockProducts.forEach((product) => {
            const docRef = doc(productsCollection, product.productCode);
            const { id, ...rest } = product;
            batch.set(docRef, { ...rest, id: product.productCode });
        });
        await batch.commit();
        productsCache = mockProducts.map(p => ({
            ...p,
            id: p.productCode,
            variants: p.variants.map(v => ({...v, productId: p.productCode}))
        })) as unknown as Product[];
        lastFetchTime = now;
        return productsCache;
    }

    productsCache = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    lastFetchTime = now;
    return productsCache;
}

export async function updateProductStock(transaction: Transaction, productId: string, variantId: string, quantityChange: number) {
    const productRef = doc(db, 'products', productId);
    const productDoc = await transaction.get(productRef);

    if (!productDoc.exists()) {
        throw new Error(`Product ${productId} not found!`);
    }

    const productData = productDoc.data() as Product;
    const variantIndex = productData.variants.findIndex(v => v.id === variantId);

    if (variantIndex === -1) {
        throw new Error(`Variant ${variantId} not found in product ${productId}!`);
    }
    
    const newStock = productData.variants[variantIndex].stock + quantityChange;
    if (newStock < 0) {
        throw new Error(`Insufficient stock for ${productData.name} (${productData.variants[variantIndex].color}, ${productData.variants[variantIndex].size}).`);
    }

    const newVariants = [...productData.variants];
    newVariants[variantIndex] = {
        ...newVariants[variantIndex],
        stock: newStock
    };

    transaction.update(productRef, { variants: newVariants });
}

export async function deleteProduct(productId: string) {
    if (!productId) {
        throw new Error("Product ID is required to delete a product.");
    }

    // First, get the product document to find image paths
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);

    if (productDoc.exists()) {
        const productData = productDoc.data() as Product;
        const imagePaths: string[] = [];

        // Collect main image path
        if (productData.imageUrl) {
            try {
               const mainImageRef = ref(storage, productData.imageUrl);
               imagePaths.push(mainImageRef.fullPath);
            } catch (e) {
                console.warn(`Could not parse storage URL for main image: ${productData.imageUrl}`);
            }
        }
        // Collect variant image paths
        productData.variants.forEach(variant => {
            if (variant.imageUrl) {
                 try {
                    const variantImageRef = ref(storage, variant.imageUrl);
                    imagePaths.push(variantImageRef.fullPath);
                 } catch(e) {
                     console.warn(`Could not parse storage URL for variant image: ${variant.imageUrl}`);
                 }
            }
        });
        
        // Delete all images from storage
        const deletePromises = imagePaths.map(path => {
            const imageRef = ref(storage, path);
            return deleteObject(imageRef).catch(error => {
                // Log error but don't block deletion of DB entry
                console.error(`Failed to delete image ${path}:`, error);
            });
        });

        await Promise.all(deletePromises);
    }
    
    // Finally, delete the product document from Firestore
    await deleteDoc(productRef);
    // Invalidate cache
    productsCache = null; 
}

    