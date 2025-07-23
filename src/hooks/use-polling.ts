// src/hooks/use-polling.ts
'use client'

import { useEffect, useRef, useState } from 'react'

interface UsePollingOptions {
  interval: number // milliseconds
  enabled?: boolean
  immediate?: boolean // Run immediately on mount
}

export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
) {
  const { interval, enabled = true, immediate = true } = options
  const callbackRef = useRef(callback)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Start/stop polling based on enabled flag
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        setIsPolling(false)
      }
      return
    }

    const executeCallback = async () => {
      try {
        setIsPolling(true)
        await callbackRef.current()
        setLastUpdated(new Date())
      } catch (error) {
        console.error('Polling callback error:', error)
      } finally {
        setIsPolling(false)
      }
    }

    // Run immediately if requested
    if (immediate) {
      executeCallback()
    }

    // Start interval
    intervalRef.current = setInterval(executeCallback, interval)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
    }
  }, [interval, enabled, immediate])

  // Manual refresh function
  const refresh = async () => {
    try {
      setIsPolling(true)
      await callbackRef.current()
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Manual refresh error:', error)
    } finally {
      setIsPolling(false)
    }
  }

  return {
    isPolling,
    lastUpdated,
    refresh
  }
}