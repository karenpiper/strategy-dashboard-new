'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()

  // Track page views
  useEffect(() => {
    if (!user || !pathname) return

    // Don't track API routes or auth callbacks
    if (pathname.startsWith('/api') || pathname.startsWith('/auth')) return

    // Small delay to ensure page is loaded
    const timeoutId = setTimeout(() => {
      trackPageView(pathname)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [pathname, user])

  const trackPageView = async (pagePath: string) => {
    if (!user) return

    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'page_view',
          eventName: 'page_view',
          pagePath,
          metadata: {
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
            language: typeof window !== 'undefined' ? navigator.language : null,
            screenWidth: typeof window !== 'undefined' ? window.screen.width : null,
            screenHeight: typeof window !== 'undefined' ? window.screen.height : null,
            timestamp: new Date().toISOString()
          }
        })
      })
    } catch (error) {
      // Silently fail - don't interrupt user experience
      if (process.env.NODE_ENV === 'development') {
        console.error('Error tracking page view:', error)
      }
    }
  }

  return <>{children}</>
}






