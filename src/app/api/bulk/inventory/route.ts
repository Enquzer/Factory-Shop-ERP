import { NextRequest } from 'next/server';
import { getDb, resetDbCache } from '@/lib/db';

// DELETE /api/bulk/inventory - Delete multiple inventory items
export async function DELETE(request: NextRequest) {
  try {
    const { inventoryIds } = await request.json();
    
    // Validate required fields
    if (!inventoryIds || !Array.isArray(inventoryIds)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing or invalid inventory IDs array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate inventory IDs
    if (inventoryIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Inventory IDs array cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    for (const inventoryId of inventoryIds) {
      if (typeof inventoryId !== 'number' && typeof inventoryId !== 'string') {
        return new Response(
          JSON.stringify({ success: false, message: 'All inventory IDs must be numbers or strings' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Delete inventory items one by one
    let deletedCount = 0;
    const errors: string[] = [];
    
    for (const inventoryId of inventoryIds) {
      try {
        const db = await getDb();
        const result = await db.run(`
          DELETE FROM shop_inventory 
          WHERE id = ?
        `, Number(inventoryId));
        
        const deleted = (result.changes || 0) > 0;
        if (deleted) {
          deletedCount++;
        } else {
          errors.push(`Inventory item with ID ${inventoryId} not found or failed to delete`);
        }
      } catch (error) {
        errors.push(`Error deleting inventory item with ID ${inventoryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Reset the database cache to ensure subsequent queries get fresh data
    resetDbCache();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} of ${inventoryIds.length} inventory items`,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting inventory items in bulk:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to delete inventory items in bulk' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}