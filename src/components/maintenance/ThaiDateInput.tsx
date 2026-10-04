'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

/**
 * Convert YYYY-MM-DD to DD/MM/YYYY (วัน/เดือน/ปี)
 */
export function toDDMMYYYY(iso?: string | null): string {
  if (!iso) return ''
  const clean = iso.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  return iso
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD
 */
export function fromDDMMYYYY(val: string): string {
  if (!val) return ''
  const parts = val.trim().split(/[/.-]/)
  if (parts.length === 3) {
    let [d, m, y] = parts
    d = d.padStart(2, '0')
    m = m.padStart(2, '0')
    let yearNum = parseInt(y, 10)
    if (yearNum > 2400) {
      yearNum -= 543 // Buddhist era to CE
    }
    const yearStr = String(yearNum).padStart(4, '20')
    return `${yearStr}-${m}-${d}`
  }
  return val
}

interface ThaiDateInputProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  title?: string
  disabled?: boolean
}

/**
 * ThaiDateInput: Guarantees display format is strictly DD/MM/YYYY (วัน/เดือน/ปี)
 * Opens OS calendar popup when clicked, while displaying strictly Day/Month/Year.
 */
export default function ThaiDateInput({
  value,
  onChange,
  placeholder = 'วว/ดด/ปปปป',
  className = '',
  title = 'เลือกวันที่ (วัน/เดือน/ปี)',
  disabled = false
}: ThaiDateInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const [displayText, setDisplayText] = useState(() => toDDMMYYYY(value))

  useEffect(() => {
    setDisplayText(toDDMMYYYY(value))
  }, [value])

  const handleOpenPicker = () => {
    if (disabled) return
    try {
      hiddenInputRef.current?.showPicker?.()
    } catch {
      hiddenInputRef.current?.focus()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const txt = e.target.value
    setDisplayText(txt)
    const iso = fromDDMMYYYY(txt)
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      onChange(iso)
    } else if (!txt.trim()) {
      onChange('')
    }
  }

  const handleTextBlur = () => {
    if (!displayText.trim()) {
      onChange('')
      return
    }
    const iso = fromDDMMYYYY(displayText)
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      onChange(iso)
      setDisplayText(toDDMMYYYY(iso))
    } else {
      setDisplayText(toDDMMYYYY(value))
    }
  }

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`}>
      <input
        type="text"
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        onClick={handleOpenPicker}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
        className="w-24 text-xs font-mono font-bold bg-transparent outline-none text-stone-800 placeholder:text-stone-400 placeholder:font-sans cursor-pointer"
      />
      <button
        type="button"
        onClick={handleOpenPicker}
        disabled={disabled}
        className="text-stone-400 hover:text-stone-700 p-0.5 transition cursor-pointer"
        tabIndex={-1}
        title="เปิดปฏิทินเลือกวันเดือนปี"
      >
        <Calendar className="w-3.5 h-3.5 text-stone-500" />
      </button>

      {/* Hidden native date input for OS calendar picker */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={value || ''}
        onChange={e => {
          onChange(e.target.value)
          setDisplayText(toDDMMYYYY(e.target.value))
        }}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none -z-10"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
