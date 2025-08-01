'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  History,
  RefreshCw, 
  Clock,
  Play,
  Square,
  XCircle,
  Eye,
  Filter,
  Loader2,
  CalendarX,
  User,
  DollarSign,
  Timer,
  Package,
  Coffee,
  ExternalLink,
  Calendar,
  CalendarDays
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================
// TYPES
// ============================================

interface RentalSession {
  id: string
  unitId: string
  unitName: string
  customerName?: string
  billingModel: 'timer' | 'hourly' | 'package'
  status: 'active' | 'completed' | 'cancelled'
  startTime: string
  endTime?: string
  duration?: number
  totalAmount: number
  purchasedDuration: number
  extendedDuration: number
  notes?: string
  createdBy?: string
  createdByName?: string
  hasFnbOrders: boolean
  fnbOrdersCount: number
  fnbOrdersTotal: number
}

interface SessionHistoryResponse {
  success: boolean
  data: RentalSession[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message: string
}

interface SessionHistoryProps {
  locationId: string
  onRefresh?: () => void
  onViewFnbOrders?: (sessionId: string) => void
}

export function SessionHistory({ locationId, onRefresh, onViewFnbOrders }: SessionHistoryProps) {
  // ===== STATE =====
  const [sessions, setSessions] = useState<RentalSession[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSessions, setTotalSessions] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('today')
const [dateFrom, setDateFrom] = useState<string>('')
const [dateTo, setDateTo] = useState<string>('')

  const ITEMS_PER_PAGE = 15

  // ===== UTILITY FUNCTIONS =====
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getTodayDateString = (): string => {
    return new Date().toISOString().split('T')[0]
  }

  const getWeekStartDate = (): string => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    return monday.toISOString().split('T')[0]
  }

  const getMonthStartDate = (): string => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  }

  useEffect(() => {
  // Set default dates untuk today filter saat component mount
  const today = getTodayDateString()
  setDateFrom(today)
  setDateTo(today)
}, [])

  const getStatusColor = (status: RentalSession['status']) => {
    const statusColors = {
      active: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    }
    return statusColors[status] || statusColors.completed
  }

  const getStatusIcon = (status: RentalSession['status']) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4" />
      case 'completed':
        return <Square className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <Square className="w-4 h-4" />
    }
  }

  const getStatusText = (status: RentalSession['status']) => {
    const statusLabels = {
      active: 'Aktif',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    }
    return statusLabels[status] || status
  }

  const getBillingModelIcon = (model: RentalSession['billingModel']) => {
    switch (model) {
      case 'timer':
        return <Timer className="w-4 h-4" />
      case 'hourly':
        return <Clock className="w-4 h-4" />
      case 'package':
        return <Package className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getBillingModelText = (model: RentalSession['billingModel']) => {
    const modelLabels = {
      timer: 'Timer',
      hourly: 'Hourly',
      package: 'Package'
    }
    return modelLabels[model] || model
  }

  const getBillingModelColor = (model: RentalSession['billingModel']) => {
    const modelColors = {
      timer: 'bg-purple-100 text-purple-800 border-purple-200',
      hourly: 'bg-blue-100 text-blue-800 border-blue-200',
      package: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return modelColors[model] || modelColors.timer
  }

  // ===== API CALLS =====
  const fetchSessions = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString()
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (dateFilter !== 'all' && dateFrom) {
        params.append('dateFrom', dateFrom)
        if (dateTo) {
          params.append('dateTo', dateTo)
        }
      }

      const response = await fetch(`/api/rentals/history?${params}`, {
        headers: {
          'X-Location-ID': locationId
        }
      })

      const data: SessionHistoryResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch session history')
      }

      if (append) {
        setSessions(prev => [...prev, ...data.data])
      } else {
        setSessions(data.data)
      }

      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)
      setTotalSessions(data.pagination.total)

    } catch (error) {
      console.error('Error fetching session history:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch sessions')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [locationId, statusFilter, dateFilter, dateFrom, dateTo])

  const refreshSessions = () => {
    setCurrentPage(1)
    fetchSessions(1, false)
    onRefresh?.()
  }

  const loadMoreSessions = () => {
    if (currentPage < totalPages && !loadingMore) {
      fetchSessions(currentPage + 1, true)
    }
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value)
    setCurrentPage(1)
    
    // Set preset date ranges
    const today = getTodayDateString()
    switch (value) {
      case 'today':
        setDateFrom(today)
        setDateTo(today)
        break
      case 'week':
        setDateFrom(getWeekStartDate())
        setDateTo(today)
        break
      case 'month':
        setDateFrom(getMonthStartDate())
        setDateTo(today)
        break
      case 'custom':
        // Keep existing custom dates or reset to today
        if (!dateFrom) setDateFrom(today)
        if (!dateTo) setDateTo(today)
        break
      case 'all':
      default:
        setDateFrom('')
        setDateTo('')
        break
    }
  }

  const handleCustomDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setDateFrom(value)
    } else {
      setDateTo(value)
    }
    setCurrentPage(1)
  }

  const handleViewFnbOrders = (sessionId: string) => {
    onViewFnbOrders?.(sessionId)
  }

  // ===== EFFECTS =====
  useEffect(() => {
    fetchSessions(1, false)
  }, [fetchSessions])

  // ===== RENDER HELPERS =====
  const renderSessionCard = (session: RentalSession) => {
    return (
      <Card key={session.id} className="mb-4">
        <CardContent className="pt-4">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-lg">{session.unitName}</span>
                  <Badge className={cn("text-xs", getStatusColor(session.status))}>
                    {getStatusIcon(session.status)}
                    <span className="ml-1">{getStatusText(session.status)}</span>
                  </Badge>
                </div>
                {session.customerName && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <User className="w-4 h-4 mr-1" />
                    {session.customerName}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-bold text-lg text-green-600">
                {formatCurrency(session.totalAmount)}
              </div>
              <Badge className={cn("text-xs mt-1", getBillingModelColor(session.billingModel))}>
                {getBillingModelIcon(session.billingModel)}
                <span className="ml-1">{getBillingModelText(session.billingModel)}</span>
              </Badge>
            </div>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Mulai:</span>
              <div className="font-medium">
                {formatDate(session.startTime)} {formatTime(session.startTime)}
              </div>
            </div>
            {session.endTime && (
              <div>
                <span className="text-gray-500">Selesai:</span>
                <div className="font-medium">
                  {formatDate(session.endTime)} {formatTime(session.endTime)}
                </div>
              </div>
            )}
            {session.duration && (
              <div>
                <span className="text-gray-500">Durasi:</span>
                <div className="font-medium">{formatDuration(session.duration)}</div>
              </div>
            )}
            <div>
              <span className="text-gray-500">Waktu Dibeli:</span>
              <div className="font-medium">{formatDuration(session.purchasedDuration)}</div>
            </div>
            {session.extendedDuration > 0 && (
              <div>
                <span className="text-gray-500">Perpanjangan:</span>
                <div className="font-medium">{formatDuration(session.extendedDuration)}</div>
              </div>
            )}
          </div>

          {/* F&B Orders Info */}
          {session.hasFnbOrders && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Coffee className="w-4 h-4 mr-1" />
                  <span>{session.fnbOrdersCount} F&B Order(s)</span>
                  <span className="ml-2 font-medium text-green-600">
                    {formatCurrency(session.fnbOrdersTotal)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewFnbOrders(session.id)}
                  className="text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Lihat F&B
                </Button>
              </div>
            </div>
          )}

          {/* Notes - Remove since not in schema */}
          {session.notes && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-gray-500 text-sm">Catatan:</span>
              <p className="text-sm mt-1">{session.notes}</p>
            </div>
          )}

          {/* Staff Info */}
          {session.createdByName && (
            <div className="mt-2 text-xs text-gray-500">
              Dibuat oleh: {session.createdByName}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ===== GROUP BY DATE =====
  const groupSessionsByDate = (sessions: RentalSession[]) => {
    const grouped: { [key: string]: RentalSession[] } = {}
    
    sessions.forEach(session => {
      const dateKey = formatDate(session.startTime)
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(session)
    })
    
    return grouped
  }

  const groupedSessions = groupSessionsByDate(sessions)
  const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
    return new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime()
  })

  // ===== RENDER =====
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <History className="w-5 h-5 mr-2" />
              Session History
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{totalSessions} total</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshSessions}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-3 pt-2 flex-wrap gap-2">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tanggal</SelectItem>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="dateFrom" className="text-sm text-gray-500">Dari:</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleCustomDateChange('from', e.target.value)}
                    className="w-36 h-8"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="dateTo" className="text-sm text-gray-500">Sampai:</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleCustomDateChange('to', e.target.value)}
                    className="w-36 h-8"
                  />
                </div>
              </>
            )}
            
            <div className="text-sm text-gray-500">
              Showing {sessions.length} of {totalSessions} sessions
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-600">Loading session history...</p>
            </div>
          ) : sessions.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {sortedDates.map(date => (
                  <div key={date}>
                    <div className="space-y-3">
                      {groupedSessions[date].map(session => renderSessionCard(session))}
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {currentPage < totalPages && (
                  <div className="text-center pt-4">
                    <Button 
                      variant="outline" 
                      onClick={loadMoreSessions}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${totalSessions - sessions.length} remaining)`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <CalendarX className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Found</h3>
              <p className="text-gray-600 mb-4">
                {statusFilter === 'all' && dateFilter === 'all'
                  ? 'Belum ada session rental di lokasi ini'
                  : 'Tidak ada session yang sesuai dengan filter yang dipilih'
                }
              </p>
              <Button 
                variant="outline" 
                onClick={refreshSessions}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}