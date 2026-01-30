// Script to add subcategory column to existing raw_materials table
import { getDB } from '../src/lib/db';

async function addSubcategoryColumn() {
  try {
    const db = await getDB();
    
    // Add subcategory column if it doesn't exist
    try {
      await db.exec(`ALTER TABLE raw_materials ADD COLUMN subcategory TEXT`);
      console.log('✅ Added subcategory column to raw_materials table');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  Subcategory column already exists');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addSubcategoryColumn();