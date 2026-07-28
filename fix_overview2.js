const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/overview/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const replacement = `  const renderBatteryBar = (subStep: string | null) => {
    const steps = [
      { id: 'SOAK', label: 'แช่', icon: <Droplet className="w-3 h-3"/> },
      { id: 'MIX', label: 'ผสม', icon: <Beaker className="w-3 h-3"/> },
      { id: 'STORE', label: 'เก็บงาน', icon: <Archive className="w-3 h-3"/> }
    ]
    
    let activeIndex = -1
    if (subStep === 'SOAK') activeIndex = 0
    if (subStep === 'MIX') activeIndex = 1
    if (subStep === 'STORE') activeIndex = 2

    return (
      <div className="mt-4 mb-2">
        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1 px-1">
          {steps.map((s, i) => (
            <span key={s.id} className={i <= activeIndex ? 'text-[#D4AF37] font-bold flex items-center gap-1' : 'flex items-center gap-1'}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
          <div className={\`h-2.5 \${activeIndex >= 0 ? 'bg-[#D4AF37]' : 'bg-transparent'} border-r border-white/20\`} style={{ width: '33.33%' }}></div>
          <div className={\`h-2.5 \${activeIndex >= 1 ? 'bg-[#D4AF37]' : 'bg-transparent'} border-r border-white/20\`} style={{ width: '33.33%' }}></div>
          <div className={\`h-2.5 \${activeIndex >= 2 ? 'bg-[#D4AF37]' : 'bg-transparent'}\`} style={{ width: '33.33%' }}></div>
        </div>
      </div>
    )
  }

  const renderMixingButtons = (task: any) => {
    const subStep = task.sub_step

    if (!subStep) {
      return (
        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: แช่
        </Button>
      )
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

  const { targetCartons, maxAllowedPieces, targetPieces } = calculatePofTargetCartons(activeStartTask)
  // Determine over limit by pieces instead of cartons to be safe, but input is cartons
  const currentTaskPieces = activeStartTask?.piece_quantity || 0
  const inputPieces = manualPieces ? parseFloat(manualPieces) : 0
  const isOverLimit = activeStartTask && getTaskColumn(activeStartTask) === 'POF' && (currentTaskPieces + inputPieces) > maxAllowedPieces

  return (
    <div className="p-4 md:p-8 h-screen flex flex-col space-y-6 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
            <Factory className="w-8 h-8 text-yellow-400" />
            CosmeFlow Production
          </h2>
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
             <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
             Track Every Step. Improve Every Batch.
          </div>
        </div>
      </div>`.split('\n');

// Splice lines 658 to 693 (inclusive) out, and put the new lines in
lines.splice(658, 693 - 658 + 1, ...replacement);

fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed completely!');
