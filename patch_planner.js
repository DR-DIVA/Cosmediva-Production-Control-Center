const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(dashboard)/planner/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add History to imports
content = content.replace(
  'import { Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle, Activity } from "lucide-react"',
  'import { Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle, Activity, History } from "lucide-react"'
);

// 2. Add XLSX import
if (!content.includes('import * as XLSX')) {
  content = content.replace(
    'import { toast } from "sonner"',
    'import { toast } from "sonner"\nimport * as XLSX from "xlsx"'
  );
}

// 3. Add historySearchQuery state
content = content.replace(
  'const [activeTab, setActiveTab] = useState("table")',
  'const [activeTab, setActiveTab] = useState("table")\n  const [historySearchQuery, setHistorySearchQuery] = useState("")'
);

// 4. Add TabsTrigger for History
content = content.replace(
  '<TabsTrigger value="timeline">Timeline</TabsTrigger>',
  '<TabsTrigger value="timeline">Timeline</TabsTrigger>\n                <TabsTrigger value="history" className="flex items-center gap-2">\n                  <History className="w-4 h-4" />\n                  ประวัติการทำงานแบบต่อเนื่อง\n                </TabsTrigger>'
);

// 5. Add Export Function & getHistoryData Function
const exportFunction = `
  const getHistoryData = () => {
    const orderHistory = lots.map(lot => ({
      id: \`lot-\${lot.id}\`,
      type: 'เพิ่มออเดอร์',
      project: \`\${lot.po_no || '-'} / \${lot.products?.sku || 'Unknown SKU'}\`,
      timestamp: lot.created_at,
      user: 'Planner',
      details: \`เพิ่มออเดอร์ยอด \${(lot.order_quantity || 0).toLocaleString()} pc (\${lot.total_tanks || 0} ถัง)\`
    }));

    const taskHistory = logs.map(log => {
      const lot = lots.find(l => l.id === log.production_lot_id);
      const process = processes.find(p => p.id === log.process_id);
      return {
        id: \`log-\${log.id}\`,
        type: 'ลงคิวงาน',
        project: \`\${lot?.po_no || '-'} / \${lot?.products?.sku || 'Unknown SKU'}\`,
        timestamp: log.updated_at || log.created_at,
        user: 'Planner',
        details: \`\${process?.process_name || 'งานผลิต'} (\${log.tank_start ? \`ถัง \${log.tank_start}-\${log.tank_end}\` : \`\${log.total_tanks} ถัง\`}) - วันที่ \${log.activity_date ? format(new Date(log.activity_date), 'dd/MM/yyyy') : '-'}\`
      }
    });

    const combined = [...orderHistory, ...taskHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return combined.filter(item => 
      item.project.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      item.details.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(historySearchQuery.toLowerCase())
    );
  };

  const handleExportHistory = () => {
    const data = getHistoryData();
    if (data.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับ Export');
      return;
    }
    const exportData = data.map(item => ({
      'วันเวลา': format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm'),
      'ผู้ดำเนินการ': item.user,
      'ประเภท': item.type,
      'Project (PO/SKU)': item.project,
      'รายละเอียด': item.details
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, \`PD_Master_Plan_History_\${format(new Date(), 'yyyy-MM-dd')}.xlsx\`);
  };
`;

content = content.replace(
  'const filteredLots = lots.filter(lot =>',
  exportFunction + '\n  const filteredLots = lots.filter(lot =>'
);

// 6. Add History Content rendering
const historyContent = `
        {activeTab === "history" && (
          <div className="p-4 bg-white min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
               <div className="relative">
                  <Input 
                    placeholder="ค้นหา Project, ประเภท, รายละเอียด..." 
                    value={historySearchQuery} 
                    onChange={e => setHistorySearchQuery(e.target.value)} 
                    className="w-full md:w-80"
                  />
               </div>
               <Button variant="outline" onClick={handleExportHistory} className="text-[#0f766e] border-[#0f766e] hover:bg-[#0f766e] hover:text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel (ประวัติ)
               </Button>
            </div>
            
            <div className="rounded-lg border border-slate-200 overflow-hidden">
               <Table>
                 <TableHeader className="bg-[#F8F6F0]">
                   <TableRow>
                     <TableHead className="w-[180px]">วันเวลา</TableHead>
                     <TableHead className="w-[150px]">ผู้ดำเนินการ</TableHead>
                     <TableHead className="w-[150px]">ประเภท</TableHead>
                     <TableHead className="w-[250px]">Project (PO/SKU)</TableHead>
                     <TableHead>รายละเอียด</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {getHistoryData().length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                             ไม่พบประวัติการทำงาน
                          </TableCell>
                       </TableRow>
                    ) : (
                       getHistoryData().map((item) => (
                         <TableRow key={item.id} className="hover:bg-slate-50">
                           <TableCell className="text-slate-600">
                             {format(new Date(item.timestamp), 'dd MMM yyyy')}
                             <span className="text-xs text-slate-400 block">{format(new Date(item.timestamp), 'HH:mm:ss')}</span>
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                                 {item.user.charAt(0)}
                               </div>
                               <span className="text-sm font-medium">{item.user}</span>
                             </div>
                           </TableCell>
                           <TableCell>
                             <span className={\`px-2 py-1 rounded-full text-xs font-medium \${item.type === 'เพิ่มออเดอร์' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}\`}>
                               {item.type}
                             </span>
                           </TableCell>
                           <TableCell className="font-medium text-[#4A4238]">{item.project}</TableCell>
                           <TableCell className="text-slate-600">{item.details}</TableCell>
                         </TableRow>
                       ))
                    )}
                 </TableBody>
               </Table>
            </div>
          </div>
        )}
`;

content = content.replace(
  '      </Card>\n\n      <Dialog open={isDialogOpen}',
  '      ' + historyContent + '\n      </Card>\n\n      <Dialog open={isDialogOpen}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch complete.');
