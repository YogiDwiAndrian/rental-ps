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
  Coffee,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppContact {
  name: string
  role: 'owner' | 'staff' | 'manager' | 'custom'
  number: string
  isOnline?: boolean
  responseTime?: string
  currentAvailability?: string
  // Enhanced availability from API
  availabilitySchedule?: {
    available24_7?: boolean
    workingHours?: Record<string, { start: string; end: string }>
    preferredHours?: string
    [key: string]: unknown
  }
}

interface FloatingWhatsAppProps {
  contacts: WhatsAppContact[]
  locationName: string
}

// Enhanced availability checker with working hours
function checkAvailabilityStatus(contact: WhatsAppContact): {
  isAvailable: boolean
  status: 'available' | 'busy' | 'offline' | 'owner_available'
  message: string
  nextAvailable?: string
  priority: number // Lower = higher priority
} {
  // Owner is always available (priority 1)
  if (contact.role === 'owner') {
    return {
      isAvailable: true,
      status: 'owner_available',
      message: 'Always Available (24/7)',
      priority: 1
    }
  }

  // Check if contact has 24/7 availability
  if (contact.availabilitySchedule?.available24_7) {
    return {
      isAvailable: true,
      status: 'available',
      message: 'Available 24/7',
      priority: 2
    }
  }

  // Check working hours
  if (contact.availabilitySchedule?.workingHours) {
    const now = new Date()
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}))
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = dayNames[jakartaTime.getDay()]
    const currentTime = jakartaTime.getHours() * 60 + jakartaTime.getMinutes()
    
    const todayHours = contact.availabilitySchedule.workingHours[currentDay]
    
    if (todayHours && todayHours.start && todayHours.end) {
      const [startHour, startMinute] = todayHours.start.split(':').map(Number)
      const [endHour, endMinute] = todayHours.end.split(':').map(Number)
      
      const startTime = startHour * 60 + startMinute
      let endTime = endHour * 60 + endMinute
      
      // Handle overnight shifts (e.g., 22:00 - 02:00)
      if (endTime < startTime) {
        endTime += 24 * 60
      }
      
      const isWithinHours = currentTime >= startTime && currentTime <= endTime
      
      if (isWithinHours) {
        return {
          isAvailable: true,
          status: 'available',
          message: `Online now (until ${todayHours.end})`,
          priority: contact.role === 'manager' ? 3 : 4
        }
      } else {   
        // Check if opening later today
        if (currentTime < startTime) {
          return {
            isAvailable: false,
            status: 'offline',
            message: `Available from ${todayHours.start} today`,
            nextAvailable: `${todayHours.start} today`,
            priority: contact.role === 'manager' ? 7 : 8
          }
        }
        
        // Find next working day
        for (let i = 1; i <= 7; i++) {
          const dayIndex = (jakartaTime.getDay() + i) % 7
          const checkDay = dayNames[dayIndex]
          const checkHours = contact.availabilitySchedule.workingHours![checkDay]
          
          if (checkHours && checkHours.start) {
            const dayName = i === 1 ? 'tomorrow' : checkDay
            return {
              isAvailable: false,
              status: 'offline',
              message: `Next available: ${checkHours.start} ${dayName}`,
              nextAvailable: `${checkHours.start} ${dayName}`,
              priority: contact.role === 'manager' ? 7 : 8
            }
          }
        }
      }
    }
  }

  // Fallback to API provided status
  if (contact.isOnline) {
    return {
      isAvailable: true,
      status: 'available',
      message: contact.currentAvailability || `Usually replies in ${contact.responseTime || '10 minutes'}`,
      priority: contact.role === 'manager' ? 5 : 6
    }
  }

  return {
    isAvailable: false,
    status: 'offline',
    message: 'Contact for availability',
    priority: 9
  }
}

// Enhanced role info with better descriptions
function getRoleInfo(role: string) {
  switch (role) {
    case 'owner':
      return {
        icon: <Crown className="w-4 h-4" />,
        label: 'Owner',
        description: 'For urgent matters, complaints & important decisions',
        color: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200',
        headerBg: 'bg-gradient-to-r from-yellow-500 to-orange-500'
      }
    case 'manager':
      return {
        icon: <UserCog className="w-4 h-4" />,
        label: 'Manager',
        description: 'For bookings, pricing & operational questions',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        headerBg: 'bg-blue-500'
      }
    case 'staff':
      return {
        icon: <Headphones className="w-4 h-4" />,
        label: 'Staff',
        description: 'For gaming help, units & quick questions',
        color: 'bg-green-100 text-green-800 border-green-200',
        headerBg: 'bg-green-500'
      }
    default:
      return {
        icon: <User className="w-4 h-4" />,
        label: 'Support',
        description: 'For general assistance',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        headerBg: 'bg-gray-500'
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
    const availabilityStatus = checkAvailabilityStatus(contact)
    const roleInfo = getRoleInfo(contact.role)
    
    let message = `Hi ${contact.name}! 👋\n\nSaya tertarik untuk bermain di ${locationName}.\n\n`
    
    // Customize message based on role and availability
    if (contact.role === 'owner') {
      message += `Apakah ada unit PlayStation yang tersedia sekarang?\n\n`
      if (!availabilityStatus.isAvailable) {
        message += `*Note: I understand you might be busy, but I wanted to reach out as this seemed important.*\n\n`
      }
      message += `Terima kasih! 🎮`
    } else if (contact.role === 'manager') {
      message += `Saya ingin bertanya tentang:\n• Ketersediaan unit PlayStation\n• Harga dan paket yang tersedia\n• Fasilitas yang ada\n\nTerima kasih! 🎮`
    } else {
      message += `Apakah ada unit PlayStation yang tersedia sekarang? Atau bisa bantu info tentang:\n• Game yang tersedia\n• Kondisi unit\n• Tips gaming\n\nTerima kasih! 🎮`
    }
    
    const encodedMessage = encodeURIComponent(message)
    const cleanNumber = contact.number.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, '_blank')
    setIsOpen(false)
  }

  if (!isVisible || contacts.length === 0) return null

  // Enhanced sorting: available contacts first, then by role priority
  const sortedContacts = [...contacts]
    .map(contact => ({
      contact,
      availability: checkAvailabilityStatus(contact),
      roleInfo: getRoleInfo(contact.role)
    }))
    .sort((a, b) => {
      // First sort by availability (available first)
      if (a.availability.isAvailable && !b.availability.isAvailable) return -1
      if (!a.availability.isAvailable && b.availability.isAvailable) return 1
      
      // Then by priority (lower number = higher priority)
      return a.availability.priority - b.availability.priority
    })

  // Group contacts for better UI organization
  const availableContacts = sortedContacts.filter(({ availability }) => availability.isAvailable)
  const offlineContacts = sortedContacts.filter(({ availability }) => !availability.isAvailable)
  
  // Further group available contacts by role
  const availableOwners = availableContacts.filter(({ contact }) => contact.role === 'owner')
  const availableManagers = availableContacts.filter(({ contact }) => contact.role === 'manager')
  const availableStaff = availableContacts.filter(({ contact }) => ['staff', 'custom'].includes(contact.role))

  const availableCount = availableContacts.length
  const totalCount = contacts.length

  return (
    <div 
      className="fixed bottom-6 right-6 z-50" 
      data-floating-whatsapp
      style={{ zIndex: 9999 }}
    >
      {/* Enhanced Contact List with Better Organization */}
      {isOpen && (
        <div className="mb-4 w-96 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-2xl border-2 border-green-200 bg-white max-h-[85vh] overflow-hidden">
            
            {/* Enhanced Header */}
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                    <MessageCircle className="w-6 h-6" />
                    Contact {locationName}
                  </CardTitle>
                  <p className="text-green-100 text-sm mt-1">Choose the right person for your needs</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-white/20 text-white border-white/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {availableCount} available
                    </Badge>
                    {offlineContacts.length > 0 && (
                      <Badge className="bg-red-400/20 text-white border-red-300/30">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {offlineContacts.length} offline
                      </Badge>
                    )}
                  </div>
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
              <div className="space-y-0">
                
                {/* Quick Response Section - Available Staff First */}
                {availableStaff.length > 0 && (
                  <div>
                    <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold text-green-800">🎮 Gaming Staff - Available Now</span>
                        <Badge className="bg-green-500 text-white text-xs">
                          Quick Response
                        </Badge>
                      </div>
                      <p className="text-xs text-green-700">Best for gaming questions & unit availability</p>
                    </div>
                    
                    {availableStaff.map(({ contact, availability, roleInfo }, index) => (
                      <ContactItem
                        key={`staff-${index}`}
                        contact={contact}
                        availability={availability}
                        roleInfo={roleInfo}
                        onContact={handleContactWhatsApp}
                        isHighPriority={true}
                      />
                    ))}
                  </div>
                )}

                {/* Management Section */}
                {availableManagers.length > 0 && (
                  <div>
                    {availableStaff.length > 0 && <Separator />}
                    <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <UserCog className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-800">💼 Management Team</span>
                      </div>
                      <p className="text-xs text-blue-700">For bookings, pricing & operational questions</p>
                    </div>
                    
                    {availableManagers.map(({ contact, availability, roleInfo }, index) => (
                      <ContactItem
                        key={`manager-${index}`}
                        contact={contact}
                        availability={availability}
                        roleInfo={roleInfo}
                        onContact={handleContactWhatsApp}
                      />
                    ))}
                  </div>
                )}

                {/* Owner Section - Special Treatment */}
                {availableOwners.length > 0 && (
                  <div>
                    {(availableStaff.length > 0 || availableManagers.length > 0) && <Separator />}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-3 border-b border-yellow-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-bold text-yellow-800">👑 Owner - Direct Line</span>
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                          24/7 Available
                        </Badge>
                      </div>
                      <p className="text-xs text-yellow-700">For urgent matters, complaints & important decisions</p>
                    </div>
                    
                    {availableOwners.map(({ contact, availability, roleInfo }, index) => (
                      <ContactItem
                        key={`owner-${index}`}
                        contact={contact}
                        availability={availability}
                        roleInfo={roleInfo}
                        onContact={handleContactWhatsApp}
                        isOwner={true}
                      />
                    ))}
                  </div>
                )}

                {/* Offline Contacts Section */}
                {offlineContacts.length > 0 && (
                  <div>
                    <Separator />
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Coffee className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-600">💤 Currently Offline</span>
                      </div>
                      <p className="text-xs text-gray-500">May respond later - check their next available time</p>
                    </div>
                    
                    {offlineContacts.map(({ contact, availability, roleInfo }, index) => (
                      <ContactItem
                        key={`offline-${index}`}
                        contact={contact}
                        availability={availability}
                        roleInfo={roleInfo}
                        onContact={handleContactWhatsApp}
                        isOffline={true}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Enhanced Footer with Usage Tips */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-t">
                <div className="text-xs text-gray-600 space-y-2">
                  <div className="font-semibold mb-2 text-center">💡 Who to Contact:</div>
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-3 h-3 text-green-600" />
                      <span><strong>Staff:</strong> Unit availability, games, quick help</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCog className="w-3 h-3 text-blue-600" />
                      <span><strong>Manager:</strong> Bookings, pricing, facilities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-yellow-600" />
                      <span><strong>Owner:</strong> Complaints, important matters</span>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-gray-200">
                    <span className="text-green-600 font-medium">✨ All messages are in Bahasa Indonesia</span>
                  </div>
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
          
          {/* Enhanced Availability Badge */}
          {availableCount > 0 && (
            <Badge className="absolute -top-4 -right-4 h-8 w-8 p-0 bg-red-500 text-white text-xs flex items-center justify-center border-2 border-white rounded-full">
              <div className="text-center">
                <div className="text-xs font-bold">{availableCount}</div>
                <div className="text-[8px] leading-none">online</div>
              </div>
            </Badge>
          )}
          
          {/* Offline contacts indicator */}
          {offlineContacts.length > 0 && (
            <Badge className="absolute -bottom-3 -left-3 h-5 w-5 p-0 bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white rounded-full">
              {offlineContacts.length}
            </Badge>
          )}
        </div>
        
        {/* Pulse animations - only when not open and contacts available */}
        {!isOpen && availableCount > 0 && (
          <>
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-green-300 animate-pulse opacity-50"></div>
          </>
        )}
      </Button>

      {/* Enhanced Tooltip */}
      {!isOpen && (
        <div className="absolute bottom-20 right-0 bg-black/90 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          💬 Chat with {locationName}
          <div className="text-center mt-1">
            {availableCount > 0 && (
              <span className="text-green-300 font-bold">{availableCount} available</span>
            )}
            {offlineContacts.length > 0 && (
              <span className="text-gray-300">
                {availableCount > 0 ? ' • ' : ''}{offlineContacts.length} offline
              </span>
            )}
          </div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
        </div>
      )}
    </div>
  )
}

// Enhanced Contact Item Component
interface ContactItemProps {
  contact: WhatsAppContact
  availability: ReturnType<typeof checkAvailabilityStatus>
  roleInfo: ReturnType<typeof getRoleInfo>
  onContact: (contact: WhatsAppContact) => void
  isHighPriority?: boolean
  isOwner?: boolean
  isOffline?: boolean
}

function ContactItem({ 
  contact, 
  availability, 
  roleInfo, 
  onContact, 
  isHighPriority = false,
  isOwner = false,
  isOffline = false
}: ContactItemProps) {
  const baseClasses = "w-full p-4 text-left transition-all duration-200 group border-b border-gray-100"
  const hoverClasses = isOwner 
    ? "hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50" 
    : isHighPriority 
      ? "hover:bg-green-50" 
      : isOffline 
        ? "hover:bg-gray-50" 
        : "hover:bg-blue-50"

  return (
    <button
      onClick={() => onContact(contact)}
      className={`${baseClasses} ${hoverClasses} ${isOffline ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Enhanced Avatar */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isOwner 
              ? 'bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-200'
              : isHighPriority 
                ? 'bg-green-100' 
                : isOffline 
                  ? 'bg-gray-100' 
                  : 'bg-blue-100'
          }`}>
            {roleInfo.icon}
          </div>
          
          {/* Status Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full flex items-center justify-center ${
            availability.isAvailable
              ? isOwner 
                ? 'bg-yellow-500' 
                : 'bg-green-500 animate-pulse'
              : 'bg-gray-400'
          }`}>
            {isOwner && <Crown className="w-2 h-2 text-white" />}
          </div>
        </div>
        
        {/* Contact Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${isOffline ? 'text-gray-700' : 'text-gray-900'}`}>
              {contact.name}
            </span>
            <Badge className={roleInfo.color}>
              {roleInfo.icon}
              <span className="ml-1">{roleInfo.label}</span>
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <Phone className={`w-3 h-3 ${isOffline ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-xs ${isOffline ? 'text-gray-500' : 'text-gray-600'}`}>
              {contact.number}
            </span>
          </div>
          
          {/* Availability Status */}
          <div className="flex items-center gap-1">
            {availability.status === 'available' && (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            )}
            {availability.status === 'owner_available' && (
              <Crown className="w-3 h-3 text-yellow-600" />
            )}
            {availability.status === 'offline' && (
              <Clock className="w-3 h-3 text-gray-500" />
            )}
            
            <p className={`text-xs ${
              availability.isAvailable 
                ? isOwner 
                  ? 'text-yellow-600 font-medium' 
                  : 'text-green-600 font-medium'
                : 'text-gray-500'
            }`}>
              {availability.message}
            </p>
          </div>
          
          {/* Role Description */}
          <p className="text-xs text-gray-500 mt-1 italic">
            {roleInfo.description}
          </p>
        </div>
        
        {/* Action Icon */}
        <MessageCircle className={`w-6 h-6 transition-colors ${
          isOwner 
            ? 'text-yellow-600 group-hover:text-yellow-700'
            : isHighPriority 
              ? 'text-green-600 group-hover:text-green-700'
              : isOffline 
                ? 'text-gray-500 group-hover:text-gray-600'
                : 'text-blue-600 group-hover:text-blue-700'
        }`} />
      </div>
    </button>
  )
}