import { getDb } from './src/lib/db';

async function checkShop() {
    try {
        const db = await getDb();
        const shop = await db.get('SELECT * FROM shops WHERE name = ?', 'Mexico Shop');
        console.log('SHOP_RESULT:', JSON.stringify(shop));
    } catch (err) {
        console.error('ERROR:', err);
    }
}

checkShop();
