
const { getDb } = require('./src/lib/db');
const path = require('path');

async function checkProducts() {
  const db = await getDb();
  
  const productCount = await db.get('SELECT COUNT(*) as count FROM products');
  console.log('Product Count:', productCount.count);
  
  const orderCount = await db.get('SELECT COUNT(*) as count FROM marketing_orders');
  console.log('Marketing Order Count:', orderCount.count);

  const bomCount = await db.get('SELECT COUNT(*) as count FROM product_bom');
  console.log('Product BOM Count:', bomCount.count);

  if (productCount.count > 0) {
    const products = await db.all('SELECT id, productName, productCode FROM products LIMIT 5');
    console.log('Sample Products:', products);
  }

  if (bomCount.count > 0) {
     const bom = await db.all('SELECT * FROM product_bom LIMIT 5');
     console.log('Sample BOM:', bom);
  }
}

checkProducts().catch(console.error);
