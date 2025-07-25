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
  UserCog,
  Coffee,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileDetection } from '@/hooks/use-mobile-detection'

interface WhatsAppContact {
  name: string
  role: 'owner' | 'staff' 
  number: string
  isOnline?: boolean
  responseTime?: string
  currentAvailability?: string
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
  priority: number
} {
  if (contact.role === 'owner') {
    return {
      isAvailable: true,
      status: 'owner_available',
      message: 'Always Available (24/7)',
      priority: 1
    }
  }

  if (contact.availabilitySchedule?.available24_7) {
    return {
      isAvailable: true,
      status: 'available',
      message: 'Available 24/7',
      priority: 2
    }
  }

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
      
      if (endTime < startTime) {
        endTime += 24 * 60
      }
      
      const isWithinHours = currentTime >= startTime && currentTime <= endTime
      
      if (isWithinHours) {
        return {
          isAvailable: true,
          status: 'available',
          message: `Online now (until ${todayHours.end})`,
          priority: 3 
        }
      } else {   
        if (currentTime < startTime) {
          return {
            isAvailable: false,
            status: 'offline',
            message: `Available from ${todayHours.start} today`,
            nextAvailable: `${todayHours.start} today`,
            priority: 5
          }
        }
        
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
              priority: 6
            }
          }
        }
      }
    }
  }

  if (contact.isOnline) {
    return {
      isAvailable: true,
      status: 'available',
      message: contact.currentAvailability || `Usually replies in ${contact.responseTime || '10 minutes'}`,
      priority: 4
    }
  }

  return {
    isAvailable: false,
    status: 'offline',
    message: 'Contact for availability',
    priority: 9
  }
}

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
  const { isMobile } = useMobileDetection()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

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
    
    let message = `Hi ${contact.name}! 👋\n\nSaya tertarik untuk bermain di ${locationName}.\n\n`
    
    if (contact.role === 'owner') {
      message += `Apakah ada unit PlayStation yang tersedia sekarang?\n\n`
      if (!availabilityStatus.isAvailable) {
        message += `*Note: I understand you might be busy, but I wanted to reach out as this seemed important.*\n\n`
      }
      message += `Terima kasih! 🎮`
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
      if (a.availability.isAvailable && !b.availability.isAvailable) return -1
      if (!a.availability.isAvailable && b.availability.isAvailable) return 1
      return a.availability.priority - b.availability.priority
    })

  const availableContacts = sortedContacts.filter(({ availability }) => availability.isAvailable)
  const offlineContacts = sortedContacts.filter(({ availability }) => !availability.isAvailable)
  
  const availableOwners = availableContacts.filter(({ contact }) => contact.role === 'owner')
  const availableStaff = availableContacts.filter(({ contact }) => contact.role === 'staff')

  const availableCount = availableContacts.length

  return (
    <div 
      className="fixed bottom-4 right-4 z-50" 
      data-floating-whatsapp
      style={{ zIndex: 9999 }}
    >
      {/* MOBILE-RESPONSIVE Contact List */}
      {isOpen && (
        <div className={cn(
          "mb-4 animate-in slide-in-from-bottom-2 duration-300",
          isMobile 
            ? "fixed inset-x-4 bottom-20 max-h-[70vh]" // Mobile: Full width with margins
            : "w-96 max-h-[85vh]" // Desktop: Fixed width
        )}>
          <Card className="shadow-2xl border-2 border-green-200 bg-white overflow-hidden">
            
            {/* Enhanced Header - Mobile Optimized */}
            <CardHeader className={cn(
              "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
              isMobile ? "pb-3 px-4 py-3" : "pb-4"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0"> {/* min-w-0 for text truncation */}
                  <CardTitle className={cn(
                    "text-white font-bold flex items-center gap-2",
                    isMobile ? "text-lg" : "text-xl"
                  )}>
                    <MessageCircle className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
                    <span className="truncate">Contact {locationName}</span>
                  </CardTitle>
                  <p className={cn(
                    "text-green-100 mt-1",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    Choose the right person for your needs
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {availableCount} available
                    </Badge>
                    {offlineContacts.length > 0 && (
                      <Badge className="bg-red-400/20 text-white border-red-300/30 text-xs">
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
                  className="text-white hover:bg-white/20 h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className={cn(
              "p-0 overflow-y-auto",
              isMobile ? "max-h-[50vh]" : "max-h-96"
            )}>
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
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                )}
                
                {/* Owner Section */}
                {availableOwners.length > 0 && (
                  <div>
                    {(availableStaff.length > 0) && <Separator />}
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
                        isMobile={isMobile}
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
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Enhanced Footer with Usage Tips - Mobile Optimized */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-t">
                <div className={cn(
                  "text-gray-600 space-y-2",
                  isMobile ? "text-xs" : "text-xs"
                )}>
                  <div className="font-semibold mb-2 text-center">💡 Who to Contact:</div>
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="text-xs"><strong>Staff:</strong> Unit availability, games, quick help</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCog className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      <span className="text-xs"><strong>Manager:</strong> Bookings, pricing, facilities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                      <span className="text-xs"><strong>Owner:</strong> Complaints, important matters</span>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-gray-200">
                    <span className="text-green-600 font-medium text-xs">✨ All messages are in Bahasa Indonesia</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simplified Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full bg-green-500 hover:bg-green-600 shadow-2xl transition-all duration-300 relative group",
          isOpen && "bg-green-600 scale-105",
          isMobile ? "h-14 w-14" : "h-16 w-16" // Slightly smaller on mobile
        )}
        style={{ 
          filter: 'drop-shadow(0 8px 16px rgba(34, 197, 94, 0.3))',
        }}
      >
        <div className="relative">
          <MessageCircle className={cn(isMobile ? "w-6 h-6" : "w-7 h-7", "text-white")} />
        </div>
        
        {/* Pulse animations */}
        {!isOpen && availableCount > 0 && (
          <>
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-green-300 animate-pulse opacity-50"></div>
          </>
        )}
      </Button>

      {/* Enhanced Tooltip - Mobile Optimized */}
      {!isOpen && (
        <div className={cn(
          "absolute bg-black/90 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap",
          isMobile 
            ? "bottom-16 right-0 max-w-[200px] whitespace-normal" // Mobile: above button, allow wrap
            : "bottom-20 right-0" // Desktop: above button
        )}>
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
          <div className={cn(
            "absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90",
            isMobile ? "top-full right-4" : "top-full right-4"
          )}></div>
        </div>
      )}
    </div>
  )
}

// Enhanced Contact Item Component - Mobile Optimized
interface ContactItemProps {
  contact: WhatsAppContact
  availability: ReturnType<typeof checkAvailabilityStatus>
  roleInfo: ReturnType<typeof getRoleInfo>
  onContact: (contact: WhatsAppContact) => void
  isHighPriority?: boolean
  isOwner?: boolean
  isOffline?: boolean
  isMobile?: boolean
}

function ContactItem({ 
  contact, 
  availability, 
  roleInfo, 
  onContact, 
  isHighPriority = false,
  isOwner = false,
  isOffline = false,
  isMobile = false
}: ContactItemProps) {
  const baseClasses = "w-full text-left transition-all duration-200 group border-b border-gray-100"
  const padding = isMobile ? "p-3" : "p-4"
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
      className={`${baseClasses} ${padding} ${hoverClasses} ${isOffline ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Enhanced Avatar - Mobile Optimized */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "rounded-full flex items-center justify-center",
            isMobile ? "w-10 h-10" : "w-12 h-12",
            isOwner 
              ? 'bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-200'
              : isHighPriority 
                ? 'bg-green-100' 
                : isOffline 
                  ? 'bg-gray-100' 
                  : 'bg-blue-100'
          )}>
            {roleInfo.icon}
          </div>
          
          {/* Status Indicator */}
          <div className={cn(
            "absolute -bottom-1 -right-1 border-2 border-white rounded-full flex items-center justify-center",
            isMobile ? "w-3 h-3" : "w-4 h-4",
            availability.isAvailable
              ? isOwner 
                ? 'bg-yellow-500' 
                : 'bg-green-500 animate-pulse'
              : 'bg-gray-400'
          )}>
            {isOwner && <Crown className={cn(isMobile ? "w-1.5 h-1.5" : "w-2 h-2", "text-white")} />}
          </div>
        </div>
        
        {/* Contact Info - Mobile Optimized */}
        <div className="flex-1 min-w-0"> {/* min-w-0 for text truncation */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "font-semibold truncate",
              isMobile ? "text-sm" : "text-base",
              isOffline ? 'text-gray-700' : 'text-gray-900'
            )}>
              {contact.name}
            </span>
            <Badge className={cn(roleInfo.color, "text-xs flex-shrink-0")}>
              {roleInfo.icon}
              <span className="ml-1">{roleInfo.label}</span>
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <Phone className={cn(
              isMobile ? "w-3 h-3" : "w-3 h-3",
              isOffline ? 'text-gray-400' : 'text-gray-500'
            )} />
            <span className={cn(
              "text-xs truncate",
              isOffline ? 'text-gray-500' : 'text-gray-600'
            )}>
              {contact.number}
            </span>
          </div>
          
          {/* Availability Status */}
          <div className="flex items-center gap-1">
            {availability.status === 'available' && (
              <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
            )}
            {availability.status === 'owner_available' && (
              <Crown className="w-3 h-3 text-yellow-600 flex-shrink-0" />
            )}
            {availability.status === 'offline' && (
              <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
            )}
            
            <p className={cn(
              "text-xs truncate",
              availability.isAvailable 
                ? isOwner 
                  ? 'text-yellow-600 font-medium' 
                  : 'text-green-600 font-medium'
                : 'text-gray-500'
            )}>
              {availability.message}
            </p>
          </div>
          
          {/* Role Description - Hidden on mobile to save space */}
          {!isMobile && (
            <p className="text-xs text-gray-500 mt-1 italic truncate">
              {roleInfo.description}
            </p>
          )}
        </div>
        
        {/* Action Icon */}
        <MessageCircle className={cn(
          isMobile ? "w-5 h-5" : "w-6 h-6",
          "transition-colors flex-shrink-0",
          isOwner 
            ? 'text-yellow-600 group-hover:text-yellow-700'
            : isHighPriority 
              ? 'text-green-600 group-hover:text-green-700'
              : isOffline 
                ? 'text-gray-500 group-hover:text-gray-600'
                : 'text-blue-600 group-hover:text-blue-700'
        )} />
      </div>
    </button>
  )
}