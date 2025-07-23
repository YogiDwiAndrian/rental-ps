'use client'

import { useState, useEffect } from 'react'

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      // Check window width for mobile breakpoint
      const windowWidth = window.innerWidth
      const isMobileWidth = windowWidth < 768 // Tailwind's md breakpoint
      
      // Additional mobile detection using user agent
      const userAgent = navigator.userAgent
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      
      // Consider mobile if either width is small OR user agent indicates mobile
      setIsMobile(isMobileWidth || isMobileUA)
      setIsLoading(false)
    }
    
    // Initial check
    checkMobile()
    
    // Listen for window resize
    window.addEventListener('resize', checkMobile)
    
    // Cleanup listener
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return {
    isMobile,
    isDesktop: !isMobile && !isLoading,
    isLoading
  }
}