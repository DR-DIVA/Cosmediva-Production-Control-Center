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
 * Standard Barcode / QR Code Parser:
 * Supports:
 * 1. Web Link QR (Scannable by LINE, iPhone Camera, Android Camera):
 *    https://.../wms/mobile?lot=LOT-PM-202609-0002&data=CFWMS|PALLET|...
 * 2. Pipe-Delimited WMS QR:
 *    CFWMS|TYPE|ID|ITEM|LOT|QTY|EXP
 * 3. Location Barcode:
 *    WH-PM-A-R01-B01-L01-BN01
 * 4. Lot Barcode:
 *    LOT-PM-202609-0001
 */
export function parseBarcode(rawInput: string): ParsedBarcode {
  const trimmed = (rawInput || '').trim();

  // 1. Handle Web Link QR (from LINE, iPhone Camera, Google Lens, or browser URL)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('/wms/mobile?')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.local${trimmed}`);
      const dataParam = url.searchParams.get('data') || url.searchParams.get('scan');
      if (dataParam && dataParam.startsWith('CFWMS|')) {
        return parseBarcode(dataParam);
      }
      const lotParam = url.searchParams.get('lot');
      if (lotParam) {
        return {
          raw: trimmed,
          isStructured: true,
          type: 'LOT',
          lotNumber: lotParam,
          itemCode: url.searchParams.get('item') || undefined,
          quantity: url.searchParams.get('qty') ? parseFloat(url.searchParams.get('qty')!) : undefined,
          expiryDate: url.searchParams.get('exp') || undefined,
        };
      }
      const locParam = url.searchParams.get('loc');
      if (locParam) {
        return {
          raw: trimmed,
          isStructured: false,
          type: 'LOCATION',
          id: locParam,
        };
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Handle Structured Pipe-delimited WMS QR Code
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

  // 3. Location barcodes like WH-PM-A-R01-B01-L01-BN01
  if (trimmed.startsWith('WH-')) {
    return {
      raw: trimmed,
      isStructured: false,
      type: 'LOCATION',
      id: trimmed,
    };
  }

  // 4. Lot barcodes like LOT-PM-202609-0001
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
 * Encodes payload into Smart Web Link QR payload
 * - When scanned with LINE / iPhone Camera: Opens CosmeFlow WMS Mobile directly!
 * - When scanned with PDA Scanner Gun: Decoded cleanly by parseBarcode().
 */
export function formatQrPayload(params: {
  type: 'PALLET' | 'CARTON' | 'LOCATION' | 'ITEM';
  id: string;
  itemCode?: string;
  lotNumber?: string;
  quantity?: number;
  expiryDate?: string;
  baseUrl?: string;
}): string {
  const base = params.baseUrl || 'https://cosmediva-production-control-center-production.up.railway.app';
  const pipeData = [
    'CFWMS',
    params.type,
    params.id,
    params.itemCode || '',
    params.lotNumber || '',
    params.quantity !== undefined ? params.quantity.toString() : '',
    params.expiryDate || '',
  ].join('|');

  return `${base}/wms/mobile?lot=${encodeURIComponent(params.lotNumber || '')}&data=${encodeURIComponent(pipeData)}`;
}
