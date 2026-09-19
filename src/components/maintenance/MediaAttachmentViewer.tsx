'use client'

import React, { useState } from 'react'
import { Download, Share2, Eye, X, Check, FileVideo, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  urls: string[]
  title?: string
  woNumber?: string
}

export default function MediaAttachmentViewer({ urls, title = 'รูปภาพ/วิดีโอแนบ', woNumber }: Props) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!urls || urls.length === 0) return null

  // Helper: check if video
  const isVideo = (url: string) => {
    return url.startsWith('data:video') || url.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i)
  }

  // Trigger Download
  const handleDownload = async (url: string, index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      toast.info('📥 กำลังเริ่มดาวน์โหลดไฟล์...')
      const isVid = isVideo(url)
      const extension = isVid ? 'mp4' : 'jpg'
      const filename = `maintenance-${woNumber || 'job'}-${index + 1}.${extension}`

      // If it's data URI
      if (url.startsWith('data:')) {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('ดาวน์โหลดลงเครื่องเรียบร้อยแล้ว')
        return
      }

      // If remote URL, fetch as blob to force download
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
      toast.success('ดาวน์โหลดลงเครื่องเรียบร้อยแล้ว')
    } catch (err) {
      console.error('Download error:', err)
      // Fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  // Trigger Native Mobile Share (LINE, WhatsApp, Files, etc.)
  const handleShare = async (url: string, index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    if (navigator.share) {
      try {
        // If data URI, convert to file for native file share
        if (url.startsWith('data:')) {
          const res = await fetch(url)
          const blob = await res.blob()
          const file = new File([blob], `maintenance-${woNumber || 'media'}-${index + 1}.jpg`, { type: blob.type })
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `ภาพถ่ายงานซ่อม ${woNumber || ''}`,
              text: `ภาพถ่ายอาการหน้างาน / งานซ่อมบำรุง CosmeFlow Maintenance (${woNumber || ''})`,
              files: [file]
            })
            return
          }
        }

        // Web Share URL
        await navigator.share({
          title: `ภาพถ่ายงานซ่อม ${woNumber || ''}`,
          text: `ภาพถ่ายอาการหน้างาน / งานซ่อมบำรุง CosmeFlow Maintenance (${woNumber || ''})`,
          url: url.startsWith('http') ? url : undefined
        })
        toast.success('เปิดเมนูแชร์ส่งต่อเรียบร้อยแล้ว')
        return
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err)
        }
      }
    }

    // Fallback: Copy link to clipboard
    if (url.startsWith('http')) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('คัดลอกลิงก์รูปภาพแล้ว สามารถนำไปวางส่งใน LINE ได้เลยค่ะ')
      setTimeout(() => setCopied(false), 2000)
    } else {
      // If it's data url, trigger download instead
      handleDownload(url, index)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-stone-600">
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>{title} ({urls.length})</span>
        </span>
        <span className="text-[11px] text-stone-400 font-normal">
          แตะเพื่อดูขนาดเต็ม หรือกดโหลด/แชร์
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {urls.map((url, idx) => {
          const isVid = isVideo(url)

          return (
            <div
              key={idx}
              onClick={() => setActiveUrl(url)}
              className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 cursor-pointer shadow-xs hover:border-[#D4AF37] transition-all"
            >
              {isVid ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-stone-800">
                  <FileVideo className="w-8 h-8 text-cyan-400" />
                  <span className="text-[10px] mt-1 font-bold">วิดีโอ</span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={url}
                  alt={`Attachment ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              )}

              {/* Quick Action Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                <button
                  type="button"
                  title="ดาวน์โหลดรูปนี้"
                  onClick={(e) => handleDownload(url, idx, e)}
                  className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-900 shadow-md transition transform active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="แชร์ / ส่งต่อ (LINE, ฯลฯ)"
                  onClick={(e) => handleShare(url, idx, e)}
                  className="p-1.5 rounded-lg bg-[#D4AF37] hover:bg-amber-400 text-stone-900 shadow-md transition transform active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mobile permanent badge */}
              <div className="absolute bottom-1 right-1 sm:hidden flex items-center gap-1">
                <span className="p-1 rounded-md bg-black/60 text-white">
                  <Eye className="w-3 h-3" />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {activeUrl && (
        <div
          onClick={() => setActiveUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6"
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl flex items-center justify-between pb-3 text-white"
          >
            <div className="text-sm font-bold truncate">
              {title} {woNumber ? `• ${woNumber}` : ''}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(activeUrl, 0)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดลงเครื่อง</span>
              </button>

              <button
                type="button"
                onClick={() => handleShare(activeUrl, 0)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-stone-900 text-xs font-black transition shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>แชร์ / ส่งต่อ LINE</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveUrl(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media View Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[80vh] w-full flex items-center justify-center rounded-2xl overflow-hidden bg-black/40"
          >
            {isVideo(activeUrl) ? (
              <video
                src={activeUrl}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-2xl"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeUrl}
                alt="Fullscreen Preview"
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>

          <div className="mt-3 text-xs text-stone-400 text-center">
            กดที่ว่างหรือปุ่มกากบาทเพื่อปิด | แตะค้างที่รูปภาพเพื่อบันทึกผ่านเบราว์เซอร์ได้เช่นกัน
          </div>
        </div>
      )}
    </div>
  )
}
