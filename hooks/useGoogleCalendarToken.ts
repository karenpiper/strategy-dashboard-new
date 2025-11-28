import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to get a Google Calendar access token
 * Uses OAuth2 refresh tokens stored in Supabase to automatically refresh access tokens
 * Only shows OAuth popup on initial authorization
 */
export function useGoogleCalendarToken() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const isRequestingRef = useRef(false) // Prevent multiple simultaneous requests
  const hasFetchedRef = useRef(false) // Track if we've successfully fetched
  const lastRefreshAttemptRef = useRef<number>(0) // Track last refresh attempt timestamp
  const refreshInProgressRef = useRef(false) // Track if refresh is in progress

  useEffect(() => {
    async function getToken() {
      // Prevent multiple simultaneous requests
      if (isRequestingRef.current || refreshInProgressRef.current) {
        return
      }
      
      // If we already have a valid token, check if it's about to expire
      if (hasFetchedRef.current && accessToken) {
        const tokenExpiry = localStorage.getItem('google_calendar_token_expiry')
        if (tokenExpiry && Date.now() < parseInt(tokenExpiry) - (5 * 60 * 1000)) {
          // Token is still valid (with 5 min buffer)
          setLoading(false)
          return
        }
        // Token is expiring soon or expired, continue to refresh it
      }
      
      isRequestingRef.current = true
      try {
        // Check cached token first
        const cachedToken = localStorage.getItem('google_calendar_token')
        const tokenExpiry = localStorage.getItem('google_calendar_token_expiry')
        
        if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry) - (5 * 60 * 1000)) {
          // Token is still valid (with 5 min buffer)
          setAccessToken(cachedToken)
          setLoading(false)
          isRequestingRef.current = false
          hasFetchedRef.current = true
          return
        }

        // Check if user is authenticated with Supabase
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setLoading(false)
          isRequestingRef.current = false
          return
        }

        // Check if user has a refresh token stored
        const refreshToken = session.user?.user_metadata?.google_calendar_refresh_token
        
        if (refreshToken) {
          // We have a refresh token, use it to get a new access token
          try {
            const response = await fetch('/api/calendar/refresh')
            
            if (response.ok) {
              const data = await response.json()
              
              if (data.accessToken) {
                // Cache the new token
                const expiry = data.expiresAt || (Date.now() + (data.expiresIn * 1000))
                localStorage.setItem('google_calendar_token', data.accessToken)
                localStorage.setItem('google_calendar_token_expiry', expiry.toString())
                setAccessToken(data.accessToken)
                setNeedsAuth(false)
                setLoading(false)
                isRequestingRef.current = false
                hasFetchedRef.current = true
                setError(null)
                return
              }
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
              
              // If refresh token is invalid/expired, we need to re-authenticate
              if (response.status === 401 && errorData.needsAuth) {
                console.log('Refresh token expired, need to re-authenticate')
                setNeedsAuth(true)
                setError(null) // Don't show error, just trigger auth flow
                setLoading(false)
                isRequestingRef.current = false
                return
              }
              
              throw new Error(errorData.error || 'Failed to refresh token')
            }
          } catch (refreshError: any) {
            console.error('Error refreshing token:', refreshError)
            // If refresh fails, we need to re-authenticate
            setNeedsAuth(true)
            setError(null) // Don't show error, just trigger auth flow
            setLoading(false)
            isRequestingRef.current = false
            return
          }
        } else {
          // No refresh token, need to authenticate
          setNeedsAuth(true)
          setLoading(false)
          isRequestingRef.current = false
          return
        }
      } catch (error: any) {
        console.error('Error getting calendar token:', error)
        setError(error.message)
        setLoading(false)
        isRequestingRef.current = false
      }
    }
    
    getToken()
  }, [refreshTrigger]) // Re-run when refreshTrigger changes

  // Function to initiate OAuth flow
  const initiateAuth = () => {
    if (isRequestingRef.current) return
    
    // Redirect to OAuth authorization endpoint
    window.location.href = '/api/calendar/auth'
  }

  // Function to refresh the token (clears cache and requests new token)
  const refreshToken = async () => {
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    // Check cooldown: only allow refresh if last refresh was > 5 minutes ago
    if (lastRefreshAttemptRef.current > 0 && (now - lastRefreshAttemptRef.current) < fiveMinutes) {
      return
    }
    
    // Prevent multiple simultaneous refreshes
    if (refreshInProgressRef.current) {
      return
    }
    
    lastRefreshAttemptRef.current = now
    refreshInProgressRef.current = true
    
    try {
      // Clear cached token
      localStorage.removeItem('google_calendar_token')
      localStorage.removeItem('google_calendar_token_expiry')
      
      // Try to refresh using the refresh token endpoint
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('Not authenticated')
        refreshInProgressRef.current = false
        return
      }

      const refreshToken = session.user?.user_metadata?.google_calendar_refresh_token
      
      if (!refreshToken) {
        // No refresh token, need to authenticate
        setNeedsAuth(true)
        setAccessToken(null)
        setError(null)
        refreshInProgressRef.current = false
        setRefreshTrigger(prev => prev + 1)
        return
      }

      // Call refresh endpoint
      const response = await fetch('/api/calendar/refresh')
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.accessToken) {
          // Cache the new token
          const expiry = data.expiresAt || (Date.now() + (data.expiresIn * 1000))
          localStorage.setItem('google_calendar_token', data.accessToken)
          localStorage.setItem('google_calendar_token_expiry', expiry.toString())
          setAccessToken(data.accessToken)
          setNeedsAuth(false)
          setError(null)
          refreshInProgressRef.current = false
          setRefreshTrigger(prev => prev + 1)
          return
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        // If refresh token is invalid/expired, we need to re-authenticate
        if (response.status === 401 && errorData.needsAuth) {
          setNeedsAuth(true)
          setAccessToken(null)
          setError(null)
          refreshInProgressRef.current = false
          setRefreshTrigger(prev => prev + 1)
          return
        }
        
        throw new Error(errorData.error || 'Failed to refresh token')
      }
    } catch (error: any) {
      console.error('Error refreshing token:', error)
      setError(error.message)
      setNeedsAuth(true) // Trigger re-auth on error
      refreshInProgressRef.current = false
    }
  }

  return { 
    accessToken, 
    loading, 
    error, 
    needsAuth, 
    refreshToken,
    initiateAuth // New function to start OAuth flow
  }
}
