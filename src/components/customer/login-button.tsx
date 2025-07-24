'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  User, 
  LogIn,
  Shield,
  Building2
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LoginButtonProps {
  subdomain: string
  className?: string
}

export function LoginButton({ subdomain, className }: LoginButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  const handleLoginClick = () => {
    // Redirect to tenant-specific login page
    router.push(`/auth/signin`)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLoginClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          text-gray-600 hover:text-gray-800 hover:bg-gray-100 
          transition-all duration-200 p-2 h-auto
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">
            Staff Login
          </span>
        </div>
      </Button>

      {/* Enhanced Tooltip */}
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 z-50 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Shield className="w-4 h-4 text-blue-600" />
                Staff & Owner Access
              </div>
              
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-green-600" />
                  <span>Staff: Location Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-purple-600" />
                  <span>Owner: All Locations</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <LogIn className="w-3 h-3" />
                  <span>Click to login</span>
                </div>
              </div>
            </div>
            
            {/* Tooltip Arrow */}
            <div className="absolute -top-1 right-4 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginButton