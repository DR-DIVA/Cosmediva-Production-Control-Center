const fs = require('fs');
let file = 'src/app/(dashboard)/incoming-rm/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Edit to lucide-react imports
if (!content.includes('Edit,')) {
  content = content.replace(/Trash2,/, 'Trash2, Edit,');
}

// 2. Add state variables for edit mode
const stateInsert = 
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RMItem | null>(null);
  const [editForm, setEditForm] = useState({ po_no: '', supplier: '', rm_code: '', rm_name: '', quantity: 0, unit: '', eta_date: '' });
;
if (!content.includes('isEditModalOpen')) {
  content = content.replace('// Receive Modal State', stateInsert + '\n  // Receive Modal State');
}

// 3. Add openEditModal and handleEditSubmit functions
const functionInsert = 
  const openEditModal = (item: RMItem) => {
    setEditingItem(item);
    setEditForm({
      po_no: item.po_no || '',
      supplier: item.supplier || '',
      rm_code: item.rm_code || '',
      rm_name: item.rm_name || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      eta_date: item.eta_date ? new Date(item.eta_date).toISOString().split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('production_lot_rms').update({
      po_no: editForm.po_no,
      supplier: editForm.supplier,
      rm_code: editForm.rm_code,
      rm_name: editForm.rm_name,
      quantity: editForm.quantity,
      unit: editForm.unit,
      eta_date: editForm.eta_date || null
    }).eq('id', editingItem.id);

    if (error) {
      toast.error('แก้ไขข้อมูลไม่สำเร็จ');
    } else {
      toast.success('แก้ไขข้อมูลสำเร็จ');
      setIsEditModalOpen(false);
      fetchItems();
    }
  };
;
if (!content.includes('openEditModal')) {
  content = content.replace('const handleDelete = async (id: string) => {', functionInsert + '\n  const handleDelete = async (id: string) => {');
}

// 4. Add Edit button to Purchasing View table cells
const buttonsHTML =                               <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => openEditModal(item)} 
                                  disabled={item.status !== 'PENDING_DELIVERY'}
                                  className={\h-8 w-8 \\}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDelete(item.id)} 
                                  disabled={item.status !== 'PENDING_DELIVERY'}
                                  className={\h-8 w-8 \\}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>;

// We will use regex to find the TableCell with Trash2 and replace its content
const trashRegex = /<TableCell>\s*<Button[^>]+onClick={\(\) => handleDelete[^>]+>\s*<Trash2[^>]+>\s*<\/Button>\s*<\/TableCell>/g;
content = content.replace(trashRegex, <TableCell>\n\n                            </TableCell>);

// 5. Add Dialog for editing at the end of the file
const dialogHTML = 
        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>แก้ไขข้อมูลนำเข้า (Purchasing Edit)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">PO No.</Label>
                <Input value={editForm.po_no} onChange={e => setEditForm({...editForm, po_no: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Supplier</Label>
                <Input value={editForm.supplier} onChange={e => setEditForm({...editForm, supplier: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Code</Label>
                <Input value={editForm.rm_code} onChange={e => setEditForm({...editForm, rm_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name</Label>
                <Input value={editForm.rm_name} onChange={e => setEditForm({...editForm, rm_name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Quantity</Label>
                <div className="col-span-3 flex gap-2">
                  <Input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} className="w-full" />
                  <Input value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} className="w-24 placeholder:text-slate-400" placeholder="Unit" />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">ETA Date</Label>
                <Input type="date" value={editForm.eta_date} onChange={e => setEditForm({...editForm, eta_date: e.target.value})} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleEditSubmit} className="bg-[#D4AF37] hover:bg-[#B3932F] text-white">บันทึกการแก้ไข</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
;
if (!content.includes('แก้ไขข้อมูลนำเข้า')) {
  // Let's replace the final </div>
  let lastIndex = content.lastIndexOf('</div>');
  if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + dialogHTML + '\n</div>' + content.substring(lastIndex + 6);
  }
}

fs.writeFileSync(file, content);
console.log('Edit feature added');
