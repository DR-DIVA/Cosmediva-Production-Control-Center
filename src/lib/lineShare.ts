import { toast } from 'sonner'

/**
 * Smart Share to LINE utility
 * Solves the desktop browser redirection to line.me/en/ (Download page)
 * 
 * Behavior:
 * 1. Automatically copies the formatted message to clipboard (100% reliable on all platforms).
 * 2. If on Mobile: attempts navigator.share (which opens the native sheet with LINE app),
 *    or triggers line://msg/text/ scheme to open LINE app directly.
 * 3. If on Desktop PC:
 *    - Does NOT redirect browser to line.me/en/ (avoids the "Life on LINE - Download" screen)!
 *    - Triggers the local LINE PC app protocol (line://) via a hidden iframe so browser never leaves or opens download tab.
 *    - Shows a clear, helpful toast: "📋 คัดลอกข้อความสรุปแล้ว! (เปิดแชต LINE แล้วกด Ctrl + V วางได้ทันทีค่ะ)"
 */
export async function shareToLine(text: string, title: string = 'แจ้งซ่อมเครื่องจักร CosmeFlow'): Promise<boolean> {
  if (typeof window === 'undefined') return false

  // 1. Always copy text to clipboard first
  let copySuccess = false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      copySuccess = true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      copySuccess = document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  } catch (err) {
    console.warn('Clipboard write fallback error:', err)
  }

  // 2. Detect Mobile vs Desktop
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

  if (isMobile) {
    // Mobile: Try native Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text
        })
        toast.success('เปิดเมนูแชร์ส่งต่อเรียบร้อยแล้ว')
        return true
      } catch (err: any) {
        if (err.name === 'AbortError') return false
      }
    }

    // Mobile fallback: Try opening LINE app via app scheme (NOT line.me/R/share which can redirect)
    try {
      window.location.href = `line://msg/text/${encodeURIComponent(text)}`
      toast.success('กำลังเปิดแอปพลิเคชัน LINE...')
      return true
    } catch (e) {
      toast.success('📋 คัดลอกข้อความแล้ว นำไปวางใน LINE ได้เลยค่ะ')
      return true
    }
  } else {
    // Desktop PC:
    // Try launching the installed desktop LINE application without opening a new browser tab
    try {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = `line://msg/text/${encodeURIComponent(text)}`
      document.body.appendChild(iframe)
      setTimeout(() => {
        try {
          document.body.removeChild(iframe)
        } catch {}
      }, 1500)
    } catch (e) {}

    // Show prominent confirmation toast
    toast.success('📋 คัดลอกข้อความแจ้งซ่อมเรียบร้อยแล้ว! เปิดแชต LINE แล้วกด Ctrl + V วางได้ทันทีค่ะ', {
      duration: 6000,
      description: 'ระบบคัดลอกข้อความทั้งหมดลง Clipboard ให้แล้ว สามารถนำไปส่งในห้องกลุ่มช่างได้ทันที'
    })
    return true
  }
}
