const fs = require('fs');

function replaceFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<Table className="text-sm">/g, '<Table className="text-sm table-fixed w-full">');
  content = content.replace(/<Table className="text-sm w-full">/g, '<Table className="text-sm table-fixed w-full">');
  content = content.replace(/<table className="w-full text-sm text-left">/g, '<table className="w-full text-sm text-left table-fixed">');
  
  if (file.includes('incoming-rm')) {
    content = content.replace(/<TableHead>ETA<\/TableHead>/g, '<TableHead className="w-[8%]">ETA</TableHead>');
    content = content.replace(/<TableHead>PO No\.<\/TableHead>/g, '<TableHead className="w-[10%]">PO No.</TableHead>');
    content = content.replace(/<TableHead>Supplier<\/TableHead>/g, '<TableHead className="w-[12%]">Supplier</TableHead>');
    content = content.replace(/<TableHead>SKU \/ LOT<\/TableHead>/g, '<TableHead className="w-[10%]">SKU / LOT</TableHead>');
    content = content.replace(/<TableHead>Code<\/TableHead>/g, '<TableHead className="w-[10%]">Code</TableHead>');
    content = content.replace(/<TableHead>Name<\/TableHead>/g, '<TableHead className="w-[15%]">Name</TableHead>');
    content = content.replace(/<TableHead>Qty<\/TableHead>/g, '<TableHead className="w-[8%]">Qty</TableHead>');
    content = content.replace(/<TableHead>Warehouse<\/TableHead>/g, '<TableHead className="w-[8%]">Warehouse</TableHead>');
    content = content.replace(/<TableHead>Receive Date \(Actual\)<\/TableHead>/g, '<TableHead className="w-[9%]">Receive Date</TableHead>');
    content = content.replace(/<TableHead>Status<\/TableHead>/g, '<TableHead className="w-[10%]">Status</TableHead>');
  }

  fs.writeFileSync(file, content);
}

replaceFile('src/app/(dashboard)/incoming-rm/page.tsx');
replaceFile('src/app/(dashboard)/qc-queue/page.tsx');
console.log('Fixed tables');
