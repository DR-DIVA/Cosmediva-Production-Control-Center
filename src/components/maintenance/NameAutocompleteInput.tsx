'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { User, Clock, ChevronDown, Check, Building2, Sparkles } from 'lucide-react'
import {
  getSavedUserName,
  getRecentNamesList,
  saveUserName,
  isGenericPlaceholder,
  getMasterUsersList,
  cacheMasterUsersList,
  MasterUserOption
} from '@/lib/userMemory'

interface EnrichedSuggestion {
  displayName: string
  fullName?: string
  employeeId?: string
  department?: string
  isMaster: boolean
  userObject?: MasterUserOption
}

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
  onSelectUser?: (user: MasterUserOption) => void
}

export default function NameAutocompleteInput({
  value,
  onChange,
  placeholder = 'พิมพ์ชื่อหรือรหัสพนักงาน...',
  className = '',
  required = false,
  id,
  autoFocus = false,
  defaultFallback = '',
  onSelect,
  onSelectUser
}: NameAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [masterUsers, setMasterUsers] = useState<MasterUserOption[]>(() => getMasterUsersList())
  const [recentNames, setRecentNames] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useMemo(() => id ? `${id}-datalist` : `name-list-${Math.random().toString(36).substring(2, 9)}`, [id])

  // Fetch updated master users in background
  useEffect(() => {
    setRecentNames(getRecentNamesList())
    setMasterUsers(getMasterUsersList())

    const saved = getSavedUserName(defaultFallback)
    if (saved && (!value || isGenericPlaceholder(value))) {
      onChange(saved)
    }

    // Refresh master users from backend API
    fetch('/api/master-data/users')
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          cacheMasterUsersList(res.data)
          setMasterUsers(res.data)
        }
      })
      .catch(() => {})
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

  // Filter enriched suggestions based on current query
  const suggestions: EnrichedSuggestion[] = useMemo(() => {
    const q = (value || '').trim().toLowerCase()

    // 1. Filter Master Data Users
    const matchedMaster: EnrichedSuggestion[] = masterUsers
      .filter(u => {
        if (!q) return true
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q)
        )
      })
      .map(u => ({
        displayName: u.displayName,
        fullName: u.fullName,
        employeeId: u.employeeId,
        department: u.department,
        isMaster: true,
        userObject: u
      }))

    // 2. Filter Recent / Custom Stored Names (deduplicating those already in master)
    const masterDisplayNamesSet = new Set(masterUsers.map(u => u.displayName.toLowerCase()))
    const matchedRecent: EnrichedSuggestion[] = recentNames
      .filter(name => {
        if (!name || isGenericPlaceholder(name)) return false
        if (masterDisplayNamesSet.has(name.toLowerCase())) return false
        if (!q) return true
        return name.toLowerCase().includes(q)
      })
      .map(name => ({
        displayName: name,
        isMaster: false
      }))

    // Combine: Master Data users take priority
    const combined = [...matchedMaster, ...matchedRecent]
    return combined.slice(0, 12)
  }, [value, masterUsers, recentNames])

  const handleSelect = (item: EnrichedSuggestion) => {
    onChange(item.displayName)
    saveUserName(item.displayName)
    onSelect?.(item.displayName)
    if (item.userObject) {
      onSelectUser?.(item.userObject)
    }
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
        handleSelect(suggestions[highlightedIndex])
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
            setRecentNames(getRecentNamesList())
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

        {/* Native datalist fallback */}
        <datalist id={listId}>
          {masterUsers.map(u => (
            <option key={u.employeeId} value={u.displayName}>
              {u.department}
            </option>
          ))}
          {recentNames.map(n => (
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
          title="ดูรายชื่อจาก Master Data"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#D4AF37]' : ''}`} />
        </button>
      </div>

      {/* Floating Suggestions Popover */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 bg-gradient-to-r from-stone-50 to-amber-50/40 border-b border-stone-100 flex items-center justify-between text-[11px] text-stone-600 font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>รายชื่อพนักงาน (Master Data):</span>
            </span>
            <span className="text-[10px] text-stone-400">พบ {suggestions.length} คน</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-stone-50 py-1">
            {suggestions.map((item, index) => {
              const isSelected = item.displayName.toLowerCase() === (value || '').trim().toLowerCase()
              const isHighlighted = index === highlightedIndex

              return (
                <button
                  type="button"
                  key={item.displayName + (item.employeeId || index)}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition text-xs cursor-pointer ${
                    isHighlighted
                      ? 'bg-amber-50/90 text-stone-950'
                      : isSelected
                      ? 'bg-amber-50/50 text-[#8B7355]'
                      : 'text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                      item.isMaster
                        ? isHighlighted || isSelected
                          ? 'bg-[#D4AF37] text-white border-amber-500'
                          : 'bg-amber-100/70 text-amber-900 border-amber-200'
                        : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}>
                      <User className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-stone-900 truncate flex items-center gap-1.5">
                        <span className="truncate">{item.displayName}</span>
                      </div>
                      {item.department && (
                        <div className="text-[10px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{item.department}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {item.employeeId ? (
                      <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200">
                        {item.employeeId}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">
                        เคยบันทึก
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-[#D4AF37] ml-1 shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="p-2 bg-stone-50/80 border-t border-stone-100 text-[10px] text-stone-400 text-center flex items-center justify-center gap-1">
            <span>💡 ดึงข้อมูลชื่อ-สกุล (รหัสพนักงาน) จาก Master Data อัตโนมัติ</span>
          </div>
        </div>
      )}
    </div>
  )
}
