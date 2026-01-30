import { getDb, resetDbCache } from './db';
import { 
  PadNumberConfig, 
  PadNumberResult, 
  PadSequenceInfo,
  PAD_NUMBER_CONFIG,
  formatPadNumber,
  generateSequenceId
} from './pad-number-config';

export class PadNumberGenerator {
  private db: any;

  constructor() {
    // Database will be initialized when methods are called
  }

  private async getDb() {
    if (!this.db) {
      this.db = await getDb();
    }
    return this.db;
  }

  /**
   * Generate next pad number for a given type and optional shop
   */
  async generateNext(type: 'material' | 'finished' | 'receiving', shopId?: string): Promise<PadNumberResult> {
    const db = await this.getDb();
    
    // Get configuration
    const config = PAD_NUMBER_CONFIG[type];
    if (!config) {
      throw new Error(`Unsupported pad number type: ${type}`);
    }

    // Generate sequence ID
    const sequenceId = generateSequenceId(type, shopId);

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Get or create sequence record
      let sequenceRecord = await db.get(
        'SELECT * FROM pad_number_sequences WHERE id = ?',
        [sequenceId]
      );

      if (!sequenceRecord) {
        // Create new sequence record
        const newSequence = config.startSequence || 1;
        await db.run(`
          INSERT INTO pad_number_sequences 
          (id, type, shopId, currentSequence, prefix, format, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          sequenceId,
          type,
          shopId || null,
          newSequence,
          config.prefix,
          config.format
        ]);
        
        sequenceRecord = {
          id: sequenceId,
          type,
          shopId: shopId || null,
          currentSequence: newSequence,
          prefix: config.prefix,
          format: config.format
        };
      }

      // Increment sequence
      const nextSequence = sequenceRecord.currentSequence + 1;
      
      // Update sequence record
      await db.run(`
        UPDATE pad_number_sequences 
        SET currentSequence = ?, updatedAt = datetime('now')
        WHERE id = ?
      `, [nextSequence, sequenceId]);

      // Format the pad number
      const padNumber = formatPadNumber(
        sequenceRecord.prefix,
        nextSequence,
        sequenceRecord.format,
        config.minLength,
        shopId
      );

      // Commit transaction
      await db.run('COMMIT');

      return {
        number: padNumber,
        sequence: nextSequence
      };

    } catch (error) {
      // Rollback transaction
      await db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Manual update of pad number
   */
  async updatePadNumber(
    id: string, 
    type: 'material' | 'finished', 
    newNumber: string,
    recordId: string // The actual ID of the requisition or order
  ): Promise<void> {
    const db = await this.getDb();
    
    // Validate the new pad number
    const config = PAD_NUMBER_CONFIG[type];
    if (!config) {
      throw new Error(`Unsupported pad number type: ${type}`);
    }

    // Parse and validate the new number
    const parsed = this.parsePadNumber(newNumber);
    if (!parsed || parsed.prefix !== config.prefix) {
      throw new Error(`Invalid pad number format. Expected format: ${config.prefix}-[sequence]`);
    }

    // For finished goods, validate shop ID if present
    if (type === 'finished' && parsed.shopId) {
      // You might want to validate that the shop ID matches the order's shop
      // This would require additional logic to fetch the order details
    }

    // Update the record
    const tableName = type === 'material' ? 'material_requisitions' : 'orders';
    
    await db.run(`
      UPDATE ${tableName}
      SET padNumber = ?, padSequence = ?, padPrefix = ?, padFormat = ?
      WHERE id = ?
    `, [
      newNumber,
      parsed.sequence,
      parsed.prefix,
      config.format,
      recordId
    ]);

    resetDbCache();
  }

  /**
   * Get current sequence number
   */
  async getCurrentSequence(type: 'material' | 'finished', shopId?: string): Promise<number> {
    const db = await this.getDb();
    
    const sequenceId = generateSequenceId(type, shopId);
    
    const record = await db.get(
      'SELECT currentSequence FROM pad_number_sequences WHERE id = ?',
      [sequenceId]
    );
    
    return record ? record.currentSequence : 0;
  }

  /**
   * Get all sequence information
   */
  async getAllSequences(): Promise<PadSequenceInfo[]> {
    const db = await this.getDb();
    
    const records = await db.all(`
      SELECT * FROM pad_number_sequences
      ORDER BY type, shopId
    `);
    
    return records.map((record: any) => ({
      id: record.id,
      type: record.type,
      shopId: record.shopId,
      currentSequence: record.currentSequence,
      prefix: record.prefix,
      format: record.format,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt)
    }));
  }

  /**
   * Reset sequence (admin function)
   */
  async resetSequence(type: 'material' | 'finished', shopId?: string, newSequence: number = 0): Promise<void> {
    const db = await this.getDb();
    
    const sequenceId = generateSequenceId(type, shopId);
    
    await db.run(`
      UPDATE pad_number_sequences
      SET currentSequence = ?, updatedAt = datetime('now')
      WHERE id = ?
    `, [newSequence, sequenceId]);

    resetDbCache();
  }

  /**
   * Initialize sequence for a specific shop (for finished goods)
   */
  async initializeShopSequence(shopId: string): Promise<void> {
    const db = await this.getDb();
    
    const sequenceId = generateSequenceId('finished', shopId);
    const config = PAD_NUMBER_CONFIG.finished;
    
    await db.run(`
      INSERT OR IGNORE INTO pad_number_sequences 
      (id, type, shopId, currentSequence, prefix, format, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      sequenceId,
      'finished',
      shopId,
      config.startSequence || 0,
      config.prefix,
      config.format
    ]);

    resetDbCache();
  }

  /**
   * Parse pad number (public helper)
   */
  parsePadNumber(padNumber: string): {
    prefix: string;
    sequence: number;
    shopId?: string;
  } | null {
    if (!padNumber) return null;
    
    // Handle PREFIX-SEQUENCE format (e.g., "RM-00001")
    const prefixSeqMatch = padNumber.match(/^([A-Z]+)-([A-Z0-9]+-)?(\d+)$/);
    if (prefixSeqMatch) {
      const prefix = prefixSeqMatch[1];
      const shopPart = prefixSeqMatch[2];
      const sequence = parseInt(prefixSeqMatch[3], 10);
      
      if (shopPart) {
        // PREFIX-SHOPID-SEQUENCE format
        const shopId = shopPart.slice(0, -1); // Remove trailing dash
        return { prefix, sequence, shopId };
      } else {
        // PREFIX-SEQUENCE format
        return { prefix, sequence };
      }
    }
    
    return null;
  }
}

// Export singleton instance
export const padNumberGenerator = new PadNumberGenerator();