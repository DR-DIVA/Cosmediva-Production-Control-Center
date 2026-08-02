import { NextResponse } from 'next/server';
const pdf = require('pdf-parse/lib/pdf-parse.js');

function render_page(pageData: any) {
  let render_options = {
      normalizeWhitespace: false,
      disableCombineTextItems: false
  };
  return pageData.getTextContent(render_options)
    .then(function(textContent: any) {
      let lastY, text = '';
      for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY) {
              text += item.str;
          } else {
              text += '\n' + item.str;
          }
          lastY = item.transform[5];
      }
      return text + '\n---PAGE_BREAK---\n';
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let data;
    try {
      data = await pdf(buffer, { pagerender: render_page });
    } catch (err) {
      // Fallback if custom render fails
      data = await pdf(buffer);
    }
    
    const allText = data.text;
    
    // Split into pages and only keep pages with 'ใบสั่งซื้อ'
    const pages = allText.split('---PAGE_BREAK---');
    let targetText = '';
    
    if (pages.length > 1) {
      targetText = pages.filter((p: string) => p.includes('ใบสั่งซื้อ')).join('\n');
    }
    if (!targetText) targetText = allText; // fallback to all text if splitting failed or not found

    const text = targetText;

    // Example: "PL-R2607-006"
    const prMatch = text.match(/หมายเหตุ\s*PR:\s*([^ลว\n]+)/i) || text.match(/PR:\s*(PL-[A-Z0-9-]+)/i) || text.match(/PL-[A-Z0-9-]{4,10}/i);
    const prNo = prMatch ? (prMatch[1] || prMatch[0]).trim() : null;

    // Extract Header Text to avoid matching shipping locations in the footer
    const headerText = text.substring(0, text.indexOf('No.') > -1 ? text.indexOf('No.') : 1000);

    // Supplier
    // Foolproof extraction: Find all companies in the header, skip Cosmediva (us), the next one is the supplier!
    let supplier = null;
    const companyMatches = [...headerText.matchAll(/((?:บริษ.ท|บจก\.|บมจ\.)[\s\S]{1,100}?(?:จ.กัด|จำกัด|จํากัด|มหาชน\))|(?:หจก\.)[^\n]+)/g)];
    for (const match of companyMatches) {
       const comp = match[1].replace(/[\n๓]/g, ' ').replace(/\s+/g, ' ').trim();
       if (!comp.includes('คอสเมดิวา') && !comp.includes('Cosmediva')) {
           supplier = comp;
           break;
       }
    }
    
    // Fallback if not found (e.g. no บริษัท/จำกัด)
    if (!supplier) {
       const supplierMatch = headerText.match(/(?:ผู้จำหน่าย|ผู.{0,3}จำหน.{0,3}ย|ผู.{0,3}จําหน.{0,3}ย|ผู้ขาย|Supplier|SU[A-Z]\d{4})[^\n]*\n\s*([^\n]+)/i);
       if (supplierMatch) {
           supplier = supplierMatch[1].replace(/[\n๓]/g, ' ').replace(/\s+/g, ' ').trim();
       }
    }
    
    if (supplier && supplier.includes('วันที่')) {
       supplier = supplier.split('วันที่')[0].trim();
    }

    // PO Date
    const poDateMatch = text.match(/วันที่\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    let poDate = null;
    if (poDateMatch) {
      const parts = poDateMatch[1].split('/');
      if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        poDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Example: "SOPOHK2607-00002" or "PO2606079"
    const poMatch = text.match(/เลขที่ใบสั่งซื้อ\s*([A-Z0-9-]+)/i) || text.match(/SOPOHK[A-Z0-9-]{4,12}/i) || text.match(/PO\/SO:\s*([^\s]+)/i);
    const poNo = poMatch ? (poMatch[1] || poMatch[0]) : null;

    // Example ETA: "20/07/2026" or "29/06/26"
    const etaMatch = text.match(/วันที่รับของ\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) || text.match(/วันที่ต้องการใช้.*?(\d{1,2}\/\d{1,2}\/\d{4})/i) || text.match(/รับของ.*?(\d{1,2}\/\d{1,2}\/\d{4})/i);
    let etaDate = null;
    if (etaMatch) {
      const parts = etaMatch[1].split('/');
      if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        etaDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Top Remark
    const topRemarkMatch = text.match(/หมายเหตุ\s*(PR[^\n]+|PL-[^\n]+)/i) || text.match(/หมายเหตุ\s*([^\n]+)/i);
    let topRemark = topRemarkMatch ? topRemarkMatch[1].trim() : null;
    if (topRemark) {
       // Remove text from the right column (like "ขนส่งโดย" or "เครดิต") that gets merged into the same line
       topRemark = topRemark.split(/ขนส.งโดย|เครดิต/)[0].trim();
    }

    // Global Bottom Remark
    let globalBottomRemark = null;
    const lastRemarkIndex = text.lastIndexOf('หมายเหตุ');
    if (lastRemarkIndex > -1 && lastRemarkIndex > text.indexOf('หมายเหตุ') && lastRemarkIndex > text.length / 2) {
       const bottomSection = text.substring(lastRemarkIndex + 'หมายเหตุ'.length);
       const endMatch = bottomSection.match(/(ผู้สั่งซื้อ|ผู้อนุมัติ|เงื่อนไข|ผู.{0,2}สั่งซื้อ)/);
       let extractedBottom = endMatch ? bottomSection.substring(0, endMatch.index) : bottomSection.substring(0, 500);
       
       // Remove interleaved financial data from the right column, tolerant of legacy PDF Thai vowels
       // ORDER IS IMPORTANT: Match longer phrases first (e.g. จำนวนเงินหลังหักส่วนลด before หักส่วนลด)
       extractedBottom = extractedBottom.replace(/(รวมเป.{0,2}นเงิน|จ.{1,2}นวนเงินหลังหัก\s*ส.{0,2}วนลด|หัก\s*ส.{0,2}วนลด|จ.{1,2}นวนภาษีมูลค.{0,2}าเพิ่ม|จ.{1,2}นวนเงินรวมทั้งสิ้น|ตัวอักษร)\s*(:.*\(.*\)|\(.*\)|[๓]*[\s\d,.\-%/]+[๓]*)?/g, ' ');
       
       globalBottomRemark = extractedBottom.replace(/[\n๓]/g, ' / ').replace(/(?:\s*\/\s*)+/g, ' / ').replace(/(^\/|\/$)/g, '').trim();
       
       // The user requested to cut it off before anything related to pricing/legacy borders
       // Exclude ๐ (zero) and ๑๒๓ from the border catch, so it doesn't cut off numbers like "250,๐๐๐"
       const cutOffRegex = /(จ.{1,2}นวนเงิน|รวมเป.นเงิน|หักส.วนลด|ภาษีมูลค.าเพิ่ม|[๔๕๖๗๘๙]{4,})/;
       const cutMatch = globalBottomRemark.match(cutOffRegex);
       if (cutMatch) {
          globalBottomRemark = globalBottomRemark.substring(0, cutMatch.index).replace(/(^\/|\/$|\s*\/\s*$)/g, '').trim();
       }
    }

    // Items Extractor: Looks for rows starting with "No."
    const items: any[] = [];
    let itemsSection = '';
    const noIndex = text.indexOf('No.');
    if (noIndex > -1) {
       itemsSection = text.substring(noIndex);
       if (lastRemarkIndex > noIndex) {
          itemsSection = text.substring(noIndex, lastRemarkIndex);
       }
    } else {
       itemsSection = text;
    }

    // Match item lines even if they wrap to a new line!
    // Uses [\s\S] to tolerate newlines within the item name before hitting the warehouse/quantity.
    const itemRegex = /^[๓\s]*(\d+)[๓\s]+([A-Z0-9-]+)[๓\s]+([\s\S]{1,150}?)[๓\s]+([A-Z0-9]{2,6}|คลัง)?[๓\s]*([\d,.]+)[๓\s]*(KG|PCS|G|ML|L|KGS|EA|SET|BTL|BOX|TUBE|JAR|CAP|ROLL|PACK|BAG|PUMP|M|CM|MM|ชิ้น|ใบ|แผ่น|เส้น|ตลับ|พาเลท|ลัง)/gim;
    
    let match;
    while ((match = itemRegex.exec(itemsSection)) !== null) {
        items.push({
            rm_code: match[2],
            rm_name: match[3].replace(/(?:MMRM|WH01|WH02|คลัง)/g, '').replace(/[\n๓]/g, ' ').replace(/\s+/g, ' ').trim(),
            warehouse: (match[4] && match[4] !== 'คลัง') ? match[4] : 'MMRM',
            quantity: match[5],
            unit: match[6],
            bottom_remark: globalBottomRemark,
            jobNo: null
        });
    }

    if (items.length === 0) {
      // Legacy ERP format where table borders are extracted as Thai characters (e.g., ๓, ๔, ๕)
      const legacyTableRegex = /\s*๓\s*\d+\s*๓\s*([A-Z0-9-]+)\s+(.+?)\s*๓([A-Za-z0-9_-]+)๓\s*([\d,.]+)\s*(KG|kg|G|g|L|l|ML|ml|PCS|pcs|KGS|kgs|EA|ea|SET|set|BTL|btl|BOX|box|TUBE|tube|JAR|jar|CAP|cap|ROLL|roll|PACK|pack|BAG|bag|PUMP|pump|M|m|CM|cm|MM|mm|ชิ้น|ใบ|แผ่น|เส้น|ตลับ|พาเลท|ลัง)/gi;
      let legacyMatch;
      while ((legacyMatch = legacyTableRegex.exec(text)) !== null) {
        items.push({
          rm_code: legacyMatch[1],
          rm_name: legacyMatch[2].trim(),
          warehouse: legacyMatch[3] || 'MMRM',
          quantity: legacyMatch[4],
          unit: legacyMatch[5],
          bottom_remark: globalBottomRemark,
          jobNo: null
        });
      }
    }

    if (items.length === 0) {
      const altItemRegex = /([A-Z0-9-]+)\s+([A-Za-z0-9\s/.-]+?)\s+([\d,.]+)\s*(KG|G|L|ML|PCS|EA|SET|BTL|BOX|TUBE|JAR|CAP|ROLL|PACK|BAG|PUMP|M|CM|MM|ชิ้น|ใบ|แผ่น|เส้น|ตลับ|พาเลท|ลัง)/gi;
      let altMatch;
      while ((altMatch = altItemRegex.exec(text)) !== null) {
        if (altMatch[1].length > 2) {
          items.push({
            rm_code: altMatch[1],
            rm_name: altMatch[2].replace(/(?:MMRM|WH01|WH02|คลัง)/g, '').trim(),
            warehouse: 'MMRM', // Default if not found
            quantity: altMatch[3],
            unit: altMatch[4],
            bottom_remark: globalBottomRemark,
            jobNo: null
          });
        }
      }
    }

    // Extract JobNo globally from the entire text
    const globalJobMatch = text.match(/JHD-[^\s]+\s+L\.[A-Z0-9/]+/i) || text.match(/DHEKA-[^\s]+\s+L\.[A-Z0-9/]+/i) || text.match(/LOT\s*(\d{3}\/\d{2})/i);
    const globalJobNo = globalJobMatch ? globalJobMatch[0] : null;

    // Clean up unprintable box characters (from legacy PDF font extraction)
    const cleanText = (str: string | null) => {
        if (!str) return str;
        return str.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s.,()/:\-+=%&@]/g, '');
    };

    const cleanedItems = items.map(item => ({
        ...item,
        rm_name: cleanText(item.rm_name),
        bottom_remark: cleanText(item.bottom_remark)
    }));

    return NextResponse.json({
      success: true,
      data: { 
          prNo, 
          poNo, 
          poDate, 
          supplier: cleanText(supplier), 
          etaDate, 
          topRemark: cleanText(topRemark), 
          items: cleanedItems, 
          rawText: text, 
          jobNo: globalJobNo 
      }
    });

  } catch (error: any) {
    console.error('PDF Parse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
