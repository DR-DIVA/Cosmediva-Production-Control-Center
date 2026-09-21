'use client'

import React, { useState } from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import { Search, Wrench, Package, FileText, ArrowRight, Clock, Bot, Sparkles, Upload, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { searchMaintenance } from '@/app/actions/maintenance'
import { formatWorkOrderStatus } from '@/types/maintenance'
import ImportLineChatModal from '@/components/maintenance/ImportLineChatModal'
import { askMtexAI } from '@/app/actions/mtex-ai'
import { RefreshCw } from 'lucide-react'

export default function MaintenanceSearchPage() {
  const [query, setQuery] = useState('')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [results, setResults] = useState<{
    machines: any[]
    workOrders: any[]
    parts: any[]
    chats: any[]
  }>({ machines: [], workOrders: [], parts: [], chats: [] })
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault()
    const targetQuery = (directQuery ?? query).trim()
    if (!targetQuery) return

    setIsLoading(true)
    setIsAiLoading(true)
    setAiAnswer(null)
    setHasSearched(true)

    // 1. Run traditional database search
    searchMaintenance(targetQuery)
      .then(res => {
        if (res.success && res.data) {
          setResults(res.data)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))

    // 2. Run MTEX AI Assistant search on chat history & knowledge base
    askMtexAI(targetQuery)
      .then(res => {
        if (res && res.answer) {
          setAiAnswer(res.answer)
        }
      })
      .catch(err => {
        console.error('MTEX AI search error:', err)
        setAiAnswer('ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อกับน้อง MTEX AI ชั่วคราว')
      })
      .finally(() => setIsAiLoading(false))
  }

  const quickQueries = ['MX-04', 'Bearing', 'FL-01', 'Sensor', 'Wear & Tear', 'Solenoid', 'CP-01']

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0">
      <MaintenanceHeader />

      {/* Search Box & Knowledge AI Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4 text-center relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-2">
          <div className="text-left">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              ระบบสืบค้นประวัติงานซ่อมบำรุงอัจฉริยะ (Global Search)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              ค้นหาครอบคลุมทุกมิติ: รหัสเครื่อง, ชื่องานซ่อม, เลขที่ใบสั่ง, อาการเสีย, อะไหล่ หรือสาเหตุ (Root Cause)
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-11 px-5 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg flex items-center gap-2.5 shrink-0 cursor-pointer transition-transform active:scale-95"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-700/50 flex items-center justify-center">
              <Bot className="w-4 h-4 text-emerald-200" />
            </div>
            <span>📥 นำเข้าประวัติแชท LINE & ถามน้อง MTEX</span>
          </Button>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ลองพิมพ์ เช่น 'MX-04 bearing', 'FL-01', 'เซนเซอร์'..."
              className="pl-12 h-13 text-sm rounded-2xl bg-stone-50 border-stone-300 focus:ring-2 focus:ring-[#D4AF37]"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="h-13 px-6 rounded-2xl font-bold bg-[#2A2521] hover:bg-stone-800 text-white text-sm"
          >
            {isLoading ? 'กำลังค้น...' : 'ค้นหา'}
          </Button>
        </form>

        {/* Quick Search Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-xs text-stone-400 mr-1">คำค้นยอดนิยม:</span>
          {quickQueries.map(q => (
            <button
              type="button"
              key={q}
              onClick={() => {
                setQuery(q)
                handleSearch(undefined, q)
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-amber-50 hover:text-amber-900 border border-stone-200 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {hasSearched && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* MTEX AI Smart Assistant Answer Card */}
          {(isAiLoading || aiAnswer) && (
            <div className="p-5 sm:p-6 bg-gradient-to-br from-stone-900 via-[#1e1b18] to-stone-900 text-stone-100 rounded-3xl border-2 border-[#D4AF37]/50 shadow-xl space-y-3.5 text-left relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-inner">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>คำตอบจากน้อง MTEX AI Assistant</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                        คลังแชท & ประวัติช่าง 12,181 รายการ
                      </span>
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      สืบค้นและวิเคราะห์ประวัติงานซ่อมจริงจากกลุ่มแชท LINE CMD Maintenance
                    </p>
                  </div>
                </div>

                {isAiLoading && (
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>น้อง MTEX กำลังคิดและสรุปข้อมูล...</span>
                  </div>
                )}
              </div>

              {aiAnswer && (
                <div className="text-xs sm:text-sm text-stone-200 leading-relaxed whitespace-pre-line bg-stone-950/70 p-4 sm:p-5 rounded-2xl border border-stone-800/80 font-sans shadow-inner">
                  {aiAnswer}
                </div>
              )}
            </div>
          )}

          {/* Machines Result */}
          {results.machines.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Wrench className="w-4 h-4 text-[#D4AF37]" />
                <span>เครื่องจักรที่ตรงกัน ({results.machines.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.machines.map(m => (
                  <Link
                    key={m.id}
                    href={`/maintenance/machines/${m.machine_code}`}
                    className="p-3.5 rounded-2xl border border-stone-200 hover:border-[#D4AF37] hover:bg-amber-50/30 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono font-bold text-stone-900 text-sm">{m.machine_code}</div>
                      <div className="text-xs text-stone-700 font-medium">{m.machine_name}</div>
                      <div className="text-[10px] text-stone-400">{m.production_area || m.category}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Work Orders Result */}
          {results.workOrders.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>ใบสั่งซ่อมและประวัติการเสีย ({results.workOrders.length})</span>
              </div>
              <div className="space-y-2">
                {results.workOrders.map(wo => (
                  <div
                    key={wo.id}
                    className="p-3.5 rounded-2xl border border-stone-200 hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</span>
                        <span className="font-bold text-sm text-stone-900">{wo.machine_code}</span>
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-bold border border-stone-200">
                          {formatWorkOrderStatus(wo.status)}
                        </span>
                      </div>
                      <div className="text-xs text-stone-700 mt-1">
                        อาการ: <b>{wo.symptom_category}</b> {wo.root_cause ? `| สาเหตุ: ${wo.root_cause}` : ''}
                      </div>
                    </div>

                    <Link
                      href={`/maintenance/machines/${wo.machine_code}`}
                      className="text-xs font-bold text-[#8B7355] hover:underline self-end sm:self-auto"
                    >
                      ดูประวัติเครื่องนี้
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spare Parts Result */}
          {results.parts.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Package className="w-4 h-4 text-amber-600" />
                <span>อะไหล่ที่ตรงกัน ({results.parts.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.parts.map(p => (
                  <div key={p.id} className="p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-stone-900 text-xs">{p.part_code}</div>
                      <div className="text-xs font-bold text-stone-800">{p.part_name}</div>
                      <div className="text-[10px] text-stone-400">ชั้นเก็บ: {p.storage_location}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-800">
                      คงเหลือ {p.stock_qty} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LINE Chat History Result */}
          {results.chats && results.chats.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>บันทึกประวัติการพูดคุยในกลุ่มช่าง LINE ({results.chats.length} รายการล่าสุด)</span>
                </div>
                <span className="text-[11px] text-stone-400 font-medium">
                  นำวัน-เวลาไปค้นหารูป/วิดีโอในแชท LINE ได้
                </span>
              </div>
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {results.chats.map((c, idx) => {
                  const d = c.chat_date ? new Date(c.chat_date) : null
                  const dateStr = d && !isNaN(d.getTime()) 
                    ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                    : ''
                  return (
                    <div
                      key={c.id || idx}
                      className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50/70 hover:bg-emerald-50/20 hover:border-emerald-200 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800">{c.sender_name || 'ไม่ระบุผู้ส่ง'}</span>
                          {c.machine_code && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 font-mono text-[10px] font-bold">
                              {c.machine_code}
                            </span>
                          )}
                        </div>
                        {dateStr && (
                          <span className="font-mono text-[11px] text-stone-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-stone-200/60 shadow-2xs">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {dateStr}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed break-words whitespace-pre-line">
                        {c.message_text}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {results.machines.length === 0 && results.workOrders.length === 0 && results.parts.length === 0 && results.chats.length === 0 && !isAiLoading && !aiAnswer && (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-xs text-stone-400">
              ไม่พบข้อมูลที่ตรงกับคำค้นหา &quot;{query}&quot;
            </div>
          )}
        </div>
      )}

      {/* Import LINE Chat Modal */}
      <ImportLineChatModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
