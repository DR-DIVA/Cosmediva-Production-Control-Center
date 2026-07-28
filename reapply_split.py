import os
import glob
import re

base_path = r"c:\Users\hp\Dropbox\AI AGENT\Antigravity\Update PD Daily Status\cosmediva-os\src\app\(dashboard)\my-tasks"
files = glob.glob(os.path.join(base_path, '**', '*.tsx'), recursive=True)

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The goal of 1d3b919 was to split email to remove @cosmediva.local
    # Usually it was something like setCurrentUser(user.email) -> setCurrentUser(user.email.split('@')[0])
    # Or in display: user.email -> user.email.split('@')[0]
    
    modified = False
    
    # Target 1: setCurrentUser(user.email)
    if "setCurrentUser(user.email)" in content:
        content = content.replace("setCurrentUser(user.email)", "setCurrentUser(user.email.split('@')[0])")
        modified = True
        
    # Target 2: setCurrentUser(user.user_metadata?.email || user.email)
    if "setCurrentUser(user.user_metadata?.email || user.email)" in content:
        content = content.replace("setCurrentUser(user.user_metadata?.email || user.email)", "setCurrentUser((user.user_metadata?.email || user.email)?.split('@')[0])")
        modified = True
        
    # Target 3: h.user display
    # like {h.user} to {h.user?.split('@')[0]}
    content, count = re.subn(r'\{h\.user\}', "{h.user?.split('@')[0]}", content)
    if count > 0: modified = True
    
    # Target 4: item.user
    content, count = re.subn(r'\{item\.user\}', "{item.user?.split('@')[0]}", content)
    if count > 0: modified = True
    
    # Target 5: delivery_info?.sender
    content, count = re.subn(r'\{delivery_info\?\.sender\}', "{delivery_info?.sender?.split('@')[0]}", content)
    if count > 0: modified = True
    
    # Target 6: receive_info?.receiver
    content, count = re.subn(r'\{receive_info\?\.receiver\}', "{receive_info?.receiver?.split('@')[0]}", content)
    if count > 0: modified = True
    
    if modified:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Re-applied fix to {path}")
