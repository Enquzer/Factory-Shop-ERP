import { getDb, resetDbCache } from './db';
import { padNumberGenerator } from './pad-number-generator';
import { getMarketingOrderByIdFromDB } from './marketing-orders';

export interface ReceivingVoucher {
  id: string;
  marketingOrderId: string;
  productCode: string;
  productName: string;
  quantity: number;
  receivingDate: Date;
  receivedBy?: string;
  status: 'Pending' | 'Received' | 'Verified';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Pad number fields
  padNumber?: string;
  padSequence?: number;
  padPrefix?: string;
  padFormat?: string;
}

// Create a new receiving voucher when production is completed
export async function createReceivingVoucher(
  marketingOrderId: string, 
  receivedBy?: string,
  notes?: string
): Promise<ReceivingVoucher> {
  try {
    const db = await getDb();
    
    // Get the marketing order details
    const order = await getMarketingOrderByIdFromDB(marketingOrderId);
    if (!order) {
      throw new Error('Marketing order not found');
    }

    // Generate pad number for the receiving voucher
    const padResult = await padNumberGenerator.generateNext('receiving');
    
    // Create the receiving voucher
    const voucherId = `RV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await db.run(`
      INSERT INTO finished_goods_receiving_vouchers 
      (id, marketingOrderId, productCode, productName, quantity, receivingDate, receivedBy, status, notes, 
       padNumber, padSequence, padPrefix, padFormat, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 'Pending', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      voucherId,
      marketingOrderId,
      order.productCode,
      order.productName,
      order.quantity,
      receivedBy || null,
      notes || null,
      padResult.number,
      padResult.sequence,
      'FG-RV',
      'PREFIX-SEQUENCE'
    ]);

    // Also update the marketing order with the receiving voucher pad number
    await db.run(`
      UPDATE marketing_orders
      SET receivingVoucherPadNumber = ?, receivingVoucherSequence = ?, 
          receivingVoucherPrefix = ?, receivingVoucherFormat = ?, updatedAt = datetime('now')
      WHERE id = ?
    `, [
      padResult.number,
      padResult.sequence,
      'FG-RV',
      'PREFIX-SEQUENCE',
      marketingOrderId
    ]);

    resetDbCache();

    // Return the created voucher
    const createdVoucher = await db.get(
      'SELECT * FROM finished_goods_receiving_vouchers WHERE id = ?', 
      [voucherId]
    );

    return {
      id: createdVoucher.id,
      marketingOrderId: createdVoucher.marketingOrderId,
      productCode: createdVoucher.productCode,
      productName: createdVoucher.productName,
      quantity: createdVoucher.quantity,
      receivingDate: new Date(createdVoucher.receivingDate),
      receivedBy: createdVoucher.receivedBy,
      status: createdVoucher.status,
      notes: createdVoucher.notes,
      createdAt: new Date(createdVoucher.createdAt),
      updatedAt: new Date(createdVoucher.updatedAt),
      padNumber: createdVoucher.padNumber,
      padSequence: createdVoucher.padSequence,
      padPrefix: createdVoucher.padPrefix,
      padFormat: createdVoucher.padFormat
    };

  } catch (error) {
    console.error('Error creating receiving voucher:', error);
    throw error;
  }
}

// Get all receiving vouchers
export async function getReceivingVouchers(): Promise<ReceivingVoucher[]> {
  try {
    const db = await getDb();
    const vouchers = await db.all(`
      SELECT rv.*, mo.orderNumber as orderNumber
      FROM finished_goods_receiving_vouchers rv
      JOIN marketing_orders mo ON rv.marketingOrderId = mo.id
      ORDER BY rv.createdAt DESC
    `);
    
    return vouchers.map((voucher: any) => ({
      id: voucher.id,
      marketingOrderId: voucher.marketingOrderId,
      productCode: voucher.productCode,
      productName: voucher.productName,
      quantity: voucher.quantity,
      receivingDate: new Date(voucher.receivingDate),
      receivedBy: voucher.receivedBy,
      status: voucher.status,
      notes: voucher.notes,
      createdAt: new Date(voucher.createdAt),
      updatedAt: new Date(voucher.updatedAt),
      padNumber: voucher.padNumber,
      padSequence: voucher.padSequence,
      padPrefix: voucher.padPrefix,
      padFormat: voucher.padFormat
    }));
  } catch (error) {
    console.error('Error fetching receiving vouchers:', error);
    return [];
  }
}

// Get receiving vouchers for a specific order
export async function getReceivingVouchersByOrder(marketingOrderId: string): Promise<ReceivingVoucher[]> {
  try {
    const db = await getDb();
    const vouchers = await db.all(
      'SELECT * FROM finished_goods_receiving_vouchers WHERE marketingOrderId = ? ORDER BY createdAt DESC',
      [marketingOrderId]
    );
    
    return vouchers.map((voucher: any) => ({
      id: voucher.id,
      marketingOrderId: voucher.marketingOrderId,
      productCode: voucher.productCode,
      productName: voucher.productName,
      quantity: voucher.quantity,
      receivingDate: new Date(voucher.receivingDate),
      receivedBy: voucher.receivedBy,
      status: voucher.status,
      notes: voucher.notes,
      createdAt: new Date(voucher.createdAt),
      updatedAt: new Date(voucher.updatedAt),
      padNumber: voucher.padNumber,
      padSequence: voucher.padSequence,
      padPrefix: voucher.padPrefix,
      padFormat: voucher.padFormat
    }));
  } catch (error) {
    console.error('Error fetching receiving vouchers by order:', error);
    return [];
  }
}

// Update receiving voucher status
export async function updateReceivingVoucherStatus(
  voucherId: string, 
  status: 'Pending' | 'Received' | 'Verified',
  updatedBy?: string
): Promise<void> {
  try {
    const db = await getDb();
    await db.run(`
      UPDATE finished_goods_receiving_vouchers 
      SET status = ?, receivedBy = COALESCE(?, receivedBy), updatedAt = datetime('now')
      WHERE id = ?
    `, [status, updatedBy || null, voucherId]);
    
    resetDbCache();
  } catch (error) {
    console.error('Error updating receiving voucher status:', error);
    throw error;
  }
}

// Update receiving voucher pad number manually
export async function updateReceivingVoucherPadNumber(
  voucherId: string, 
  newPadNumber: string
): Promise<void> {
  try {
    const db = await getDb();
    
    // Parse the new pad number to extract sequence
    const parsed = padNumberGenerator.parsePadNumber(newPadNumber);
    if (!parsed) {
      throw new Error('Invalid pad number format');
    }
    
    await db.run(`
      UPDATE finished_goods_receiving_vouchers 
      SET padNumber = ?, padSequence = ?, updatedAt = datetime('now')
      WHERE id = ?
    `, [newPadNumber, parsed.sequence, voucherId]);
    
    resetDbCache();
  } catch (error) {
    console.error('Error updating receiving voucher pad number:', error);
    throw error;
  }
}