import os

base_dir = r"c:\Users\hp\Dropbox\AI AGENT\Antigravity\Update PD Daily Status\cosmediva-os\src\app\(dashboard)\my-tasks"

# 1. Weighing
weighing_path = os.path.join(base_dir, 'weighing', 'page.tsx')
with open(weighing_path, 'r', encoding='utf-8') as f:
    w_content = f.read()

w_target = """      let nextStatus = 'IN_PROGRESS'
      if (currentStatus === 'IN_PROGRESS') nextStatus = 'DONE'
      else if (currentStatus === 'DONE') nextStatus = 'MOVED'
      else if (currentStatus === 'MOVED') {
        toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
        return
      }

      if (nextStatus === 'WAITING') {"""

w_replacement = """      let nextStatus = 'IN_PROGRESS'
      let actionText = 'เริ่มชั่งสาร'
      if (currentStatus === 'IN_PROGRESS') { nextStatus = 'DONE'; actionText = 'ชั่งเสร็จแล้ว'; }
      else if (currentStatus === 'DONE') { nextStatus = 'MOVED'; actionText = 'ส่งมอบไปห้องผสม'; }
      else if (currentStatus === 'MOVED') {
        toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
        return
      }

      if (!window.confirm(`ยืนยันการเปลี่ยนสถานะชุดที่ ${currentBasket} เป็น "${actionText}" ใช่หรือไม่?`)) return;

      if (nextStatus === 'WAITING') {"""

w_content = w_content.replace(w_target, w_replacement)
with open(weighing_path, 'w', encoding='utf-8') as f:
    f.write(w_content)


# 4. POF
pof_path = os.path.join(base_dir, 'pof', 'page.tsx')
with open(pof_path, 'r', encoding='utf-8') as f:
    pof_content = f.read()

pof_target = """      let nextStatus = 'IN_PROGRESS'
      if (currentStatus === 'IN_PROGRESS') nextStatus = 'DONE'
      else if (currentStatus === 'DONE') {
        toast.error('ไม่สามารถแก้ไขรายการที่เสร็จสิ้นแล้วได้')
        return
      }
  
      if (nextStatus === 'DONE') {"""

pof_replacement = """      let nextStatus = 'IN_PROGRESS'
      let actionText = 'เริ่มลงลัง'
      if (currentStatus === 'IN_PROGRESS') { nextStatus = 'DONE'; actionText = 'ลงลังเสร็จ'; }
      else if (currentStatus === 'DONE') {
        toast.error('ไม่สามารถแก้ไขรายการที่เสร็จสิ้นแล้วได้')
        return
      }
  
      if (nextStatus !== 'DONE') {
        if (!window.confirm(`ยืนยันการเปลี่ยนสถานะชุดที่ ${currentTank} เป็น "${actionText}" ใช่หรือไม่?`)) return;
      }

      if (nextStatus === 'DONE') {"""

pof_content = pof_content.replace(pof_target, pof_replacement)
with open(pof_path, 'w', encoding='utf-8') as f:
    f.write(pof_content)

print("Confirmations added.")
