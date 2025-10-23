import { getDb } from '../lib/db';
import { getProducts } from '../lib/products';
import { getShops } from '../lib/shops';

async function addSampleOrders() {
  try {
    const db = await getDb();
    
    // Get products and shops
    const products = await getProducts();
    const shops = await getShops();
    
    if (products.length === 0) {
      console.log('No products found. Please add some products first.');
      return;
    }
    
    if (shops.length === 0) {
      console.log('No shops found. Please add some shops first.');
      return;
    }
    
    // Get the first shop and product for sample data
    const shop = shops[0];
    const product = products[0];
    
    // Create sample orders for different time periods
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Sample order items
    const sampleItems = [
      {
        productId: product.id,
        variant: product.variants[0],
        quantity: 5,
        price: product.price,
        name: product.name,
        imageUrl: product.imageUrl || product.variants[0]?.imageUrl || ''
      }
    ];
    
    // Add order from last month
    const orderId1 = `ORD-${Date.now() - 86400000 * 30}`; // 30 days ago
    const orderDate1 = lastMonth.toISOString().split('T')[0];
    await db.run(`
      INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      orderId1,
      shop.id,
      shop.name,
      orderDate1,
      'Delivered',
      product.price * 5,
      JSON.stringify(sampleItems)
    );
    
    // Add order from last week
    const orderId2 = `ORD-${Date.now() - 86400000 * 7}`; // 7 days ago
    const orderDate2 = lastWeek.toISOString().split('T')[0];
    await db.run(`
      INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      orderId2,
      shop.id,
      shop.name,
      orderDate2,
      'Delivered',
      product.price * 3,
      JSON.stringify(sampleItems)
    );
    
    // Add order from this week
    const orderId3 = `ORD-${Date.now()}`;
    const orderDate3 = now.toISOString().split('T')[0];
    await db.run(`
      INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      orderId3,
      shop.id,
      shop.name,
      orderDate3,
      'Delivered',
      product.price * 7,
      JSON.stringify(sampleItems)
    );
    
    console.log('Sample orders added successfully!');
    console.log('- Order from last month:', orderDate1);
    console.log('- Order from last week:', orderDate2);
    console.log('- Order from this week:', orderDate3);
  } catch (error) {
    console.error('Error adding sample orders:', error);
  }
}

// Run the function
addSampleOrders().then(() => {
  console.log('Done!');
  process.exit(0);
});