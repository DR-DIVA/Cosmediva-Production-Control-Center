import sys
with open('src/app/(dashboard)/costing/bom/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add selling_price to states
content = content.replace(
    "const [formulaCostPerKg, setFormulaCostPerKg] = useState<string>('')",
    "const [formulaCostPerKg, setFormulaCostPerKg] = useState<string>('')\n  const [sellingPrice, setSellingPrice] = useState<string>('')"
)

# Update reset logic
content = content.replace(
    "setPackagingCostPerPiece('')",
    "setPackagingCostPerPiece('')\n    setSellingPrice('')"
)

# Update when bom found
content = content.replace(
    "setPackagingCostPerPiece(String(bom.packaging_cost_per_piece))",
    "setPackagingCostPerPiece(String(bom.packaging_cost_per_piece))\n          setSellingPrice(String(bom.selling_price || ''))"
)

# Update handleSave
content = content.replace(
    "packaging_cost_per_piece: parseFloat(packagingCostPerPiece) || 0",
    "packaging_cost_per_piece: parseFloat(packagingCostPerPiece) || 0,\n      selling_price: parseFloat(sellingPrice) || 0"
)

# Add Input UI
ui_insertion = """
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="font-semibold text-green-700">ราคาขาย / ชิ้น (บาท)</Label>
              <Input 
                id="sellingPrice"
                type="number" 
                min="0" step="0.01"
                placeholder="ระบุราคาขายมาตรฐานต่อชิ้น" 
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="bg-green-50 border-green-200 focus-visible:ring-green-500"
              />
              <p className="text-xs text-slate-500">สำหรับนำไปคำนวณรายรับรวม และกำไร-ขาดทุนสุทธิต่อ Lot</p>
            </div>
"""
content = content.replace(
    '<div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">',
    ui_insertion + '\n            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">'
)

with open('src/app/(dashboard)/costing/bom/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated BOM UI')
