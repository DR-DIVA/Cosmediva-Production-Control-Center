import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    if "import { DefectPopup }" not in content:
        content = content.replace(
            "import { differenceInDays, startOfDay } from 'date-fns'",
            "import { differenceInDays, startOfDay } from 'date-fns'\nimport { DefectPopup } from '@/components/production/DefectPopup'"
        )

    # Add DefectPopup in renderBaskets
    # We look for:
    # <div className="space-x-2">
    #   {(task.status === 'WAITING' || task.status === 'PLANNED' || !task.status) && (
    
    pattern = r'(<div className="space-x-2[^>]*>)([\s\S]*?)({\(task\.status === \'WAITING\')'
    replacement = r'\1\n            <DefectPopup \n              lotId={task.production_lot_id}\n              processId={Array.isArray(task.processes) ? task.processes[0]?.id : task.processes?.id}\n              processName={Array.isArray(task.processes) ? task.processes[0]?.process_name : task.processes?.process_name || \'แผนก\'}\n            />\n\2\3'
    
    # We need to only replace the FIRST occurrence in renderBaskets, or all of them if there's only one.
    if "<DefectPopup" not in content:
        content = re.sub(pattern, replacement, content)
        
        # also replace className="space-x-2" with className="space-x-2 flex items-center" for alignment
        content = content.replace(
            '<div className="space-x-2">\n            <DefectPopup',
            '<div className="space-x-2 flex items-center">\n            <DefectPopup'
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    r'src\app\(dashboard)\my-tasks\mixing\page.tsx',
    r'src\app\(dashboard)\my-tasks\packing\page.tsx',
    r'src\app\(dashboard)\my-tasks\pof\page.tsx'
]

for file in files:
    process_file(file)

print("Done")
