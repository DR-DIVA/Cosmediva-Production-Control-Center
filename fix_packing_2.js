const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(dashboard)/my-tasks/packing/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename fetchTodayHistory -> fetchHistory
content = content.replace(/fetchTodayHistory/g, 'fetchHistory');
// 2. Rename todayHistory -> historyList
content = content.replace(/todayHistory/g, 'historyList');
// 3. Rename setTodayHistory -> setHistoryList
content = content.replace(/setTodayHistory/g, 'setHistoryList');

// 4. Also replace the function body of fetchHistory to not restrict to today
const targetRegex = /const fetchHistory = async \(\) => \{[\s\S]*?setHistoryList\(historyItems\)\r?\n\s*\}/;
const replacement = `const fetchHistory = async () => {
    const { data } = await supabase.from('production_logs')
      .select(\`
        id, tank_details, updated_at,
        production_lots ( id, lot_no, products:sku_id (sku, product_name) ),
        processes ( id, process_name )
      \`)
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (data) {
      const historyItems: any[] = []
      data.forEach(task => {
        const pName = Array.isArray(task.processes) ? task.processes[0]?.process_name : (task.processes as any)?.process_name
        if (!pName || (!pName.toLowerCase().includes('บรรจุ') && !pName.toLowerCase().includes('packing'))) return
        
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
                  user: h.user,
                  timestamp: h.timestamp,
                  qty: h.qty
                })
              })
            }
          }
        })
      })
      
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryList(historyItems)
    }`;

content = content.replace(targetRegex, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed packing/page.tsx fully');
