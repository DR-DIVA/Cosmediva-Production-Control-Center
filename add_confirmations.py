import os
import re

base_dir = r"c:\Users\hp\Dropbox\AI AGENT\Antigravity\Update PD Daily Status\cosmediva-os\src\app\(dashboard)\my-tasks"

# 1. Weighing
weighing_path = os.path.join(base_dir, 'weighing', 'page.tsx')
with open(weighing_path, 'r', encoding='utf-8') as f:
    w_content = f.read()

w_target = r"""      let nextStatus = 'IN_PROGRESS'
      if \(currentStatus === 'IN_PROGRESS'\) nextStatus = 'DONE'
      else if \(currentStatus === 'DONE'\) nextStatus = 'MOVED'
      else if \(currentStatus === 'MOVED'\) \{
        toast\.error\('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้'\)
        return
      \}

      if \(nextStatus === 'WAITING'\) \{"""

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

w_content = re.sub(w_target, w_replacement, w_content)
with open(weighing_path, 'w', encoding='utf-8') as f:
    f.write(w_content)


# 2. Mixing
mixing_path = os.path.join(base_dir, 'mixing', 'page.tsx')
with open(mixing_path, 'r', encoding='utf-8') as f:
    m_content = f.read()

m_target = r"""    let nextStatus = 'SOAKING'
    if \(currentStatus === 'SOAKING'\) nextStatus = 'MIXING'
    else if \(currentStatus === 'MIXING'\) nextStatus = 'DONE'
    else if \(currentStatus === 'DONE'\) nextStatus = 'SENT_TO_QC'
    else if \(currentStatus === 'QC_PASS'\) nextStatus = 'SENT_TO_PACKING'
    else if \(currentStatus === 'SENT_TO_QC' \|\| currentStatus === 'SENT_TO_PACKING'\) \{
      toast\.error\('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้'\)
      return
    \}

    if \(nextStatus === 'WAITING'\) \{"""

m_replacement = """    let nextStatus = 'SOAKING'
    let actionText = 'เริ่มแช่สาร'
    if (currentStatus === 'SOAKING') { nextStatus = 'MIXING'; actionText = 'เริ่มผสม'; }
    else if (currentStatus === 'MIXING') { nextStatus = 'DONE'; actionText = 'ผสมเสร็จแล้ว'; }
    else if (currentStatus === 'DONE') { nextStatus = 'SENT_TO_QC'; actionText = 'ส่งตรวจ QC'; }
    else if (currentStatus === 'QC_PASS') { nextStatus = 'SENT_TO_PACKING'; actionText = 'ส่งไปห้องบรรจุ'; }
    else if (currentStatus === 'SENT_TO_QC' || currentStatus === 'SENT_TO_PACKING') {
      toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
      return
    }

    if (!window.confirm(`ยืนยันการเปลี่ยนสถานะถังที่ ${currentTank} เป็น "${actionText}" ใช่หรือไม่?`)) return;

    if (nextStatus === 'WAITING') {"""

m_content = re.sub(m_target, m_replacement, m_content)
with open(mixing_path, 'w', encoding='utf-8') as f:
    f.write(m_content)


# 3. Packing
packing_path = os.path.join(base_dir, 'packing', 'page.tsx')
with open(packing_path, 'r', encoding='utf-8') as f:
    p_content = f.read()

p_target = r"""    let nextStatus = 'IN_PROGRESS'
    if \(currentStatus === 'IN_PROGRESS'\) nextStatus = 'DONE'
    else if \(currentStatus === 'DONE'\) nextStatus = 'SENT_TO_POF'
    else if \(currentStatus === 'SENT_TO_POF'\) \{
      toast\.error\('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้'\)
      return
    \}

    if \(nextStatus === 'DONE'\) \{"""

p_replacement_actual = """    let nextStatus = 'IN_PROGRESS'
    let actionText = 'เริ่มบรรจุ'
    if (currentStatus === 'IN_PROGRESS') { nextStatus = 'DONE'; actionText = 'บรรจุเสร็จ'; }
    else if (currentStatus === 'DONE') { nextStatus = 'SENT_TO_POF'; actionText = 'ส่งไปห้องลงลัง (POF)'; }
    else if (currentStatus === 'SENT_TO_POF') {
      toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
      return
    }

    if (nextStatus !== 'DONE') {
      if (!window.confirm(`ยืนยันการเปลี่ยนสถานะถังที่ ${currentTank} เป็น "${actionText}" ใช่หรือไม่?`)) return;
    }

    if (nextStatus === 'DONE') {"""

p_content = re.sub(p_target, p_replacement_actual, p_content)
with open(packing_path, 'w', encoding='utf-8') as f:
    f.write(p_content)


# 4. POF
pof_path = os.path.join(base_dir, 'pof', 'page.tsx')
with open(pof_path, 'r', encoding='utf-8') as f:
    pof_content = f.read()

pof_target = r"""    let nextStatus = 'IN_PROGRESS'
    if \(currentStatus === 'IN_PROGRESS'\) nextStatus = 'DONE'
    else if \(currentStatus === 'DONE'\) nextStatus = 'SENT_TO_FG'
    else if \(currentStatus === 'SENT_TO_FG'\) \{
      toast\.error\('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้'\)
      return
    \}

    if \(nextStatus === 'DONE'\) \{"""

pof_replacement_actual = """    let nextStatus = 'IN_PROGRESS'
    let actionText = 'เริ่มลงลัง'
    if (currentStatus === 'IN_PROGRESS') { nextStatus = 'DONE'; actionText = 'ลงลังเสร็จ'; }
    else if (currentStatus === 'DONE') { nextStatus = 'SENT_TO_FG'; actionText = 'ส่งไปคลัง FG'; }
    else if (currentStatus === 'SENT_TO_FG') {
      toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
      return
    }

    if (nextStatus !== 'DONE') {
      if (!window.confirm(`ยืนยันการเปลี่ยนสถานะชุดที่ ${currentTank} เป็น "${actionText}" ใช่หรือไม่?`)) return;
    }

    if (nextStatus === 'DONE') {"""

pof_content = re.sub(pof_target, pof_replacement_actual, pof_content)
with open(pof_path, 'w', encoding='utf-8') as f:
    f.write(pof_content)

print("Confirmations added.")
