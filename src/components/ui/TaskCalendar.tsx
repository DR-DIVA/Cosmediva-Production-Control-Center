import React, { useState } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  startOfWeek, 
  endOfWeek,
  parseISO
} from 'date-fns'
import { th } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from './button'

interface TaskCalendarProps {
  tasks: any[]
  dateField?: string // e.g. 'activity_date' or 'start_time'
  onTaskClick: (task: any) => void
  onDateClick?: (date: Date) => void
}

export function TaskCalendar({ 
  tasks, 
  dateField = 'activity_date',
  onTaskClick,
  onDateClick
}: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const jumpToToday = () => setCurrentDate(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const dateFormat = "d"

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  const weekDays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์']

  // Helper to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
      case 'IN_PROGRESS': return 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/20'
      case 'DONE': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
      case 'QC_PASS': return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
      case 'HOLD': return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
      default: return 'bg-[#F8F6F0] text-slate-600 border-slate-200 hover:bg-slate-100'
    }
  }

  // Get tasks for a specific date
  const getTasksForDate = (day: Date) => {
    return tasks.filter(t => {
      // Need a valid date field, fallback to created_at if necessary for viewing
      const dateString = t[dateField] || t.created_at
      if (!dateString) return false
      
      const taskDate = parseISO(dateString)
      return isSameDay(taskDate, day)
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[750px]">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#F8F6F0]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-slate-500" />
            {format(currentDate, 'MMMM yyyy', { locale: th })}
          </h2>
          <Button variant="outline" size="sm" onClick={jumpToToday} className="h-8 text-xs font-medium">
            วันนี้
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 hover:bg-slate-200">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 hover:bg-slate-200">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[#F8F6F0]">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-slate-100 gap-px">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isToday = isSameDay(day, new Date())
          const dayTasks = getTasksForDate(day)

          return (
            <div 
              key={day.toString()} 
              className={`min-h-[120px] bg-white p-2 flex flex-col transition-colors ${!isCurrentMonth ? 'bg-[#F8F6F0] text-slate-400' : ''} ${isToday ? 'bg-[#D4AF37]/10' : ''} hover:bg-[#F8F6F0] cursor-pointer`}
              onClick={() => onDateClick && onDateClick(day)}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#D4AF37] text-white shadow-sm' : ''}`}>
                  {format(day, dateFormat)}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {dayTasks.length} งาน
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 pr-1">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onTaskClick(task)
                    }}
                    className={`text-xs px-2 py-1.5 rounded border shadow-sm cursor-pointer truncate font-medium ${getStatusColor(task.status)}`}
                    title={task.production_lots?.products?.product_name || task.production_lots?.sku_id}
                  >
                    <div className="truncate">{task.production_lots?.products?.sku || task.production_lots?.sku_id || 'ไม่มี SKU'}</div>
                    <div className="text-[10px] opacity-75 truncate">
                      {task.production_lots?.lot_no || 'ไม่มี LOT'}
                      {task.tank_start ? ` | ถังที่ ${task.tank_start}${task.tank_end && task.tank_end !== task.tank_start ? `-${task.tank_end}` : ''}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
