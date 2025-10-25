const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

async function listAllProducts() {
  try {
    console.log('Listing all products:');
    
    // Get all products
    const products = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, productCode, name, readyToDeliver 
        FROM products
        ORDER BY productCode
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (products.length === 0) {
      console.log('No products found in database');
      return;
    }
    
    products.forEach(product => {
      console.log(`  ${product.productCode} - ${product.name} (Ready: ${product.readyToDeliver === 1 ? 'Yes' : 'No'})`);
    });
    
    return products;
  } catch (error) {
    console.error('Error listing products:', error);
  }
}

async function checkProductStock(productCode) {
  try {
    console.log(`Checking stock for product: ${productCode}`);
    
    // Get the product
    const product = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, productCode, name, readyToDeliver 
        FROM products 
        WHERE productCode LIKE ?
      `, [`%${productCode}%`], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!product) {
      console.log(`Product with code containing "${productCode}" not found`);
      console.log('\nAvailable products:');
      await listAllProducts();
      return;
    }
    
    console.log('Product info:', product);
    
    // Get factory variants
    const factoryVariants = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, color, size, stock 
        FROM product_variants 
        WHERE productId = ?
      `, [product.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Factory variants:');
    let totalFactoryStock = 0;
    factoryVariants.forEach(variant => {
      console.log(`  ${variant.color} ${variant.size}: ${variant.stock} units`);
      totalFactoryStock += variant.stock;
    });
    console.log(`Total factory stock: ${totalFactoryStock}`);
    
    // Get shop inventory items
    const shopInventory = await new Promise((resolve, reject) => {
      db.all(`
        SELECT si.shopId, s.name as shopName, si.color, si.size, si.stock, si.productVariantId
        FROM shop_inventory si
        JOIN shops s ON si.shopId = s.id
        WHERE si.productId = ?
      `, [product.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('\nShop inventory:');
    const shopStockByVariant = {};
    shopInventory.forEach(item => {
      console.log(`  Shop: ${item.shopName} | ${item.color} ${item.size}: ${item.stock} units`);
      const key = `${item.color}-${item.size}`;
      if (!shopStockByVariant[key]) {
        shopStockByVariant[key] = { total: 0, shops: [] };
      }
      shopStockByVariant[key].total += item.stock;
      shopStockByVariant[key].shops.push({ shop: item.shopName, stock: item.stock });
    });
    
    console.log('\nShop stock by variant:');
    Object.keys(shopStockByVariant).forEach(key => {
      console.log(`  ${key}: ${shopStockByVariant[key].total} units across ${shopStockByVariant[key].shops.length} shops`);
      shopStockByVariant[key].shops.forEach(shop => {
        console.log(`    - ${shop.shop}: ${shop.stock} units`);
      });
    });
    
    // Check if product is ready for delivery
    console.log(`\nProduct ready for delivery: ${product.readyToDeliver === 1 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('Error checking product stock:', error);
  } finally {
    db.close();
  }
}

// Get product code from command line arguments or list all products
const productCode = process.argv[2];
if (productCode) {
  checkProductStock(productCode);
} else {
  listAllProducts().then(() => db.close());
}