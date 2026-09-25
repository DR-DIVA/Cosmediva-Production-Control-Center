/**
 * ZPL II Label Generator & Network Thermal Printer Service
 */
export interface LabelData {
  itemCode: string;
  itemName: string;
  lotNumber: string;
  supplierName: string;
  quantity: number;
  uom: string;
  mfgDate: string;
  expiryDate: string;
  qrPayload: string;
}

/**
 * Generates ZPL II format for 100mm x 75mm (4x3 inch) industrial thermal pallet label
 */
export function generateZplPalletLabel(data: LabelData): string {
  return `
^XA
^PW800
^LL600
^FO40,30^A0N,36,36^FD[COSMEFLOW WMS] PACKAGING LOT TAG^FS
^FO40,75^GB720,2,2^FS

^FO40,95^A0N,28,28^FDITEM:^FS
^FO150,95^A0N,32,32^FD${data.itemCode}^FS
^FO150,135^A0N,24,24^FD${data.itemName.slice(0, 38)}^FS

^FO40,185^A0N,28,28^FDLOT NO:^FS
^FO150,185^A0N,32,32^FD${data.lotNumber}^FS

^FO40,235^A0N,28,28^FDQTY:^FS
^FO150,235^A0N,36,36^FD${data.quantity.toLocaleString()} ${data.uom}^FS

^FO40,285^A0N,24,24^FDSUPPLIER:^FS
^FO150,285^A0N,24,24^FD${data.supplierName.slice(0, 30)}^FS

^FO40,335^A0N,24,24^FDMFG: ${data.mfgDate}^FS
^FO260,335^A0N,28,28^FDEXP: ${data.expiryDate}^FS

^FO520,180^BQN,2,7
^FDLA,${data.qrPayload}^FS

^FO40,430^GB720,2,2^FS
^FO40,445^A0N,22,22^FDSTATUS: QUARANTINE (WAITING QC SAMPLING)^FS
^FO40,480^A0N,18,18^FDDO NOT USE IN PRODUCTION UNTIL QC RELEASED^FS
^XZ
`.trim();
}
