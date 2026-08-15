const fs = require('fs');
const path = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/incoming-rm/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetHeader = QC Status (รายการรอตรวจ)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="text-sm table-fixed w-full">
                    <TableHeader className="bg-[#F8F6F0]">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="font-semibold text-slate-700 px-6 py-4">Receive Date</TableHead>
                        <TableHead className="font-semibold text-slate-700">PO No.</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-purple-700">Control No.</TableHead>
                        <TableHead className="font-semibold text-slate-700">SKU / LOT</TableHead>
                        <TableHead className="font-semibold text-slate-700">Code</TableHead>
                        <TableHead className="font-semibold text-slate-700">Name</TableHead>
                        <TableHead className="font-semibold text-slate-700 w-44">QC Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.filter(i => i.status !== 'PENDING_DELIVERY')
                        .sort((a, b) => new Date(b.receive_date || 0).getTime() - new Date(a.receive_date || 0).getTime())
                        .map((item, index) => (;

const replaceHeader = QC Status (รายการรอตรวจ)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="text-sm table-fixed w-full">
                    <TableHeader className="bg-[#F8F6F0]">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="font-semibold text-slate-700 px-6 py-4">
                          <div className="flex items-center space-x-1 cursor-pointer hover:text-purple-700" onClick={() => {
                            if (qcReceiveDateSort === 'asc') setQcReceiveDateSort('desc');
                            else if (qcReceiveDateSort === 'desc') setQcReceiveDateSort(null);
                            else { setQcReceiveDateSort('asc'); setQcControlNoSort(null); }
                          }}>
                            <span>Receive Date</span>
                            {qcReceiveDateSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : qcReceiveDateSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>PO No.</span>
                            <input type="text" placeholder="ค้นหา PO..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={qcPoSearch} onChange={(e) => setQcPoSearch(e.target.value)} />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-purple-700">
                          <div className="flex items-center space-x-1 cursor-pointer hover:text-purple-900" onClick={() => {
                            if (qcControlNoSort === 'asc') setQcControlNoSort('desc');
                            else if (qcControlNoSort === 'desc') setQcControlNoSort(null);
                            else { setQcControlNoSort('asc'); setQcReceiveDateSort(null); }
                          }}>
                            <span>Control No.</span>
                            {qcControlNoSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : qcControlNoSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700">SKU / LOT</TableHead>
                        <TableHead className="font-semibold text-slate-700">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>Code</span>
                            <input type="text" placeholder="ค้นหา Code..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={qcCodeSearch} onChange={(e) => setQcCodeSearch(e.target.value)} />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700">Name</TableHead>
                        <TableHead className="font-semibold text-slate-700 w-44">QC Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.filter(i => i.status !== 'PENDING_DELIVERY')
                        .filter(i => qcPoSearch ? (i.po_no || '').toLowerCase().includes(qcPoSearch.toLowerCase()) : true)
                        .filter(i => qcCodeSearch ? (i.rm_code || '').toLowerCase().includes(qcCodeSearch.toLowerCase()) : true)
                        .sort((a, b) => {
                          if (qcControlNoSort) {
                            const ca = a.control_no || '';
                            const cb = b.control_no || '';
                            return qcControlNoSort === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
                          }
                          if (qcReceiveDateSort) {
                            const ta = new Date(a.receive_date || 0).getTime();
                            const tb = new Date(b.receive_date || 0).getTime();
                            return qcReceiveDateSort === 'asc' ? ta - tb : tb - ta;
                          }
                          return new Date(b.receive_date || 0).getTime() - new Date(a.receive_date || 0).getTime();
                        })
                        .map((item, index) => (;

if (content.includes('QC Status (รายการรอตรวจ)</CardTitle></CardHeader>')) {
  content = content.replace(targetHeader, replaceHeader);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced QC headers successfully.');
} else {
  console.log('Target string not found.');
}
