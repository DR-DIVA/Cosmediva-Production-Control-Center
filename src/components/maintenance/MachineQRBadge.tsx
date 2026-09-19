'use client'

import React, { useRef } from 'react'
import { QrCode, Printer, ExternalLink, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface MachineQRBadgeProps {
  machineCode: string
  machineName: string
  productionArea?: string | null
  criticality?: string
  roomName?: string | null
  assetId?: string | null
  supplier?: string | null
  serialNumber?: string | null
  model?: string | null
  pmFrequency?: string | null
}

export default function MachineQRBadge({
  machineCode,
  machineName,
  productionArea,
  criticality = 'A',
  roomName,
  assetId,
  supplier,
  serialNumber,
  model,
  pmFrequency
}: MachineQRBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null)

  // Target report URL when scanned by mobile camera
  // In production it will link directly to /maintenance/report/[machineCode]
  const reportUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/maintenance/report/${machineCode}`
    : `/maintenance/report/${machineCode}`

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(reportUrl)}`

  const handlePrint = () => {
    if (!badgeRef.current) return
    const printWindow = window.open('', '', 'width=600,height=700')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Badge - ${machineCode}</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
              .badge-card { border: 3px solid #000; border-radius: 16px; padding: 24px; text-align: center; width: 340px; }
              .header { font-size: 13px; font-weight: bold; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
              .title { font-size: 28px; font-weight: 900; margin: 4px 0; }
              .asset-id { font-size: 13px; font-weight: bold; color: #2563eb; margin-bottom: 4px; }
              .pm-freq { font-size: 12px; font-weight: bold; color: #0284c7; background: #f0f9ff; padding: 3px 8px; border-radius: 6px; display: inline-block; margin-bottom: 6px; border: 1px solid #bae6fd; }
              .subtitle { font-size: 13px; color: #333; margin-bottom: 10px; line-height: 1.3; }
              .meta { font-size: 11px; color: #666; margin-bottom: 10px; }
              .qr-img { width: 190px; height: 190px; margin: 0 auto; display: block; }
              .footer { margin-top: 12px; font-size: 12px; font-weight: bold; background: #f0fdf4; color: #166534; padding: 6px 10px; border-radius: 8px; border: 1px solid #bbf7d0; }
              .emergency { color: #dc2626; font-size: 13px; font-weight: bold; margin-top: 8px; }
            </style>
          </head>
          <body>
            <div class="badge-card">
              <div class="header">CosmeFlow Maintenance • Smart Asset QR</div>
              <div class="title">${machineCode}</div>
              ${assetId ? `<div class="asset-id">เลขทรัพย์สิน: ${assetId}</div>` : ''}
              ${pmFrequency ? `<div class="pm-freq">รอบความถี่ PM: ${pmFrequency}</div>` : ''}
              <div class="subtitle">${machineName}<br/><b>${productionArea || ''}</b></div>
              ${supplier && supplier !== 'N/A' ? `<div class="meta">ผู้จำหน่าย: ${supplier}</div>` : ''}
              <img class="qr-img" src="${qrImageUrl}" alt="QR" />
              <div class="emergency">🚨 สแกนเพื่อ: แจ้งซ่อม | เบิกอะไหล่ | ตรวจ PM</div>
              <div class="footer">สแกนดูประวัติเครื่องจักร & Maintenance 360°</div>
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="bg-white border-2 border-[#D4AF37]/50 rounded-2xl p-5 shadow-lg flex flex-col items-center text-center max-w-sm w-full mx-auto">
      <div ref={badgeRef} className="w-full flex flex-col items-center">
        <div className="text-[11px] font-bold text-[#8B7355] tracking-widest uppercase mb-1">
          CosmeFlow Smart Asset QR
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl font-black text-stone-900 tracking-tight">{machineCode}</span>
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
            criticality === 'A' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}>
            Grade {criticality}
          </span>
        </div>
        {assetId && (
          <div className="text-xs font-mono font-bold text-blue-700 mb-1">
            เลขทรัพย์สิน: {assetId}
          </div>
        )}
        {pmFrequency && (
          <div className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md border border-cyan-200 mb-1">
            รอบ PM: {pmFrequency}
          </div>
        )}
        <p className="text-xs text-stone-600 font-medium line-clamp-2 px-2 mb-2">
          {machineName}
        </p>

        {supplier && supplier !== 'N/A' && (
          <div className="text-[11px] text-stone-500 mb-2">
            ผู้จำหน่าย: <span className="font-semibold text-stone-700">{supplier}</span>
          </div>
        )}

        {/* QR Code Container */}
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 shadow-inner mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt={`QR Code for ${machineCode}`}
            className="w-48 h-48 rounded-lg object-contain bg-white p-1"
          />
        </div>

        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold w-full flex items-center justify-center gap-1.5 mb-2">
          <span>📱</span> สแกนเพื่อ: แจ้งซ่อม | เบิกอะไหล่ | ดูรอบ PM
        </div>

        <div className="text-[11px] text-stone-500 font-mono break-all px-2 line-clamp-1">
          {reportUrl}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full mt-4 pt-3 border-t border-stone-100">
        <Button
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="flex-1 text-xs border-stone-300 hover:border-[#D4AF37] hover:text-[#D4AF37]"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          พิมพ์ป้าย QR
        </Button>

        <Link
          href={`/maintenance/report/${machineCode}`}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          ทดลองสแกน
        </Link>
      </div>
    </div>
  )
}
