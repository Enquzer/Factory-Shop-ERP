// Pad Number Configuration Management
export interface PadNumberConfig {
  prefix: string;
  format: string; // "PREFIX-SEQUENCE" or "PREFIX-SHOPID-SEQUENCE"
  minLength?: number; // Minimum sequence length (for leading zeros)
  alphanumeric?: boolean; // Whether to include letters
  startSequence?: number; // Starting sequence number
}

export interface PadNumberResult {
  number: string;
  sequence: number;
}

export interface PadSequenceInfo {
  id: string;
  type: 'material' | 'finished';
  shopId: string | null;
  currentSequence: number;
  prefix: string;
  format: string;
  createdAt: Date;
  updatedAt: Date;
}

// Default configurations
export const PAD_NUMBER_CONFIG: Record<string, PadNumberConfig> = {
  material: {
    prefix: "RM",
    format: "PREFIX-SEQUENCE",
    minLength: 5,
    startSequence: 1
  },
  finished: {
    prefix: "FG",
    format: "PREFIX-SHOPID-SEQUENCE",
    minLength: 4,
    startSequence: 1
  },
  receiving: {
    prefix: "FG-RV",
    format: "PREFIX-SEQUENCE",
    minLength: 5,
    startSequence: 1
  }
};

// Format patterns
export const PAD_FORMATS = {
  PREFIX_SEQUENCE: "PREFIX-SEQUENCE",
  PREFIX_SHOPID_SEQUENCE: "PREFIX-SHOPID-SEQUENCE"
};

// Utility functions for pad number formatting
export function formatPadNumber(
  prefix: string,
  sequence: number,
  format: string,
  minLength: number = 0,
  shopId?: string
): string {
  let sequenceStr = sequence.toString();
  
  // Add leading zeros if minLength is specified
  if (minLength > 0) {
    sequenceStr = sequenceStr.padStart(minLength, '0');
  }
  
  switch (format) {
    case PAD_FORMATS.PREFIX_SEQUENCE:
      return `${prefix}-${sequenceStr}`;
    case PAD_FORMATS.PREFIX_SHOPID_SEQUENCE:
      if (!shopId) {
        throw new Error('Shop ID is required for PREFIX-SHOPID-SEQUENCE format');
      }
      // Use first 3 characters of shop ID for brevity
      const shopCode = shopId.substring(0, 3).toUpperCase();
      return `${prefix}-${shopCode}-${sequenceStr}`;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// Parse pad number to extract components
export function parsePadNumber(padNumber: string): {
  prefix: string;
  sequence: number;
  shopId?: string;
} | null {
  if (!padNumber) return null;
  
  // Handle PREFIX-SEQUENCE format (e.g., "RM-00001")
  const prefixSeqMatch = padNumber.match(/^([A-Z]+)-(\d+)$/);
  if (prefixSeqMatch) {
    return {
      prefix: prefixSeqMatch[1],
      sequence: parseInt(prefixSeqMatch[2], 10)
    };
  }
  
  // Handle PREFIX-SHOPID-SEQUENCE format (e.g., "FG-SHO-001")
  const prefixShopSeqMatch = padNumber.match(/^([A-Z]+)-([A-Z0-9]+)-(\d+)$/);
  if (prefixShopSeqMatch) {
    return {
      prefix: prefixShopSeqMatch[1],
      sequence: parseInt(prefixShopSeqMatch[3], 10),
      shopId: prefixShopSeqMatch[2]
    };
  }
  
  return null;
}

// Validate pad number format
export function isValidPadNumber(padNumber: string, expectedPrefix?: string): boolean {
  if (!padNumber) return false;
  
  const parsed = parsePadNumber(padNumber);
  if (!parsed) return false;
  
  // Check if prefix matches expected prefix (if provided)
  if (expectedPrefix && parsed.prefix !== expectedPrefix) {
    return false;
  }
  
  // Sequence should be positive
  if (parsed.sequence <= 0) return false;
  
  return true;
}

// Generate sequence ID for database lookup
export function generateSequenceId(type: 'material' | 'finished' | 'receiving', shopId?: string): string {
  if (type === 'material') {
    return 'material-default';
  } else if (type === 'receiving') {
    return 'receiving-voucher-default';
  } else {
    return shopId ? `finished-${shopId}` : 'finished-default';
  }
}