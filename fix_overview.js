const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/overview/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Restore the missing lines
const missingLines = `      )
    }
    
    if (subStep === 'SOAK') {
      return (
        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: ผสม
        </Button>
      )
    }

    if (subStep === 'MIX') {
      return (
        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: เก็บงาน
        </Button>
      )
    }

    if (subStep === 'STORE') {
      return (
        <Button onClick={() => handleFinishClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Square className="w-4 h-4 mr-1" /> จบงาน (จบการผสม)
        </Button>
      )
    }
  }
`;

content = content.replace(
`        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: แช่
        </Button>
  const { targetCartons, maxAllowedPieces, targetPieces } = calculatePofTargetCartons(activeStartTask)`,
`        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: แช่
        </Button>
${missingLines}
  const { targetCartons, maxAllowedPieces, targetPieces } = calculatePofTargetCartons(activeStartTask)`
);

// Fix the header wrapper
// It currently looks like:
/*
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
            <Factory className="w-8 h-8 text-yellow-400" />
            CosmeFlow Production
          </h2>
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
             <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
             Track Every Step. Improve Every Batch.
          </div>
*/

content = content.replace(
`      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
            <Factory className="w-8 h-8 text-yellow-400" />
            CosmeFlow Production
          </h2>
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
             <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
             Track Every Step. Improve Every Batch.
          </div>`,
`      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
              <Factory className="w-8 h-8 text-yellow-400" />
              CosmeFlow Production
            </h2>
            <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
               <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
               Track Every Step. Improve Every Batch.
            </div>
        </div>`
);

fs.writeFileSync(file, content);
console.log('Fixed overview page!');
