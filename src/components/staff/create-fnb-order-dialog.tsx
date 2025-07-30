// src/components/staff/create-fnb-order-dialog.tsx - FIXED SIMPLE & COMPLETE
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Coffee, Utensils, Plus, Minus, ShoppingCart, CreditCard, Banknote, 
  Smartphone, CheckCircle2, Package, Clock, RefreshCw, X, Search, Trash2, User
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// TYPES
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

interface OrderFormData {
  items: OrderItem[]
  attachToSession: boolean
  selectedSessionId: string
  paymentTiming: 'immediate' | 'end_of_session'
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  notes: string
}

interface CreateFnbOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: string
  activeSessions: ActiveSession[]
  onSuccess?: () => void
  refreshSessions?: () => Promise<void>
}

// ============================================
// UTILITIES
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount)
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CreateFnbOrderDialog({
  open,
  onOpenChange,
  locationId,
  activeSessions,
  onSuccess,
  refreshSessions
}: CreateFnbOrderDialogProps) {
  // State
  const [categories, setCategories] = useState<FnbCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshingSessions, setRefreshingSessions] = useState(false)
  
  const [formData, setFormData] = useState<OrderFormData>({
    items: [],
    attachToSession: false,
    selectedSessionId: '',
    paymentTiming: 'immediate',
    paymentMethod: 'cash',
    notes: ''
  })

  // Data fetching
  const fetchFnbItems = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/locations/${locationId}/fnb-items`, {
        headers: { 'X-Location-ID': locationId }
      })

      if (!response.ok) throw new Error(`Failed to fetch F&B items: ${response.statusText}`)
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
      if (refreshSessions) handleRefreshSessions()
    }
  }, [open, fetchFnbItems])

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
      setSearchTerm('')
    }
  }, [open])

  // Form actions
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
      
      setFormData(prev => ({ ...prev, items: [...prev.items, newOrderItem] }))
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
          return { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
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

  const clearCart = () => {
    setFormData(prev => ({ ...prev, items: [] }))
  }

  // Calculations
  const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalItems = formData.items.reduce((sum, item) => sum + item.quantity, 0)

  // Filtering
  const filteredItems = (() => {
    let items = selectedCategory === 'all' 
      ? categories.flatMap(cat => cat.items)
      : categories.find(cat => cat.id === selectedCategory)?.items || []

    if (searchTerm.trim()) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return items.filter(item => item.isAvailable)
  })()

  const availableCategories = categories.filter(cat => cat.items.some(item => item.isAvailable))

  // Form submission
  const handleSubmitOrder = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">Create F&B Order</DialogTitle>
          <DialogDescription>
            Add items to create a new F&B order. You can attach it to an active rental session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* LEFT PANEL - MENU */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r">
            {/* Search & Filter */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex gap-3 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchFnbItems}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  <Package className="w-4 h-4 mr-2" />
                  All
                </Button>
                {availableCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name === 'Makanan' ? (
                      <Utensils className="w-4 h-4 mr-2" />
                    ) : (
                      <Coffee className="w-4 h-4 mr-2" />
                    )}
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Items Grid */}
            <ScrollArea className="flex-1 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-500">Loading items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Package className="w-12 h-12 mb-4" />
                  <p className="font-medium">No items available</p>
                  {searchTerm && <p className="text-sm">Try adjusting your search</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => {
                    const orderItem = formData.items.find(oi => oi.fnbItemId === item.id)
                    const isInCart = !!orderItem
                    
                    return (
                      <Card 
                        key={item.id} 
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          isInCart ? 'ring-2 ring-blue-500' : 'hover:scale-105'
                        }`}
                        onClick={() => addItemToOrder(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-sm leading-tight flex-1 pr-2">
                              {item.name}
                            </h4>
                            {isInCart && (
                              <Badge variant="default" className="text-sm">
                                {orderItem.quantity}
                              </Badge>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-blue-600">
                                {formatCurrency(item.price)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Stock: {item.stockQuantity} {item.unitType}
                              </p>
                            </div>
                            
                            <Button 
                              size="sm"
                              variant={isInCart ? "default" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation()
                                addItemToOrder(item)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* RIGHT PANEL - CART */}
          <div className="w-full lg:w-96 flex flex-col bg-gray-50">
            {/* Cart Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
                  <h3 className="font-semibold">Cart</h3>
                  {totalItems > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {totalItems}
                    </Badge>
                  )}
                </div>
                {formData.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-4">
              {formData.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <ShoppingCart className="w-8 h-8 mb-2" />
                  <p className="font-medium">Cart is empty</p>
                  <p className="text-sm">Add items from menu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.items.map((item) => (
                    <Card key={item.fnbItemId} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-2">
                          <h4 className="font-medium text-sm">{item.fnbItemName}</h4>
                          <p className="text-xs text-gray-600">{item.categoryName}</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {formatCurrency(item.totalPrice)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemFromOrder(item.fnbItemId)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => updateItemQuantity(item.fnbItemId, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => updateItemQuantity(item.fnbItemId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxQuantity}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(item.unitPrice)} each
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Order Options */}
            {formData.items.length > 0 && (
              <div className="p-4 border-t bg-white space-y-4">
                {/* Total */}
                <div className="flex justify-between items-center text-lg font-bold border-2 border-blue-200 bg-blue-50 p-3 rounded-lg">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(totalAmount)}</span>
                </div>

                {/* Session Attachment */}
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
                    />
                    <Label htmlFor="attachToSession" className="text-sm font-medium">
                      Attach to rental session
                    </Label>
                  </div>

                  {formData.attachToSession && (
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Select Session:</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshSessions}
                          disabled={refreshingSessions}
                          className="h-auto p-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${refreshingSessions ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      
                      <Select
                        value={formData.selectedSessionId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, selectedSessionId: value }))}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Choose session..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeSessions.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">
                              No active sessions found
                            </div>
                          ) : (
                            activeSessions.map((session) => (
                              <SelectItem key={session.id} value={session.id}>
                                <div className="flex items-center space-x-2">
                                  <User className="w-3 h-3" />
                                  <span>{session.unitName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-2 h-2 mr-1" />
                                    {formatDateTime(session.startTime)}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm">Payment Method:</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: 'cash' | 'card' | 'digital_wallet') => 
                      setFormData(prev => ({ ...prev, paymentMethod: value }))
                    }
                  >
                    <SelectTrigger className="text-sm">
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
                <div className="space-y-2">
                  <Label className="text-sm">Notes (Optional):</Label>
                  <Textarea
                    placeholder="Special requests..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="text-sm h-16 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmitOrder}
                    disabled={submitting || formData.items.length === 0}
                    className="flex-1"
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
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}