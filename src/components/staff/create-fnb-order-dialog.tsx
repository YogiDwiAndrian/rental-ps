// src/components/staff/create-fnb-order-dialog.tsx - ORIGINAL + MINIMAL FIXES
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  RefreshCw // ADD: Only add this icon
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================
// TYPES - ORIGINAL + ADD refreshSessions prop
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
  startTime: string
}

interface CreateFnbOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: string
  activeSessions: ActiveSession[]
  onSuccess?: () => void
  refreshSessions?: () => Promise<void> // ADD: Only add this prop
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
// UTILS - ORIGINAL UNCHANGED
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
// COMPONENT - ORIGINAL + ADD refreshSessions support
// ============================================

export function CreateFnbOrderDialog({
  open,
  onOpenChange,
  locationId,
  activeSessions,
  refreshSessions, // ADD: Optional prop
  onSuccess
}: CreateFnbOrderDialogProps) {
  const [categories, setCategories] = useState<FnbCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [refreshingSessions, setRefreshingSessions] = useState(false) // ADD: Loading state
  
  const [formData, setFormData] = useState<OrderFormData>({
    items: [],
    attachToSession: false,
    selectedSessionId: '',
    paymentTiming: 'immediate',
    paymentMethod: 'cash',
    notes: ''
  })

  // ============================================
  // DATA FETCHING - ORIGINAL + ADD auto refresh
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
        // Set 'all' to show all categories by default
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

  // ADD: Function to refresh sessions
  const handleRefreshSessions = async () => {
    if (!refreshSessions) return
    
    try {
      setRefreshingSessions(true)
      await refreshSessions()
    } catch (error) {
      console.error('Error refreshing sessions:', error)
    } finally {
      setRefreshingSessions(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchFnbItems()
      // ADD: Auto-refresh sessions when dialog opens
      if (refreshSessions) {
        handleRefreshSessions()
      }
    }
  }, [open, fetchFnbItems])

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
      setSelectedCategory('all')
    }
  }, [open])

  // ============================================
  // ITEM MANAGEMENT - ORIGINAL UNCHANGED
  // ============================================

  const addItemToOrder = (item: FnbItem) => {
    if (!item.isAvailable || item.stockQuantity <= 0) {
      toast.error(`${item.name} is not available`)
      return
    }

    setFormData(prev => {
      const existingItemIndex = prev.items.findIndex(orderItem => orderItem.fnbItemId === item.id)
      
      if (existingItemIndex >= 0) {
        // Item already exists, increase quantity
        const existingItem = prev.items[existingItemIndex]
        const newQuantity = existingItem.quantity + 1
        
        if (newQuantity > item.stockQuantity) {
          toast.error(`Maximum available: ${item.stockQuantity} ${item.unitType}`)
          return prev
        }
        
        const updatedItems = [...prev.items]
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          totalPrice: newQuantity * existingItem.unitPrice
        }
        
        return { ...prev, items: updatedItems }
      } else {
        // New item, add to cart
        const newOrderItem: OrderItem = {
          fnbItemId: item.id,
          fnbItemName: item.name,
          quantity: 1,
          unitPrice: item.price,
          totalPrice: item.price,
          categoryName: item.categoryName,
          unitType: item.unitType,
          maxQuantity: item.stockQuantity
        }
        
        return { ...prev, items: [...prev.items, newOrderItem] }
      }
    })
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
  // CALCULATIONS - ORIGINAL UNCHANGED
  // ============================================

  const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalItems = formData.items.reduce((sum, item) => sum + item.quantity, 0)

  // ============================================
  // FORM HANDLERS - FIX: Use camelCase field names
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

      // FIX: Use camelCase field names that backend expects
      const requestBody = {
        items: formData.items.map(item => ({
          fnbItemId: item.fnbItemId, // FIX: Use camelCase
          quantity: item.quantity
        })),
        rentalSessionId: formData.attachToSession ? formData.selectedSessionId : undefined, // FIX: Use camelCase
        paymentTiming: formData.paymentTiming, // FIX: Use camelCase
        paymentMethod: formData.paymentMethod, // FIX: Use camelCase
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
  // RENDER HELPERS - ORIGINAL UNCHANGED
  // ============================================

  // Get items to display - all items if 'all' selected, filtered if specific category selected
  const availableItems = selectedCategory === 'all' || selectedCategory === ''
    ? categories.reduce((allItems: FnbItem[], category) => {
        const categoryItems = category.items.filter(item => item.isAvailable && item.stockQuantity > 0)
        return [...allItems, ...categoryItems]
      }, [])
    : (categories.find(cat => cat.id === selectedCategory)?.items.filter(item => item.isAvailable && item.stockQuantity > 0) || [])

  const getPaymentTimingInfo = () => {
    if (formData.attachToSession) {
      return formData.paymentTiming === 'immediate' 
        ? 'Payment will be processed now'
        : 'Payment will be added to session bill'
    }
    return 'Standalone order - payment required now'
  }

  // ============================================
  // RENDER - ORIGINAL + ADD refresh button only
  // ============================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl h-[95vh] md:h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 md:p-6 pb-4 border-b">
          <DialogTitle className="flex items-center text-lg md:text-xl">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Create F&B Order
          </DialogTitle>
          <DialogDescription className="text-sm">
            Add food & beverage items to create a new order
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Area - ORIGINAL UNCHANGED */}
        <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="h-full flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
            
            {/* Left Panel - F&B Items - ORIGINAL UNCHANGED */}
            <div className="lg:col-span-2 flex flex-col space-y-4 order-1 lg:order-1">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        All Categories
                      </div>
                    </SelectItem>
                    {categories.map((category) => (
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

              {/* F&B Items Grid */}
              <div className="flex-1 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="text-center">
                      <Package className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Loading F&B items...</p>
                    </div>
                  </div>
                ) : availableItems.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        {selectedCategory !== 'all' && selectedCategory ? 'No items available in this category' : 'No F&B items available'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] lg:h-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableItems.map((item) => {
                        const orderItem = formData.items.find(oi => oi.fnbItemId === item.id)
                        const isInCart = !!orderItem
                        
                        return (
                          <Card 
                            key={item.id} 
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              isInCart && "ring-2 ring-green-500 bg-green-50"
                            )}
                            onClick={() => addItemToOrder(item)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                  {item.description && (
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-bold text-green-600">
                                      {formatCurrency(item.price)}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {item.stockQuantity} {item.unitType}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {isInCart && (
                                  <div className="ml-2 flex items-center">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Right Panel - Order Summary & Settings - ORIGINAL + ADD refresh button */}
            <div className="flex flex-col min-h-0 order-2 lg:order-2">
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3 md:space-y-4 pr-2 pb-6">
                  
                  {/* Order Items - ORIGINAL UNCHANGED */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Order ({totalItems} items)
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(totalAmount)}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {formData.items.length > 0 ? (
                        <div className="space-y-2">
                          <div className="max-h-[120px] md:max-h-[150px] overflow-y-auto border rounded">
                            <div className="space-y-2 p-2">
                              {formData.items.map((item) => (
                                <div key={item.fnbItemId} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{item.fnbItemName}</p>
                                    <p className="text-xs text-gray-600">
                                      {formatCurrency(item.unitPrice)} × {item.quantity}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1 ml-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 hover:bg-gray-200"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        updateItemQuantity(item.fnbItemId, item.quantity - 1)
                                      }}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 hover:bg-gray-200"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        updateItemQuantity(item.fnbItemId, item.quantity + 1)
                                      }}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Cart is empty</p>
                          <p className="text-xs">Click items to add them</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Session & Payment Settings - ORIGINAL + ADD refresh button */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Order Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* Attach to Session */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="attachToSession"
                            checked={formData.attachToSession}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              attachToSession: e.target.checked,
                              paymentTiming: e.target.checked ? 'end_of_session' : 'immediate'
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
                              {/* ADD: Refresh button */}
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
                                    <div className="p-2 text-sm text-gray-500">
                                      No active sessions
                                    </div>
                                  ) : (
                                    activeSessions.map((session) => (
                                      <SelectItem key={session.id} value={session.id}>
                                        <div className="flex items-center">
                                          <Timer className="w-3 h-3 mr-2" />
                                          <span className="truncate">{session.unitName}</span>
                                          {session.customerName && (
                                            <span className="ml-1 text-gray-600 truncate">• {session.customerName}</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Payment Timing */}
                            <div>
                              <Label className="text-sm">Payment Timing</Label>
                              <Select 
                                value={formData.paymentTiming} 
                                onValueChange={(value: 'immediate' | 'end_of_session') => 
                                  setFormData(prev => ({ ...prev, paymentTiming: value }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="immediate">Pay Now</SelectItem>
                                  <SelectItem value="end_of_session">Pay at Session End</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500 mt-1">
                                {getPaymentTimingInfo()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment Method - ORIGINAL UNCHANGED */}
                      {(!formData.attachToSession || formData.paymentTiming === 'immediate') && (
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
                                  <Banknote className="w-4 h-4 mr-2" />
                                  Cash
                                </div>
                              </SelectItem>
                              <SelectItem value="card">
                                <div className="flex items-center">
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Card
                                </div>
                              </SelectItem>
                              <SelectItem value="digital_wallet">
                                <div className="flex items-center">
                                  <Smartphone className="w-4 h-4 mr-2" />
                                  Digital Wallet
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Notes - ORIGINAL UNCHANGED */}
                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          placeholder="Special instructions..."
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer - ORIGINAL UNCHANGED */}
        <DialogFooter className="border-t p-4 md:p-6 pt-4 bg-white">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitOrder}
              disabled={submitting || formData.items.length === 0}
              className="w-full sm:w-auto min-w-[120px] order-1 sm:order-2"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Create Order </span>
                  ({formatCurrency(totalAmount)})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}