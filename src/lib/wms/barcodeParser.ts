export interface ParsedBarcode {
  raw: string;
  isStructured: boolean;
  prefix?: string;
  type?: 'PALLET' | 'CARTON' | 'LOCATION' | 'ITEM' | 'LOT' | 'USER';
  id?: string;
  itemCode?: string;
  lotNumber?: string;
  quantity?: number;
  expiryDate?: string;
}

/**
 * Standard Pipe-Delimited QR Code Parser:
 * Format: CFWMS|TYPE|ID|ITEM|LOT|QTY|EXP
 * Example: CFWMS|PALLET|018e3a24-3333-7000|PM-BOT-030ML-CLR|LOT-PM-202609-0012|5000|2028-09-25
 */
export function parseBarcode(rawInput: string): ParsedBarcode {
  const trimmed = (rawInput || '').trim();

  if (trimmed.startsWith('CFWMS|')) {
    const parts = trimmed.split('|');
    return {
      raw: trimmed,
      isStructured: true,
      prefix: parts[0],
      type: parts[1] as any,
      id: parts[2] || undefined,
      itemCode: parts[3] || undefined,
      lotNumber: parts[4] || undefined,
      quantity: parts[5] ? parseFloat(parts[5]) : undefined,
      expiryDate: parts[6] || undefined,
    };
  }

  // Location barcodes like WH-PM-A-R01-B01-L01-BN01
  if (trimmed.startsWith('WH-')) {
    return {
      raw: trimmed,
      isStructured: false,
      type: 'LOCATION',
      id: trimmed,
    };
  }

  // Lot barcodes like LOT-PM-202609-0001
  if (trimmed.startsWith('LOT-')) {
    return {
      raw: trimmed,
      isStructured: false,
      type: 'LOT',
      lotNumber: trimmed,
    };
  }

  // Fallback as general item or ID
  return {
    raw: trimmed,
    isStructured: false,
    itemCode: trimmed,
  };
}

/**
 * Encodes payload into standard CFWMS QR payload
 */
export function formatQrPayload(params: {
  type: 'PALLET' | 'CARTON' | 'LOCATION' | 'ITEM';
  id: string;
  itemCode?: string;
  lotNumber?: string;
  quantity?: number;
  expiryDate?: string;
}): string {
  return [
    'CFWMS',
    params.type,
    params.id,
    params.itemCode || '',
    params.lotNumber || '',
    params.quantity !== undefined ? params.quantity.toString() : '',
    params.expiryDate || '',
  ].join('|');
}
