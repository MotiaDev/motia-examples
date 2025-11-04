import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isPast, parseISO } from 'date-fns'

interface Session {
  id: string
  date: string
  startTime: string
  endTime: string
  capacity: number
  status: string
  location?: string
}

interface Booking {
  id: string
  friendName: string
  phoneMasked: string
  status: 'confirmed' | 'waitlisted'
  createdAt: string
}

interface CalendarViewProps {
  sessions: Array<{
    session: Session
    bookings: Booking[]
  }>
  onSessionSelect?: (session: Session) => void
}

const CalendarView: React.FC<CalendarViewProps> = ({ sessions, onSessionSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get the first day of the week for the month start
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const getSessionForDate = (date: Date) => {
    return sessions.find(s => isSameDay(parseISO(s.session.date), date))
  }

  const getSessionStatus = (session: any) => {
    if (session.bookings.length >= session.session.capacity) {
      return 'full'
    }
    if (session.bookings.length > 0) {
      return 'partial'
    }
    return 'empty'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'full': return 'bg-red-500'
      case 'partial': return 'bg-yellow-500'
      case 'empty': return 'bg-green-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'full': return 'Full'
      case 'partial': return 'Partial'
      case 'empty': return 'Available'
      default: return 'No Session'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const session = getSessionForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)
            const isPastDay = isPast(day) && !isCurrentDay
            const sessionStatus = session ? getSessionStatus(session) : null

            return (
              <div
                key={index}
                className={`
                  aspect-square p-2 border border-gray-200 rounded-lg cursor-pointer transition-all
                  ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-gray-50'}
                  ${isCurrentDay ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                  ${isPastDay ? 'opacity-50' : ''}
                `}
                onClick={() => session && onSessionSelect?.(session.session)}
              >
                <div className="flex flex-col h-full">
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentDay ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Session Indicator */}
                  {session && (
                    <div className="flex-1 flex flex-col justify-center">
                      <div className={`w-full h-2 rounded-full ${getStatusColor(sessionStatus!)} mb-1`}></div>
                      <div className="text-xs text-gray-600 text-center">
                        {getStatusText(sessionStatus!)}
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        {session.bookings.length}/{session.session.capacity}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-6 py-4 border-t">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Partial</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Full</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <span className="text-gray-600">No Session</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarView
