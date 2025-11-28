import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export function useAnalytics() {
  const pathname = usePathname()
  const { user } = useAuth()

  // Track page views
  useEffect(() => {
    if (!user || !pathname) return

    // Don't track API routes or auth callbacks
    if (pathname.startsWith('/api') || pathname.startsWith('/auth')) return

    // Track page view
    trackEvent('page_view', null, pathname)
  }, [pathname, user])

  const trackEvent = async (
    eventType: string,
    eventName: string | null = null,
    pagePath: string | null = null,
    metadata: Record<string, any> = {}
  ) => {
    if (!user) return

    try {
      // Get browser/device info
      const browserInfo = {
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
        language: typeof window !== 'undefined' ? navigator.language : null,
        screenWidth: typeof window !== 'undefined' ? window.screen.width : null,
        screenHeight: typeof window !== 'undefined' ? window.screen.height : null,
        timestamp: new Date().toISOString(),
        ...metadata
      }

      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          eventName,
          pagePath: pagePath || (typeof window !== 'undefined' ? window.location.pathname : null),
          metadata: browserInfo
        })
      })
    } catch (error) {
      // Silently fail - don't interrupt user experience
      if (process.env.NODE_ENV === 'development') {
        console.error('Error tracking event:', error)
      }
    }
  }

  return { trackEvent }
}

