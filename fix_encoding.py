import os
import glob

# Paths to fix
base_path = r"c:\Users\hp\Dropbox\AI AGENT\Antigravity\Update PD Daily Status\cosmediva-os\src\app\(dashboard)\my-tasks"
files_to_fix = glob.glob(os.path.join(base_path, '**', '*.tsx'), recursive=True)

for path in files_to_fix:
    try:
        # Read with utf-8-sig to automatically handle and remove BOM if present,
        # or fallback to cp1252 if it was mangled by PowerShell
        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(path, 'r', encoding='cp1252') as f:
                content = f.read()
        
        # Write back as standard utf-8 without BOM
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print(f"Fixed {path}")
    except Exception as e:
        print(f"Error on {path}: {e}")
