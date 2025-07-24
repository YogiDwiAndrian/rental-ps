'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  MessageCircle, 
  X, 
  User, 
  Clock, 
  Phone, 
  Crown,
  Headphones,
  Shield,
  UserCog,
  Coffee
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppContact {
  name: string
  role: 'owner' | 'staff' | 'manager' | 'custom'
  number: string
  isOnline?: boolean
  responseTime?: string
  currentAvailability?: string
}

interface FloatingWhatsAppProps {
  contacts: WhatsAppContact[]
  locationName: string
}

// Helper function to check if current time is within working hours
function isCurrentlyAvailable(contact: WhatsAppContact): boolean {
  // Owner is always available (24/7 for emergencies)
  if (contact.role === 'owner') {
    return true
  }
  
  // For now, use the isOnline property from API
  // In the future, this can be enhanced with actual schedule checking
  return contact.isOnline || false
}

// Helper function to get availability status
function getAvailabilityStatus(contact: WhatsAppContact): {
  status: 'available' | 'busy' | 'offline'
  message: string
  icon: React.ReactNode
  color: string
} {
  if (contact.role === 'owner') {
    return {
      status: 'available',
      message: 'Always Available',
      icon: <Crown className="w-3 h-3" />,
      color: 'text-yellow-600'
    }
  }

  const isAvailable = isCurrentlyAvailable(contact)
  
  if (isAvailable) {
    return {
      status: 'available',
      message: contact.currentAvailability || `Usually replies in ${contact.responseTime || '10 minutes'}`,
      icon: <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />,
      color: 'text-green-600'
    }
  }

  return {
    status: 'offline',
    message: contact.currentAvailability || 'Currently offline',
    icon: <div className="w-3 h-3 bg-gray-400 rounded-full" />,
    color: 'text-gray-500'
  }
}

// Helper function to get role info
function getRoleInfo(role: string) {
  switch (role) {
    case 'owner':
      return {
        icon: <Crown className="w-4 h-4" />,
        label: 'Owner',
        description: 'For important matters & complaints',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      }
    case 'manager':
      return {
        icon: <UserCog className="w-4 h-4" />,
        label: 'Manager',
        description: 'For booking & general inquiries',
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      }
    case 'staff':
      return {
        icon: <Headphones className="w-4 h-4" />,
        label: 'Staff',
        description: 'For gaming help & quick questions',
        color: 'bg-green-100 text-green-800 border-green-200'
      }
    default:
      return {
        icon: <User className="w-4 h-4" />,
        label: 'Support',
        description: 'For general assistance',
        color: 'bg-gray-100 text-gray-800 border-gray-200'
      }
  }
}

export function FloatingWhatsApp({ contacts, locationName }: FloatingWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Show after a delay to ensure page is loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Auto close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-floating-whatsapp]')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const handleContactWhatsApp = (contact: WhatsAppContact) => {
    const availabilityStatus = getAvailabilityStatus(contact)
    const roleInfo = getRoleInfo(contact.role)
    
    let message = `Hi ${contact.name}! 👋\n\nSaya tertarik untuk bermain di ${locationName}.\n\n`
    
    // Customize message based on role
    if (contact.role === 'owner') {
      message += `Apakah ada unit PlayStation yang tersedia sekarang?\n\nTerima kasih! 🎮`
    } else {
      message += `Apakah ada unit PlayStation yang tersedia sekarang? Atau bisa bantu info tentang game yang tersedia?\n\nTerima kasih! 🎮`
    }
    
    const encodedMessage = encodeURIComponent(message)
    const cleanNumber = contact.number.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, '_blank')
    setIsOpen(false)
  }

  if (!isVisible || contacts.length === 0) return null

  // Separate and sort contacts
  const owners = contacts.filter(c => c.role === 'owner')
  const managers = contacts.filter(c => c.role === 'manager')
  const availableStaff = contacts.filter(c => 
    (c.role === 'staff' || c.role === 'custom') && isCurrentlyAvailable(c)
  )
  const offlineStaff = contacts.filter(c => 
    (c.role === 'staff' || c.role === 'custom') && !isCurrentlyAvailable(c)
  )

  // Sort each group
  const sortedOwners = owners.sort((a, b) => a.name.localeCompare(b.name))
  const sortedManagers = managers.sort((a, b) => a.name.localeCompare(b.name))
  const sortedAvailableStaff = availableStaff.sort((a, b) => a.name.localeCompare(b.name))
  const sortedOfflineStaff = offlineStaff.sort((a, b) => a.name.localeCompare(b.name))

  // Count available contacts for badge
  const availableCount = sortedOwners.length + sortedManagers.length + sortedAvailableStaff.length
  const totalCount = contacts.length

  return (
    <div 
      className="fixed bottom-6 right-6 z-50" 
      data-floating-whatsapp
      style={{ zIndex: 9999 }}
    >
      {/* Enhanced Contact List */}
      {isOpen && (
        <div className="mb-4 w-96 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-2xl border-2 border-green-200 bg-white max-h-[80vh] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-lg font-bold">💬 Contact Us</CardTitle>
                  <p className="text-green-100 text-sm">Choose the best contact for your needs</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                
                {/* Available Staff Section - Priority */}
                {sortedAvailableStaff.length > 0 && (
                  <div>
                    <div className="bg-green-50 px-4 py-2 border-b border-green-100">
                      <div className="flex items-center gap-2">
                        <Headphones className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">🟢 Available Now</span>
                        <Badge className="bg-green-500 text-white text-xs">
                          Quick Response
                        </Badge>
                      </div>
                      <p className="text-xs text-green-700 mt-1">For gaming help & quick questions</p>
                    </div>
                    
                    {sortedAvailableStaff.map((contact, index) => {
                      const availabilityStatus = getAvailabilityStatus(contact)
                      const roleInfo = getRoleInfo(contact.role)
                      
                      return (
                        <button
                          key={`available-${index}`}
                          onClick={() => handleContactWhatsApp(contact)}
                          className="w-full p-4 text-left hover:bg-green-50 transition-all duration-200 group border-b border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-green-600" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">{contact.name}</span>
                                <Badge className={roleInfo.color}>
                                  {roleInfo.icon}
                                  <span className="ml-1">{roleInfo.label}</span>
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600">{contact.number}</span>
                              </div>
                              <p className="text-xs text-green-600 flex items-center gap-1">
                                {availabilityStatus.icon}
                                {availabilityStatus.message}
                              </p>
                            </div>
                            <MessageCircle className="w-6 h-6 text-green-600 group-hover:text-green-700 transition-colors" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Managers Section */}
                {sortedManagers.length > 0 && (
                  <div>
                    {sortedAvailableStaff.length > 0 && <Separator />}
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">👔 Management</span>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">For booking & general inquiries</p>
                    </div>
                    
                    {sortedManagers.map((contact, index) => {
                      const availabilityStatus = getAvailabilityStatus(contact)
                      const roleInfo = getRoleInfo(contact.role)
                      
                      return (
                        <button
                          key={`manager-${index}`}
                          onClick={() => handleContactWhatsApp(contact)}
                          className="w-full p-4 text-left hover:bg-blue-50 transition-all duration-200 group border-b border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <UserCog className="w-6 h-6 text-blue-600" />
                              </div>
                              {isCurrentlyAvailable(contact) && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">{contact.name}</span>
                                <Badge className={roleInfo.color}>
                                  {roleInfo.icon}
                                  <span className="ml-1">{roleInfo.label}</span>
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600">{contact.number}</span>
                              </div>
                              <p className={`text-xs flex items-center gap-1 ${availabilityStatus.color}`}>
                                {availabilityStatus.icon}
                                {availabilityStatus.message}
                              </p>
                            </div>
                            <MessageCircle className="w-6 h-6 text-blue-600 group-hover:text-blue-700 transition-colors" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Owner Section - Always Available */}
                {sortedOwners.length > 0 && (
                  <div>
                    {(sortedAvailableStaff.length > 0 || sortedManagers.length > 0) && <Separator />}
                    <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-semibold text-yellow-800">👑 Owner</span>
                        <Badge className="bg-yellow-500 text-white text-xs">
                          24/7 Available
                        </Badge>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">For important matters & complaints</p>
                    </div>
                    
                    {sortedOwners.map((contact, index) => {
                      const roleInfo = getRoleInfo(contact.role)
                      
                      return (
                        <button
                          key={`owner-${index}`}
                          onClick={() => handleContactWhatsApp(contact)}
                          className="w-full p-4 text-left hover:bg-yellow-50 transition-all duration-200 group border-b border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center border-2 border-yellow-200">
                                <Crown className="w-6 h-6 text-yellow-600" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 border-2 border-white rounded-full">
                                <Crown className="w-2 h-2 text-white" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">{contact.name}</span>
                                <Badge className={roleInfo.color}>
                                  {roleInfo.icon}
                                  <span className="ml-1">{roleInfo.label}</span>
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600">{contact.number}</span>
                              </div>
                              <p className="text-xs text-yellow-600 flex items-center gap-1 font-medium">
                                <Crown className="w-3 h-3" />
                                Always Available
                              </p>
                            </div>
                            <MessageCircle className="w-6 h-6 text-yellow-600 group-hover:text-yellow-700 transition-colors" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Offline Staff Section */}
                {sortedOfflineStaff.length > 0 && (
                  <div>
                    <Separator />
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-600">💤 Currently Offline</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">May respond later</p>
                    </div>
                    
                    {sortedOfflineStaff.map((contact, index) => {
                      const availabilityStatus = getAvailabilityStatus(contact)
                      const roleInfo = getRoleInfo(contact.role)
                      
                      return (
                        <button
                          key={`offline-${index}`}
                          onClick={() => handleContactWhatsApp(contact)}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-all duration-200 group border-b border-gray-100 opacity-75"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-500" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-700">{contact.name}</span>
                                <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                                  {roleInfo.icon}
                                  <span className="ml-1">{roleInfo.label}</span>
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{contact.number}</span>
                              </div>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                {availabilityStatus.icon}
                                {availabilityStatus.message}
                              </p>
                            </div>
                            <MessageCircle className="w-6 h-6 text-gray-500 group-hover:text-gray-600 transition-colors" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Footer Tips */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-t">
                <p className="text-xs text-gray-600 text-center mb-2">
                  💡 <strong>Quick Tips:</strong>
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• <strong>Staff (🟢):</strong> Best for game questions & quick help</p>
                  <p>• <strong>Owner (👑):</strong> Always available for important matters</p>
                  <p>• <strong>Response times vary</strong> based on availability</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl transition-all duration-300 relative group",
          isOpen && "bg-green-600 scale-105"
        )}
        style={{ 
          filter: 'drop-shadow(0 8px 16px rgba(34, 197, 94, 0.3))',
        }}
      >
        <div className="relative">
          <MessageCircle className="w-7 h-7 text-white" />
          
          {/* Enhanced Badge */}
          <Badge className="absolute -top-4 -right-4 h-8 w-8 p-0 bg-red-500 text-white text-xs flex items-center justify-center border-2 border-white rounded-full">
            <div className="text-center">
              <div className="text-xs font-bold">{availableCount}</div>
              <div className="text-[8px] leading-none">online</div>
            </div>
          </Badge>
          
          {/* Total contacts indicator */}
          {totalCount > availableCount && (
            <Badge className="absolute -bottom-3 -left-3 h-5 w-5 p-0 bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white rounded-full">
              {totalCount - availableCount}
            </Badge>
          )}
        </div>
        
        {/* Pulse animations - only when not open */}
        {!isOpen && (
          <>
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-green-300 animate-pulse opacity-50"></div>
          </>
        )}
      </Button>

      {/* Enhanced Tooltip */}
      {!isOpen && (
        <div className="absolute bottom-20 right-0 bg-black/80 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          💬 Chat with us on WhatsApp
          <div className="text-center mt-1">
            <span className="text-green-300 font-bold">{availableCount} available</span>
            {totalCount > availableCount && (
              <span className="text-gray-300"> • {totalCount - availableCount} offline</span>
            )}
          </div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"></div>
        </div>
      )}
    </div>
  )
}