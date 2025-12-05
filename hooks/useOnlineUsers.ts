import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { usePathname } from 'next/navigation'

export interface OnlineUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  role: string | null
  last_seen: string
}

/**
 * Ultra-minimal hook to track online users with very low database usage
 * - Only pings on page navigation (route changes)
 * - Fallback ping every 5 minutes if no navigation
 * - Polls for online users every 5 minutes
 * - Stops all activity when tab is hidden
 * 
 * Database load: ~12-24 operations per user per hour (vs 1200+ before)
 */
export function useOnlineUsers() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isOnline, setIsOnline] = useState(false)
  const fallbackPingRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPingRef = useRef<number>(0)
  const isTabVisibleRef = useRef<boolean>(true)
  const lastPathnameRef = useRef<string | null>(null)

  // Minimal ping - only when needed
  const pingPresence = useCallback(async (force = false) => {
    if (!user || !isTabVisibleRef.current) return

    const now = Date.now()
    // Throttle: don't ping more than once per 2 minutes
    if (!force && now - lastPingRef.current < 120000) {
      return
    }

    try {
      await fetch('/api/presence/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      lastPingRef.current = now
    } catch (error) {
      // Silently fail - don't interrupt user experience
      if (process.env.NODE_ENV === 'development') {
        console.error('Error pinging presence:', error)
      }
    }
  }, [user])

  // Fetch list of online users
  const fetchOnlineUsers = useCallback(async () => {
    if (!user || !isTabVisibleRef.current) return

    try {
      const response = await fetch('/api/presence/online')
      if (response.ok) {
        const data = await response.json()
        setOnlineUsers(data.users || [])
        setIsOnline(data.users?.some((u: OnlineUser) => u.id === user.id) || false)
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching online users:', error)
      }
    }
  }, [user])

  // Initial setup
  useEffect(() => {
    if (!user) {
      setOnlineUsers([])
      setIsOnline(false)
      return
    }

    // Initial ping and fetch
    pingPresence(true)
    fetchOnlineUsers()

    // Fallback ping every 5 minutes (only if tab is visible)
    // This ensures users stay "online" even if they're just reading
    const setupFallbackPing = () => {
      if (fallbackPingRef.current) {
        clearInterval(fallbackPingRef.current)
      }
      fallbackPingRef.current = setInterval(() => {
        if (isTabVisibleRef.current) {
          pingPresence()
        }
      }, 300000) // 5 minutes
    }
    setupFallbackPing()

    // Poll for online users every 5 minutes (only if tab is visible)
    const setupPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      pollIntervalRef.current = setInterval(() => {
        if (isTabVisibleRef.current) {
          fetchOnlineUsers()
        }
      }, 300000) // 5 minutes
    }
    setupPolling()

    // Handle tab visibility
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = document.visibilityState === 'visible'
      
      if (isTabVisibleRef.current) {
        // Tab became visible - ping immediately and fetch users
        pingPresence(true)
        fetchOnlineUsers()
      }
      // When tab is hidden, intervals will check isTabVisibleRef and skip
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (fallbackPingRef.current) {
        clearInterval(fallbackPingRef.current)
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, pingPresence, fetchOnlineUsers])

  // Ping only on navigation (route changes)
  useEffect(() => {
    if (!user || !pathname) return

    // Only ping if pathname actually changed (not initial load)
    if (lastPathnameRef.current !== null && lastPathnameRef.current !== pathname) {
      pingPresence(true)
      fetchOnlineUsers()
    }
    lastPathnameRef.current = pathname
  }, [pathname, user, pingPresence, fetchOnlineUsers])

  return { onlineUsers, isOnline }
}

