import { getDb } from './src/lib/db.ts';
import { getShopByUsername } from './src/lib/shops.ts';

async function populateShopInventory() {
  try {
    const shop = await getShopByUsername('Megenagna');
    if (!shop) {
      console.log('Shop not found');
      return;
    }
    
    const db = await getDb();
    
    // Add some products to the shop inventory
    const products = [
      {
        productId: 'PRD-1768835408946',
        productVariantId: 'VAR-1768835408951-670',
        name: 'kids Pijama',
        price: 1200,
        color: 'blue',
        size: '2-3',
        stock: 10,
        imageUrl: '/uploads/CK-PJ-003_blue_2-3.png'
      },
      {
        productId: 'PRD-1768835408946',
        productVariantId: 'VAR-1768835408956-52',
        name: 'kids Pijama',
        price: 1200,
        color: 'Blue',
        size: '3-4',
        stock: 5,
        imageUrl: '/uploads/CK-PJ-003_Blue_3-4.png'
      },
      {
        productId: 'PROD-1769008806707',
        productVariantId: 'VAR-1769201965302-582',
        name: 'ladies top',
        price: 800,
        color: 'brown',
        size: 'S',
        stock: 20,
        imageUrl: '/uploads/1769008310857-235-brown.png'
      },
      {
        productId: 'PROD-1769008806707',
        productVariantId: 'VAR-1769201965320-284',
        name: 'ladies top',
        price: 800,
        color: 'brown',
        size: 'M',
        stock: 15,
        imageUrl: '/uploads/1769008310857-235-brown.png'
      }
    ];
    
    for (const product of products) {
      await db.run(
        'INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        shop.id,
        product.productId,
        product.productVariantId,
        product.name,
        product.price,
        product.color,
        product.size,
        product.stock,
        product.imageUrl
      );
    }
    
    console.log('Shop inventory populated successfully');
  } catch (error) {
    console.error('Error populating shop inventory:', error);
  }
}

populateShopInventory();