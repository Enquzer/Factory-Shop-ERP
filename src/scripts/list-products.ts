import { getDb } from '../lib/db';

async function listProducts() {
  try {
    const db = await getDb();
    const products = await db.all('SELECT productCode, name FROM products');
    console.log('Existing products:');
    products.forEach((p: any) => {
      console.log(`- ${p.productCode}: ${p.name}`);
    });
  } catch (error) {
    console.error('Error listing products:', error);
  }
}

listProducts();