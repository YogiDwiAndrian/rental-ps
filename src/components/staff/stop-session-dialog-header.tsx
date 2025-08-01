// src/components/staff/stop-session-dialog-header.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  StopCircle, 
  Clock, 
  Timer, 
  Package, 
  AlertTriangle,
  CheckCircle2,
  Gamepad2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

interface ActiveSession {
  id: string
  unitId: string
  unitName: string
  billingModel: 'timer' | 'hourly' | 'package'
  startTime: string
  estimatedEndTime?: string
  remainingMinutes?: number
  totalAmount?: number
  isOvertime: boolean
  purchasedDuration?: number
  extendedDuration?: number
  hourlyRate?: number
  customerName?: string
}

interface StopSessionDialogHeaderProps {
  session: ActiveSession
  sessionDuration: string
  actualMinutes: number
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getBillingModelInfo = (billingModel: string) => {
  switch (billingModel) {
    case 'timer':
      return { label: 'Timer', icon: <Timer className="w-3 h-3" />, color: 'bg-blue-50 text-blue-700 border-blue-200' }
    case 'hourly':
      return { label: 'Hourly', icon: <Clock className="w-3 h-3" />, color: 'bg-green-50 text-green-700 border-green-200' }
    case 'package':
      return { label: 'Package', icon: <Package className="w-3 h-3" />, color: 'bg-purple-50 text-purple-700 border-purple-200' }
    default:
      return { label: 'Unknown', icon: <Clock className="w-3 h-3" />, color: 'bg-gray-50 text-gray-700 border-gray-200' }
  }
}

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StopSessionDialogHeader({ 
  session, 
  sessionDuration, 
  actualMinutes 
}: StopSessionDialogHeaderProps) {
  const billingInfo = getBillingModelInfo(session.billingModel)
  
  return (
    <DialogHeader className="space-y-2">
      {/* Compact Title with proper spacing for close button */}
      <div className="flex items-start justify-between gap-4 pr-8">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
            <StopCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-lg font-bold text-gray-900">
              Hentikan Session
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              {session.unitName}
            </DialogDescription>
          </div>
        </div>
        
        {/* Status Badge - positioned to avoid close button */}
        <div className="flex-shrink-0">
          <Badge 
            variant="outline" 
            className={cn(
              "px-2 py-1 text-xs border",
              session.isOvertime 
                ? "bg-amber-50 text-amber-700 border-amber-200" 
                : "bg-green-50 text-green-700 border-green-200"
            )}
          >
            {session.isOvertime ? (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overtime
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Normal
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Compact Session Info */}
      <div className="flex flex-wrap items-center gap-3 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">{session.unitName}</span>
        </div>
        
        <Badge variant="outline" className={cn("text-xs border", billingInfo.color)}>
          {billingInfo.icon}
          <span className="ml-1">{billingInfo.label}</span>
        </Badge>
        
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="w-3 h-3" />
          <span>{sessionDuration}</span>
        </div>
        
        <div className="text-xs text-gray-500">
          Mulai: {formatTime(session.startTime)}
        </div>
      </div>

      {/* Only show critical warnings */}
      {session.isOvertime && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800 font-medium">
              Session Overtime - biaya tambahan berlaku
            </p>
          </div>
        </div>
      )}
    </DialogHeader>
  )
}