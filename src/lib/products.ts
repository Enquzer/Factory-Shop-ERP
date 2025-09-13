

export const products = [
    { 
        id: "MCT-001", 
        name: "Men's Classic Tee", 
        category: "Men", 
        price: 500.00, 
        imageUrl: "https://picsum.photos/seed/prod1/800/1000", 
        imageHint: "man t-shirt",
        variants: [
            { id: "VAR-001", productId: "MCT-001", color: "White", size: "M", stock: 15 },
            { id: "VAR-002", productId: "MCT-001", color: "White", size: "L", stock: 10 },
            { id: "VAR-003", productId: "MCT-001", color: "Black", size: "M", stock: 20 },
            { id: "VAR-004", productId: "MCT-001", color: "Black", size: "XL", stock: 5 },
        ]
    },
    { 
        id: "WSD-012", 
        name: "Women's Summer Dress", 
        category: "Women", 
        price: 1200.00, 
        imageUrl: "https://picsum.photos/seed/prod2/800/1000", 
        imageHint: "woman dress",
        variants: [
            { id: "VAR-005", productId: "WSD-012", color: "Floral", size: "S", stock: 8 },
            { id: "VAR-006", productId: "WSD-012", color: "Floral", size: "M", stock: 12 },
        ]
    },
    { 
        id: "KGH-034", 
        name: "Kid's Graphic Hoodie", 
        category: "Kids", 
        price: 850.00, 
        imageUrl: "https://picsum.photos/seed/prod3/800/1000", 
        imageHint: "kids hoodie",
        variants: [
            { id: "VAR-007", productId: "KGH-034", color: "Blue", size: "6Y", stock: 18 },
            { id: "VAR-008", productId: "KGH-034", color: "Pink", size: "8Y", stock: 22 },
        ]
    },
    { 
        id: "UDJ-007", 
        name: "Unisex Denim Jacket", 
        category: "Unisex", 
        price: 2500.00, 
        imageUrl: "https://picsum.photos/seed/prod4/800/1000", 
        imageHint: "denim jacket",
        variants: [
            { id: "VAR-009", productId: "UDJ-007", color: "Indigo", size: "L", stock: 7 },
        ]
    },
    { 
        id: "MST-002", 
        name: "Men's Striped Shirt", 
        category: "Men", 
        price: 950.00, 
        imageUrl: "https://picsum.photos/seed/prod5/800/1000", 
        imageHint: "man shirt",
        variants: [
            { id: "VAR-010", productId: "MST-002", color: "Navy/White", size: "M", stock: 14 },
            { id: "VAR-011", productId: "MST-002", color: "Navy/White", size: "L", stock: 11 },
        ]
    },
    { 
        id: "WJP-005", 
        name: "Women's Jumpsuit", 
        category: "Women", 
        price: 1800.00, 
        imageUrl: "https://picsum.photos/seed/prod6/800/1000", 
        imageHint: "woman jumpsuit",
        variants: [
            { id: "VAR-012", productId: "WJP-005", color: "Black", size: "S", stock: 9 },
            { id: "VAR-013", productId: "WJP-005", color: "Olive", size: "M", stock: 6 },
        ]
    },
];

export type Product = typeof products[0];
export type ProductVariant = Product["variants"][0];
