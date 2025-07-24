'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, X, ChevronDown, User, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppContact {
  name: string
  role: 'owner' | 'staff'
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
  const [isVisible, setIsVisible] = useState(false)

  // Show/hide based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsVisible(scrollY > 100) // Show after scrolling 100px
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleContactWhatsApp = (contact: WhatsAppContact) => {
    const message = encodeURIComponent(
      `Hi ${contact.name}! Saya tertarik untuk bermain di ${locationName}. Apakah ada unit yang tersedia?`
    )
    window.open(`https://wa.me/${contact.number.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
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
    <div className="fixed bottom-6 right-6 z-50">
      {/* Contact List */}
      {isOpen && (
        <Card className="mb-4 w-80 shadow-2xl border-2 border-green-200 animate-in slide-in-from-bottom-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Contact us via WhatsApp</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {sortedContacts.map((contact, index) => (
                <button
                  key={index}
                  onClick={() => handleContactWhatsApp(contact)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      {contact.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{contact.name}</span>
                        <Badge 
                          variant={contact.role === 'owner' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {contact.role === 'owner' ? 'Owner' : 'Staff'}
                        </Badge>
                      </div>
                      {contact.responseTime && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Usually replies in {contact.responseTime}
                        </p>
                      )}
                    </div>
                    <MessageCircle className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                  </div>
                </button>
              ))}
            </div>
            
            <p className="text-xs text-gray-500 mt-3 text-center">
              Click on any contact to start WhatsApp conversation
            </p>
          </CardContent>
        </Card>
      )}

      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl transition-all duration-300 relative",
          isOpen && "bg-green-600"
        )}
      >
        {contacts.length > 1 ? (
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-white" />
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
              {contacts.length}
            </Badge>
          </div>
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
      </Button>
    </div>
  )
}