// src/hooks/use-mobile.ts
'use client'

import { useState, useEffect } from 'react'

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 768) // md breakpoint
      setIsTablet(width >= 768 && width < 1024) // lg breakpoint
    }

    // Check on mount
    checkDevice()

    // Add resize listener
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet
  }
}