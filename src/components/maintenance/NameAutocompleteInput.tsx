'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { User, Clock, ChevronDown, Check } from 'lucide-react'
import {
  getSavedUserName,
  getRecentNamesList,
  saveUserName,
  isGenericPlaceholder
} from '@/lib/userMemory'

interface NameAutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  id?: string
  autoFocus?: boolean
  defaultFallback?: string
  onSelect?: (name: string) => void
}

export default function NameAutocompleteInput({
  value,
  onChange,
  placeholder = 'พิมพ์ชื่อ-นามสกุล...',
  className = '',
  required = false,
  id,
  autoFocus = false,
  defaultFallback = '',
  onSelect
}: NameAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [storedNames, setStoredNames] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useMemo(() => id ? `${id}-datalist` : `name-list-${Math.random().toString(36).substring(2, 9)}`, [id])

  // Initialize and load saved name if empty or generic placeholder
  useEffect(() => {
    const list = getRecentNamesList()
    setStoredNames(list)

    const saved = getSavedUserName(defaultFallback)
    if (saved && (!value || isGenericPlaceholder(value))) {
      onChange(saved)
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [])

  // Filter names based on current input text (supports Thai vowels like 'เ', substrings, etc.)
  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase()
    if (!q) {
      return storedNames.slice(0, 10)
    }
    return storedNames
      .filter(name => name.toLowerCase().includes(q))
      .slice(0, 10)
  }, [value, storedNames])

  const handleSelectName = (name: string) => {
    onChange(name)
    saveUserName(name)
    onSelect?.(name)
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true)
        return
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        handleSelectName(suggestions[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleBlur = () => {
    if (value && !isGenericPlaceholder(value)) {
      saveUserName(value)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => {
            setIsOpen(true)
            setStoredNames(getRecentNamesList())
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          list={listId}
          className={`pr-9 ${className}`}
        />

        {/* Native datalist fallback for browser native autofill */}
        <datalist id={listId}>
          {storedNames.map(n => (
            <option key={n} value={n} />
          ))}
        </datalist>

        {/* Dropdown toggle button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(prev => !prev)
            inputRef.current?.focus()
          }}
          className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-700 transition rounded-md"
          title="ดูรายชื่อที่จำไว้"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#D4AF37]' : ''}`} />
        </button>
      </div>

      {/* Floating Suggestions Popover */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 bg-stone-50 border-b border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-bold">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#D4AF37]" />
              <span>รายชื่อที่บันทึกไว้ (แตะเพื่อเลือก):</span>
            </span>
            <span className="text-[10px] text-stone-400">พบ {suggestions.length} ชื่อ</span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-stone-50 py-1">
            {suggestions.map((item, index) => {
              const isSelected = item.toLowerCase() === (value || '').trim().toLowerCase()
              const isHighlighted = index === highlightedIndex

              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => handleSelectName(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition text-xs font-semibold cursor-pointer ${
                    isHighlighted
                      ? 'bg-amber-50/80 text-stone-900'
                      : isSelected
                      ? 'bg-stone-50 text-[#8B7355]'
                      : 'text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected || isHighlighted ? 'bg-[#D4AF37]/20 text-[#8B7355]' : 'bg-stone-100 text-stone-500'
                    }`}>
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{item}</span>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 ml-2">
                    {index === 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        ล่าสุด
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-[#D4AF37]" />}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="p-2 bg-stone-50/60 border-t border-stone-100 text-[10px] text-stone-400 text-center">
            💡 ระบบจำชื่อที่คุณเคยพิมพ์ให้อัตโนมัติในครั้งถัดไป
          </div>
        </div>
      )}
    </div>
  )
}
