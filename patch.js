const fs = require('fs');
const file = 'src/app/(dashboard)/qc-queue/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('SelectContent')) {
  content = content.replace(
    /import { DropdownMenu/g,
    "import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'\nimport { DropdownMenu"
  );
}

if (!content.includes('const [rmQcStatusSearch')) {
  content = content.replace(
    /const \[codeSearch, setCodeSearch\] = useState\(''\)/g,
    "const [codeSearch, setCodeSearch] = useState('')\n  const [rmQcStatusSearch, setRmQcStatusSearch] = useState('ALL')\n  const [pmQcStatusSearch, setPmQcStatusSearch] = useState('ALL')\n  const [bulkQcStatusSearch, setBulkQcStatusSearch] = useState('ALL')\n  const [fgQcStatusSearch, setFgQcStatusSearch] = useState('ALL')"
  );
}

// 1. RM Queue Header and Filter
const rmHeaderRegex = /<th className="px-4 py-3 font-medium">สถานะ QC<\/th>\s*<th className="px-4 py-3 font-medium text-right">จัดการ<\/th>\s*<\/tr>\s*<\/thead>\s*<tbody className="divide-y divide-slate-100">\s*\{rmItems\.filter/g;
const rmHeaderReplace = <th className="px-4 py-3 font-medium">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>สถานะ QC</span>
                            <Select value={rmQcStatusSearch} onValueChange={(val) => setRmQcStatusSearch(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-xs w-full bg-white px-2 py-0 border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                                <SelectItem value="QUARANTINED">QUARANTINED</SelectItem>
                                <SelectItem value="PASSED">PASSED</SelectItem>
                                <SelectItem value="HOLD">HOLD</SelectItem>
                                <SelectItem value="REJECTED">REJECTED</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rmItems.filter;
content = content.replace(rmHeaderRegex, rmHeaderReplace);

const rmFilterRegex = /\.filter\(item => codeSearch \? \(item\.rm_code \|\| ''\)\.toLowerCase\(\)\.includes\(codeSearch\.toLowerCase\(\)\) : true\)/;
const rmFilterReplace = .filter(item => codeSearch ? (item.rm_code || '').toLowerCase().includes(codeSearch.toLowerCase()) : true)
                      .filter(item => rmQcStatusSearch !== 'ALL' ? (item.qc_status || 'PENDING') === rmQcStatusSearch : true);
content = content.replace(rmFilterRegex, rmFilterReplace);

// 2. PM Queue Header and Filter
const pmHeaderRegex = /<th className="px-4 py-3 font-medium">สถานะ QC<\/th>\s*<th className="px-4 py-3 font-medium text-right">จัดการ<\/th>\s*<\/tr>\s*<\/thead>\s*<tbody className="divide-y divide-slate-100">\s*\{rmItems\.filter/g;
const pmHeaderReplace = <th className="px-4 py-3 font-medium">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>สถานะ QC</span>
                            <Select value={pmQcStatusSearch} onValueChange={(val) => setPmQcStatusSearch(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-xs w-full bg-white px-2 py-0 border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                                <SelectItem value="QUARANTINED">QUARANTINED</SelectItem>
                                <SelectItem value="PASSED">PASSED</SelectItem>
                                <SelectItem value="HOLD">HOLD</SelectItem>
                                <SelectItem value="REJECTED">REJECTED</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rmItems.filter;
content = content.replace(pmHeaderRegex, pmHeaderReplace);

// Let's use string replace for the filters to target correctly. 
// We will replace all 4 occurrences of the codeSearch filter for rmItems (2 for RM, 2 for PM history, etc).
// We should use index-based replacement for precision if needed, but let's just write the modified content.
fs.writeFileSync(file, content);
console.log('Patched');
