const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(dashboard)/qc-queue/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename "ประวัติการทำงานวันนี้" -> "ประวัติการทำงานแบบต่อเนื่อง"
content = content.replace(/ประวัติการทำงานวันนี้/g, 'ประวัติการทำงานแบบต่อเนื่อง');
content = content.replace(/ประวัติการตรวจสอบวันนี้/g, 'ประวัติการตรวจสอบแบบต่อเนื่อง');
content = content.replace(/ไม่มีประวัติการตรวจสอบของวันนี้/g, 'ไม่มีประวัติการตรวจสอบ');

// 2. Fix fetchRmTodayHistory
const rmRegex = /const fetchRmTodayHistory = async \(\) => \{[\s\S]*?setRmTodayHistory\(data\)\r?\n\s*\}/;
content = content.replace(rmRegex, `const fetchRmTodayHistory = async () => {
    const { data } = await supabase.from('production_lot_rms')
      .select('*, production_lots(lot_no, sku_id)')
      .not('qc_status', 'is', null)
      .order('id', { ascending: false })
      .limit(1000)
      
    if (data) {
      setRmTodayHistory(data)
    }`); 

// 3. Fix fetchTodayHistory (Bulk)
const bulkRegex = /const fetchTodayHistory = async \(\) => \{[\s\S]*?setTodayHistory\(historyItems\)\r?\n\s*\}/;
content = content.replace(bulkRegex, `const fetchTodayHistory = async () => {
    const { data } = await supabase.from('production_logs')
      .select(\`
        id, status, tank_start, tank_end, total_tanks, tank_details, updated_at,
        production_lot_id,
        production_lots ( id, lot_no, products:sku_id (sku, product_name) ),
        processes ( id, process_name )
      \`)
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (data) {
      const historyItems: any[] = []
      data.forEach(task => {
        const pName = Array.isArray(task.processes) ? task.processes[0]?.process_name : (task.processes as any)?.process_name
        if (pName !== 'รอ QC') return
        
        const details = task.tank_details || {}
        Object.keys(details).forEach(key => {
          if (key.endsWith('_history')) {
            const tankNum = key.replace('_history', '')
            const histories = details[key] as any[]
            if (Array.isArray(histories)) {
              histories.forEach(h => {
                historyItems.push({
                  taskId: task.id,
                  lotNo: (task.production_lots as any)?.lot_no,
                  sku: (task.production_lots as any)?.products?.sku,
                  tankNum,
                  action: h.status,
                  note: h.note,
                  user: h.user,
                  timestamp: h.timestamp
                })
              })
            }
          }
        })
      })
      
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setTodayHistory(historyItems)
    }`);

// 4. Fix fetchFgTodayHistory
const fgRegex = /const fetchFgTodayHistory = async \(\) => \{[\s\S]*?setFgTodayHistory\(data\)\r?\n\s*\}/;
content = content.replace(fgRegex, `const fetchFgTodayHistory = async () => {
    const { data } = await supabase.from('fg_inventory')
      .select(\`
        id, 
        sku_id, 
        lot_no, 
        box_lot_no, 
        available_qty_pcs, 
        exp_date, 
        qc_status, 
        updated_at,
        products:sku_id(sku, product_name)
      \`)
      .neq('qc_status', 'QUARANTINE')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (data) {
      setFgTodayHistory(data)
    }`);

if (!content.includes("import * as XLSX from 'xlsx'")) {
  content = content.replace("import { createClient }", "import * as XLSX from 'xlsx'\nimport { createClient }");
}

content = content.replace(
  /const csvData = \[\s*\["LOT No\.", "รหัส"[\s\S]*?downloadCSV\(csvData,.*?\.csv`\)/m,
  `const worksheet = XLSX.utils.json_to_sheet(todayHistory.map((item: any) => {
                          let statusText = item.action
                          if (item.action === 'QC_PASS') statusText = 'QC Pass'
                          if (item.action === 'REPROCESS') statusText = 'QC Reprocess'
                          if (item.action === 'FAILED') statusText = 'QC Reject'
                          if (item.action === 'PAUSED') statusText = 'QC Hold'
                          return {
                            'เวลาอัปเดต': new Date(item.timestamp).toLocaleString('th-TH'),
                            'ผู้ดำเนินการ': item.user?.split('@')[0] || '-',
                            'LOT No.': item.lotNo || '-',
                            'รหัสสินค้า': item.sku || '-',
                            'ถังที่': item.tankNum,
                            'สถานะ': statusText
                          }
                        }))
                        const workbook = XLSX.utils.book_new()
                        XLSX.utils.book_append_sheet(workbook, worksheet, "QC Bulk History")
                        XLSX.writeFile(workbook, "QC_Bulk_History.xlsx")`
);

content = content.replace(
  /const csvData = \[\s*\["LOT No\.", "วันที่รับเข้า"[\s\S]*?downloadCSV\(csvData,.*?\.csv`\)/m,
  `const worksheet = XLSX.utils.json_to_sheet(rmTodayHistory.map((h: any) => {
                          return {
                            'อัปเดตล่าสุด': h.updated_at ? new Date(h.updated_at).toLocaleString('th-TH') : '-',
                            'LOT No.': h.production_lots?.lot_no || '-',
                            'วันที่รับเข้า': h.receive_date ? new Date(h.receive_date).toLocaleDateString('th-TH') : '-',
                            'รหัส': h.rm_code,
                            'ชื่อวัตถุดิบ': h.rm_name,
                            'จำนวน': h.quantity,
                            'หน่วย': h.unit,
                            'PO No.': h.po_no,
                            'สถานะ QC': h.qc_status
                          }
                        }))
                        const workbook = XLSX.utils.book_new()
                        XLSX.utils.book_append_sheet(workbook, worksheet, "QC RM History")
                        XLSX.writeFile(workbook, "QC_RM_History.xlsx")`
);

content = content.replace(
  /const csvData = \[\s*\["รหัส", "ชื่อสินค้า"[\s\S]*?downloadCSV\(csvData,.*?\.csv`\)/m,
  `const worksheet = XLSX.utils.json_to_sheet(fgTodayHistory.map((h: any) => {
                          return {
                            'เวลาอัปเดต': h.updated_at ? new Date(h.updated_at).toLocaleString('th-TH') : '-',
                            'รหัส': h.products?.sku || '-',
                            'ชื่อสินค้า': h.products?.product_name || '-',
                            'LOT No.': h.lot_no,
                            'กล่องที่': h.box_lot_no || '-',
                            'จำนวน (ชิ้น)': h.available_qty_pcs,
                            'สถานะ QC': h.qc_status
                          }
                        }))
                        const workbook = XLSX.utils.book_new()
                        XLSX.utils.book_append_sheet(workbook, worksheet, "QC FG History")
                        XLSX.writeFile(workbook, "QC_FG_History.xlsx")`
);

content = content.replace(
  /downloadCSV\(\[\s*\["ไม่มีข้อมูลในขณะนี้"\]\s*\],.*?\.csv`\)/m,
  `toast.error('ไม่มีข้อมูลให้ Export')`
);

content = content.replace(/ดาวน์โหลดประวัติ \(CSV\)/g, 'Export Excel');

content = content.replace(/\{rmTodayHistory\.map\(/g, '{rmTodayHistory.filter(item => { const term = searchQuery.toLowerCase(); return (item.rm_code || "").toLowerCase().includes(term) || (item.production_lots?.lot_no || "").toLowerCase().includes(term); }).map(');
content = content.replace(/\{todayHistory\.map\(/g, '{todayHistory.filter(item => { const term = searchQuery.toLowerCase(); return (item.sku || "").toLowerCase().includes(term) || (item.lotNo || "").toLowerCase().includes(term); }).map(');
content = content.replace(/\{fgTodayHistory\.map\(/g, '{fgTodayHistory.filter(item => { const term = searchQuery.toLowerCase(); return (item.products?.sku || "").toLowerCase().includes(term) || (item.lot_no || "").toLowerCase().includes(term); }).map(');

content = content.replace(/new Date\(item\.timestamp\)\.toLocaleTimeString\('th-TH'\)/g, "new Date(item.timestamp).toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed qc-queue/page.tsx');
