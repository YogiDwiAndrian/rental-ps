// src/components/staff/create-fnb-order-dialog.tsx - ORIGINAL LAYOUT + MINIMAL FIXES
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Coffee, 
  Utensils, 
  Plus, 
  Minus,
  ShoppingCart,
  CreditCard, 
  Banknote, 
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Package,
  Clock,
  Timer,
  RefreshCw  // FIX: Add refresh icon
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================
// TYPES - ORIGINAL + FIX startTime
// ============================================

interface FnbItem {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  unitType: string
  categoryName: string
  isAvailable: boolean
}

interface FnbCategory {
  id: string
  name: string
  items: FnbItem[]
}

interface OrderItem {
  fnbItemId: string
  fnbItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  categoryName: string
  unitType: string
  maxQuantity: number
}

interface ActiveSession {
  id: string
  unitName: string
  customerName?: string
  startTime: string  // FIX: Add startTime field
}

// FIX: Add refreshSessions prop
interface CreateFnbOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: string
  activeSessions: ActiveSession[]
  onSuccess?: () => void
  refreshSessions?: () => Promise<void>  // FIX: Add refresh callback
}

interface OrderFormData {
  items: OrderItem[]
  attachToSession: boolean
  selectedSessionId: string
  paymentTiming: 'immediate' | 'end_of_session'
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  notes: string
}

// ============================================
// UTILS - ORIGINAL
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase()
  if (name.includes('drink') || name.includes('beverage') || name.includes('minuman')) {
    return <Coffee className="w-4 h-4 text-blue-600" />
  }
  if (name.includes('food') || name.includes('makanan') || name.includes('main')) {
    return <Utensils className="w-4 h-4 text-orange-600" />
  }
  return <Package className="w-4 h-4 text-green-600" />
}

// ============================================
// COMPONENT - ORIGINAL LAYOUT + FIX refresh
// ============================================

export function CreateFnbOrderDialog({
  open,
  onOpenChange,
  locationId,
  activeSessions,
  refreshSessions,  // FIX: Accept refresh callback
  onSuccess
}: CreateFnbOrderDialogProps) {
  const [categories, setCategories] = useState<FnbCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [refreshingSessions, setRefreshingSessions] = useState(false)  // FIX: Add loading state
  
  const [formData, setFormData] = useState<OrderFormData>({
    items: [],
    attachToSession: false,
    selectedSessionId: '',
    paymentTiming: 'immediate',
    paymentMethod: 'cash',
    notes: ''
  })

  // ============================================
  // DATA FETCHING - ORIGINAL + FIX refresh
  // ============================================

  const fetchFnbItems = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/dashboard/locations/${locationId}/fnb-items`, {
        headers: {
          'X-Location-ID': locationId
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch F&B items: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories || [])
        setSelectedCategory('all')
      } else {
        throw new Error(data.error || 'Failed to load F&B items')
      }
    } catch (err) {
      console.error('Error fetching F&B items:', err)
      toast.error('Failed to load F&B items')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  // FIX: Add refresh sessions function
  const handleRefreshSessions = async () => {
    if (!refreshSessions) return
    
    try {
      setRefreshingSessions(true)
      await refreshSessions()
      toast.success('Sessions refreshed')
    } catch (error) {
      console.error('Error refreshing sessions:', error)
      toast.error('Failed to refresh sessions')
    } finally {
      setRefreshingSessions(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchFnbItems()
      // FIX: Auto-refresh sessions when dialog opens
      if (refreshSessions) {
        handleRefreshSessions()
      }
    }
  }, [open, fetchFnbItems, refreshSessions])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        items: [],
        attachToSession: false,
        selectedSessionId: '',
        paymentTiming: 'immediate',
        paymentMethod: 'cash',
        notes: ''
      })
      setSelectedCategory('')
    }
  }, [open])

  // ============================================
  // FORM ACTIONS - ORIGINAL
  // ============================================

  const addItemToOrder = (fnbItem: FnbItem) => {
    const existingItem = formData.items.find(item => item.fnbItemId === fnbItem.id)
    
    if (existingItem) {
      if (existingItem.quantity >= fnbItem.stockQuantity) {
        toast.error(`Maximum available: ${fnbItem.stockQuantity} ${fnbItem.unitType}`)
        return
      }
      
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.fnbItemId === fnbItem.id
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        )
      }))
    } else {
      const newOrderItem: OrderItem = {
        fnbItemId: fnbItem.id,
        fnbItemName: fnbItem.name,
        quantity: 1,
        unitPrice: fnbItem.price,
        totalPrice: fnbItem.price,
        categoryName: fnbItem.categoryName,
        unitType: fnbItem.unitType,
        maxQuantity: fnbItem.stockQuantity
      }
      
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newOrderItem]
      }))
    }
  }

  const updateItemQuantity = (fnbItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(fnbItemId)
      return
    }

    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.fnbItemId === fnbItemId) {
          if (newQuantity > item.maxQuantity) {
            toast.error(`Maximum available: ${item.maxQuantity} ${item.unitType}`)
            return item
          }
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: newQuantity * item.unitPrice
          }
        }
        return item
      })
      
      return { ...prev, items: updatedItems }
    })
  }

  const removeItemFromOrder = (fnbItemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.fnbItemId !== fnbItemId)
    }))
  }

  // ============================================
  // CALCULATIONS - ORIGINAL
  // ============================================

  const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalItems = formData.items.reduce((sum, item) => sum + item.quantity, 0)

  // ============================================
  // FORM HANDLERS - ORIGINAL + FIX camelCase
  // ============================================

  const handleSubmitOrder = async () => {
    // Validation
    if (formData.items.length === 0) {
      toast.error('Please add at least one item to the order')
      return
    }

    if (formData.attachToSession && !formData.selectedSessionId) {
      toast.error('Please select a session to attach this order')
      return
    }

    try {
      setSubmitting(true)

      // FIX: Use camelCase field names
      const requestBody = {
        items: formData.items.map(item => ({
          fnbItemId: item.fnbItemId,
          quantity: item.quantity
        })),
        rentalSessionId: formData.attachToSession ? formData.selectedSessionId : undefined,
        paymentTiming: formData.paymentTiming,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim() || undefined
      }

      const response = await fetch(`/api/fnb/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Location-ID': locationId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create F&B order')
      }

      toast.success('F&B order created successfully!')
      onSuccess?.()
      onOpenChange(false)

    } catch (err) {
      console.error('Error creating F&B order:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create F&B order')
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================
  // FILTER ITEMS - ORIGINAL
  // ============================================

  const filteredItems = selectedCategory === 'all' || selectedCategory === '' 
    ? categories.flatMap(cat => cat.items)
    : categories.find(cat => cat.id === selectedCategory)?.items || []

  const availableCategories = categories.filter(cat => cat.items.length > 0)

  // ============================================
  // RENDER - ORIGINAL LAYOUT + FIX refresh button
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create F&B Order</DialogTitle>
          <DialogDescription>
            Add items to create a new F&B order. You can attach it to an active rental session or process it standalone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
          {/* Left: F&B Items */}
          <div className="md:col-span-2 space-y-4">
            {/* Category Filter */}
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center">
                        {getCategoryIcon(category.name)}
                        <span className="ml-2">{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items Grid */}
            <ScrollArea className="h-64">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading F&B items...</p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">No items available</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-gray-50",
                        !item.isAvailable && "opacity-50"
                      )}
                      onClick={() => item.isAvailable && addItemToOrder(item)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{item.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {item.categoryName}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-medium text-blue-600">
                                {formatCurrency(item.price)}
                              </span>
                              <span className="text-xs text-gray-500">
                                Stock: {item.stockQuantity} {item.unitType}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            {item.isAvailable ? (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Plus className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Order Summary & Options */}
          <div className="space-y-4">
            {/* Order Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.items.length === 0 ? (
                  <div className="text-center py-4">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">No items added</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {formData.items.map((item) => (
                          <div key={item.fnbItemId} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <div className="font-medium">{item.fnbItemName}</div>
                              <div className="text-xs text-gray-600">
                                {formatCurrency(item.unitPrice)} × {item.quantity}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => updateItemQuantity(item.fnbItemId, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.fnbItemId, parseInt(e.target.value) || 0)}
                                className="h-6 w-12 text-center p-0 text-xs"
                                min="1"
                                max={item.maxQuantity}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => updateItemQuantity(item.fnbItemId, item.quantity + 1)}
                                disabled={item.quantity >= item.maxQuantity}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Items:</span>
                        <span className="text-sm font-medium">{totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Amount:</span>
                        <span className="text-sm font-bold">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Order Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Attach to Session */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="attachToSession"
                      checked={formData.attachToSession}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        attachToSession: checked as boolean,
                        paymentTiming: (checked as boolean) ? 'end_of_session' : 'immediate'
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="attachToSession" className="text-sm">
                      Attach to rental session
                    </Label>
                  </div>

                  {formData.attachToSession && (
                    <div className="space-y-3">
                      <div>
                        {/* FIX: Add refresh button */}
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">Select Session</Label>
                          {refreshSessions && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2"
                              onClick={handleRefreshSessions}
                              disabled={refreshingSessions}
                            >
                              <RefreshCw className={cn("w-3 h-3", refreshingSessions && "animate-spin")} />
                            </Button>
                          )}
                        </div>
                        <Select 
                          value={formData.selectedSessionId} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, selectedSessionId: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Choose session" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeSessions.length === 0 ? (
                              <SelectItem value="no-sessions" disabled>
                                No active sessions available
                              </SelectItem>
                            ) : (
                              activeSessions.map((session) => (
                                <SelectItem key={session.id} value={session.id}>
                                  <div className="flex items-center space-x-2">
                                    <Timer className="w-3 h-3" />
                                    <span>{session.unitName}</span>
                                    {session.customerName && (
                                      <span className="text-xs text-gray-500">
                                        ({session.customerName})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Timing */}
                <div>
                  <Label className="text-sm">Payment Timing</Label>
                  <Select 
                    value={formData.paymentTiming} 
                    onValueChange={(value: 'immediate' | 'end_of_session') => 
                      setFormData(prev => ({ ...prev, paymentTiming: value }))
                    }
                    disabled={formData.attachToSession}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-2" />
                          Pay Now
                        </div>
                      </SelectItem>
                      <SelectItem value="end_of_session">
                        <div className="flex items-center">
                          <Timer className="w-3 h-3 mr-2" />
                          Pay with Session
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div>
                  <Label className="text-sm">Payment Method</Label>
                  <Select 
                    value={formData.paymentMethod} 
                    onValueChange={(value: 'cash' | 'card' | 'digital_wallet') => 
                      setFormData(prev => ({ ...prev, paymentMethod: value }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center">
                          <Banknote className="w-3 h-3 mr-2" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center">
                          <CreditCard className="w-3 h-3 mr-2" />
                          Card
                        </div>
                      </SelectItem>
                      <SelectItem value="digital_wallet">
                        <div className="flex items-center">
                          <Smartphone className="w-3 h-3 mr-2" />
                          Digital Wallet
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-sm">Notes (Optional)</Label>
                  <Textarea
                    placeholder="Special requests or notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="h-16 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitOrder}
            disabled={submitting || formData.items.length === 0}
            className="min-w-[120px]"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Create Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}