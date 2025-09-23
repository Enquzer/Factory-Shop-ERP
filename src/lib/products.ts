

import { db, storage } from './firebase';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

const mockProducts = [
    { 
        id: "MCT-001", 
        productCode: "MC-TS-001",
        name: "Men's Classic Tee", 
        category: "Men", 
        price: 500.00, 
        variants: [
            { id: "VAR-001", productId: "MCT-001", color: "White", size: "M", stock: 15, imageUrl: "https://picsum.photos/seed/prod1-white/800/1000", imageHint: "man white t-shirt" },
            { id: "VAR-002", productId: "MCT-001", color: "White", size: "L", stock: 10, imageUrl: "https://picsum.photos/seed/prod1-white/800/1000", imageHint: "man white t-shirt" },
            { id: "VAR-003", productId: "MCT-001", color: "Black", size: "M", stock: 20, imageUrl: "https://picsum.photos/seed/prod1-black/800/1000", imageHint: "man black t-shirt" },
            { id: "VAR-004", productId: "MCT-001", color: "Black", size: "XL", stock: 5, imageUrl: "https://picsum.photos/seed/prod1-black/800/1000", imageHint: "man black t-shirt" },
        ]
    },
    { 
        id: "WSD-012", 
        productCode: "WM-DR-012",
        name: "Women's Summer Dress", 
        category: "Women", 
        price: 1200.00, 
        variants: [
            { id: "VAR-005", productId: "WSD-012", color: "Floral", size: "S", stock: 8, imageUrl: "https://picsum.photos/seed/prod2/800/1000", imageHint: "woman dress" },
            { id: "VAR-006", productId: "WSD-012", color: "Floral", size: "M", stock: 12, imageUrl: "https://picsum.photos/seed/prod2/800/1000", imageHint: "woman dress" },
        ]
    },
    { 
        id: "KGH-034", 
        productCode: "KD-HD-034",
        name: "Kid's Graphic Hoodie", 
        category: "Kids", 
        price: 850.00, 
        variants: [
            { id: "VAR-007", productId: "KGH-034", color: "Blue", size: "6Y", stock: 18, imageUrl: "https://picsum.photos/seed/prod3-blue/800/1000", imageHint: "kids blue hoodie" },
            { id: "VAR-008", productId: "KGH-034", color: "Pink", size: "8Y", stock: 22, imageUrl: "https://picsum.photos/seed/prod3-pink/800/1000", imageHint: "kids pink hoodie" },
        ]
    },
    { 
        id: "UDJ-007", 
        productCode: "UN-JK-007",
        name: "Unisex Denim Jacket", 
        category: "Unisex", 
        price: 2500.00, 
        variants: [
            { id: "VAR-009", productId: "UDJ-007", color: "Indigo", size: "L", stock: 7, imageUrl: "https://picsum.photos/seed/prod4/800/1000", imageHint: "denim jacket" },
        ]
    },
    { 
        id: "MST-002", 
        productCode: "MN-SH-002",
        name: "Men's Striped Shirt", 
        category: "Men", 
        price: 950.00, 
        variants: [
            { id: "VAR-010", productId: "MST-002", color: "Navy/White", size: "M", stock: 14, imageUrl: "https://picsum.photos/seed/prod5/800/1000", imageHint: "man shirt" },
            { id: "VAR-011", productId: "MST-002", color: "Navy/White", size: "L", stock: 11, imageUrl: "https://picsum.photos/seed/prod5/800/1000", imageHint: "man shirt" },
        ]
    },
    { 
        id: "WJP-005", 
        productCode: "WM-JS-005",
        name: "Women's Jumpsuit", 
        category: "Women", 
        price: 1800.00, 
        variants: [
            { id: "VAR-012", productId: "WJP-005", color: "Black", size: "S", stock: 9, imageUrl: "https://picsum.photos/seed/prod6-black/800/1000", imageHint: "woman black jumpsuit" },
            { id: "VAR-013", productId: "WJP-005", color: "Olive", size: "M", stock: 6, imageUrl: "https://picsum.photos/seed/prod6-olive/800/1000", imageHint: "woman olive jumpsuit" },
        ]
    },
].map(product => ({
    ...product,
    imageUrl: product.variants[0].imageUrl,
}));


type BaseProduct = {
    id: string;
    productCode: string;
    name: string;
    category: string;
    price: number;
    imageUrl: string;
    imageHint: string;
    variants: {
        id: string;
        color: string;
        size: string;
        stock: number;
        imageUrl: string;
        imageHint: string;
    }[];
}

export type Product = Omit<BaseProduct, 'variants' | 'imageHint'> & {
    productCode: string;
    variants: {
        id: string;
        color: string;
        size: string;
        stock: number;
        imageUrl: string;
    }[];
};
export type ProductVariant = Product["variants"][0];

let products: Product[] = [];

export async function getProducts(): Promise<Product[]> {
    const productsCollection = collection(db, "products");
    const querySnapshot = await getDocs(productsCollection);

    if (querySnapshot.empty) {
        // If no products in DB, populate with mock data
        const batch = writeBatch(db);
        mockProducts.forEach((product) => {
            const docRef = doc(productsCollection, product.id);
            batch.set(docRef, product);
        });
        await batch.commit();
        products = mockProducts.map(p => ({
            ...p,
            variants: p.variants.map(v => ({...v, productId: p.id}))
        })) as unknown as Product[];
        return products;
    }

    products = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    return products;
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
}

    
