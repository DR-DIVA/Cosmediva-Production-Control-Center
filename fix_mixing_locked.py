import os

base_dir = r"c:\Users\hp\Dropbox\AI AGENT\Antigravity\Update PD Daily Status\cosmediva-os\src\app\(dashboard)\my-tasks"
mixing_path = os.path.join(base_dir, 'mixing', 'page.tsx')
with open(mixing_path, 'r', encoding='utf-8') as f:
    m_content = f.read()

m_target = "const tankStatus = details[t]?.status || details[t] || (task.status === 'DONE' ? 'DONE' : 'WAITING')"
m_replacement = "const tankStatus = details[t]?.status || details[t] || (task.status === 'DONE' ? 'DONE' : 'LOCKED')"

m_content = m_content.replace(m_target, m_replacement)

with open(mixing_path, 'w', encoding='utf-8') as f:
    f.write(m_content)
print("Done")
