'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, X, User, Clock, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppContact {
  name: string
  role: 'owner' | 'staff' | 'manager' | 'custom'
  number: string
  isOnline?: boolean
  responseTime?: string
}

interface FloatingWhatsAppProps {
  contacts: WhatsAppContact[]
  locationName: string
}

export function FloatingWhatsApp({ contacts, locationName }: FloatingWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true) // Always visible by default

  // Show after a delay to ensure page is loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000) // Show after 2 seconds

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
    const message = encodeURIComponent(
      `Hi ${contact.name}! 👋\n\nSaya tertarik untuk bermain di ${locationName}.\n\nApakah ada unit PlayStation yang tersedia sekarang?\n\nTerima kasih! 🎮`
    )
    const cleanNumber = contact.number.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank')
    setIsOpen(false)
  }

  // Sort contacts: owner first, then staff by name
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.role === 'owner' && b.role === 'staff') return -1
    if (a.role === 'staff' && b.role === 'owner') return 1
    return a.name.localeCompare(b.name)
  })

  if (!isVisible || contacts.length === 0) return null

  return (
    <div 
      className="fixed bottom-6 right-6 z-50" 
      data-floating-whatsapp
      style={{ zIndex: 9999 }} // Ensure it's above everything
    >
      {/* Contact List */}
      {isOpen && (
        <div className="mb-4 w-80 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-2xl border-2 border-green-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">💬 Contact us via WhatsApp</h3>
                  <p className="text-sm text-gray-600">Choose who to chat with</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {sortedContacts.map((contact, index) => (
                  <button
                    key={index}
                    onClick={() => handleContactWhatsApp(contact)}
                    className="w-full p-4 text-left border-2 border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-green-600" />
                        </div>
                        {contact.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{contact.name}</span>
                          <Badge 
                            variant={contact.role === 'owner' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {contact.role === 'owner' ? '👑 Owner' : 
                             contact.role === 'manager' ? '👤 Manager' : '👤 Staff'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-600">{contact.number}</span>
                        </div>
                        {contact.responseTime && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            Usually replies in {contact.responseTime}
                          </p>
                        )}
                      </div>
                      <MessageCircle className="w-6 h-6 text-green-600 group-hover:text-green-700 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 text-center">
                  💡 Click on any contact to start WhatsApp conversation
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Button */}
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
        {contacts.length > 1 ? (
          <div className="relative">
            <MessageCircle className="w-7 h-7 text-white" />
            <Badge className="absolute -top-3 -right-3 h-6 w-6 p-0 bg-red-500 text-white text-xs flex items-center justify-center border-2 border-white">
              {contacts.length}
            </Badge>
          </div>
        ) : (
          <MessageCircle className="w-7 h-7 text-white" />
        )}
        
        {/* Pulse animation - only when not open */}
        {!isOpen && (
          <>
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-green-300 animate-pulse opacity-50"></div>
          </>
        )}
      </Button>

      {/* Tooltip for first time users */}
      {!isOpen && (
        <div className="absolute bottom-20 right-0 bg-black/80 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          💬 Chat with us on WhatsApp
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"></div>
        </div>
      )}
    </div>
  )
}