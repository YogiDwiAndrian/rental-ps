'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar } from 'lucide-react'

interface OperationalHour {
  open: string
  close: string
}

interface OperationalHoursProps {
  hours: Record<string, OperationalHour>
  className?: string
}

export function OperationalHours({ hours, className }: OperationalHoursProps) {
  const days = [
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' }
  ]

  const getCurrentDay = () => {
    const today = new Date().getDay()
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return dayKeys[today]
  }

  const isOpenNow = () => {
    const now = new Date()
    const currentDay = getCurrentDay()
    const todayHours = hours[currentDay]
    
    if (!todayHours) return false
    
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [openHour, openMinute] = todayHours.open.split(':').map(Number)
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number)
    
    const openTime = openHour * 60 + openMinute
    const closeTime = closeHour * 60 + closeMinute
    
    return currentTime >= openTime && currentTime <= closeTime
  }

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayHour}:${minute} ${ampm}`
  }

  const currentDay = getCurrentDay()
  const isCurrentlyOpen = isOpenNow()

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Operating Hours
          <Badge 
            className={`ml-auto ${isCurrentlyOpen 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-red-100 text-red-800 border-red-200'
            }`}
          >
            {isCurrentlyOpen ? '🟢 Open Now' : '🔴 Closed'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {days.map(day => {
            const dayHours = hours[day.key]
            const isToday = day.key === currentDay
            
            return (
              <div 
                key={day.key}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isToday 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isToday && <Calendar className="w-4 h-4 text-blue-600" />}
                  <span className={`font-medium ${isToday ? 'text-blue-900' : 'text-gray-700'}`}>
                    {day.label}
                  </span>
                  {isToday && (
                    <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                      Today
                    </Badge>
                  )}
                </div>
                
                <span className={`text-sm ${isToday ? 'text-blue-800 font-medium' : 'text-gray-600'}`}>
                  {dayHours 
                    ? `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`
                    : 'Closed'
                  }
                </span>
              </div>
            )
          })}
        </div>
        
        {isCurrentlyOpen && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              🎮 We are open now! Come and play at our gaming center.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}