import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token: string; expires_in: number }) => void
          }) => {
            requestAccessToken: () => void
          }
        }
      }
    }
  }
}

/**
 * Hook to get a Google Calendar access token
 * Uses Google Identity Services to request calendar permissions separately
 * since Supabase OAuth doesn't include calendar scopes
 */
export function useGoogleCalendarToken() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const isRequestingRef = useRef(false) // Use ref to prevent re-renders
  const hasFetchedRef = useRef(false) // Track if we've successfully fetched
  const lastRefreshAttemptRef = useRef<number>(0) // Track last refresh attempt timestamp

  useEffect(() => {
    async function getToken() {
      // Prevent multiple simultaneous requests
      if (isRequestingRef.current) {
        console.log('⏸️ Google Calendar token request already in progress, skipping...')
        return
      }
      
      // If we already have a valid token, don't request again
      if (hasFetchedRef.current && accessToken) {
        console.log('✅ Already have Google Calendar token, skipping request')
        setLoading(false)
        return
      }
      
      isRequestingRef.current = true
      try {
        // Check cached token first
        const cachedToken = localStorage.getItem('google_calendar_token')
        const tokenExpiry = localStorage.getItem('google_calendar_token_expiry')
        
        if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
              console.log('✅ Using cached Google Calendar token')
              setAccessToken(cachedToken)
              setLoading(false)
              isRequestingRef.current = false
              hasFetchedRef.current = true
              return
        }
        
        // Check if user has previously denied access (prevent repeated popups)
        const deniedAccess = sessionStorage.getItem('google_calendar_denied')
        if (deniedAccess === 'true') {
          console.log('ℹ️ User previously denied calendar access - skipping popup')
          setLoading(false)
          isRequestingRef.current = false
          return
        }

        // Check if user is authenticated with Supabase
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          console.log('No Supabase session found')
          setLoading(false)
          isRequestingRef.current = false
          return
        }

        // Get user email from Supabase to help GSI identify the account
        const userEmail = session.user?.email
        
        // Try Supabase provider token first (might work if scopes were requested during OAuth)
        const providerToken = (session as any).provider_token
        if (providerToken) {
          console.log('ℹ️ Found provider token in Supabase session')
          // Try using the provider token - if it has calendar scopes, we can use it directly
          // Test the token by making a simple API call
          try {
            const testResponse = await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1`, {
              headers: {
                'Authorization': `Bearer ${providerToken}`
              }
            })
            if (testResponse.ok) {
              console.log('✅ Provider token works for calendar access - using it instead of GSI')
              // Cache the token
              const expiry = Date.now() + (3600 * 1000) - (5 * 60 * 1000) // 1 hour minus 5 min buffer
              localStorage.setItem('google_calendar_token', providerToken)
              localStorage.setItem('google_calendar_token_expiry', expiry.toString())
              setAccessToken(providerToken)
              setLoading(false)
              isRequestingRef.current = false
              hasFetchedRef.current = true
              return // Successfully using provider token, no need for GSI
            } else {
              console.log('ℹ️ Provider token doesn\'t have calendar scopes, will use GSI')
            }
          } catch (error) {
            console.log('ℹ️ Could not verify provider token, will use GSI')
          }
        }
        
        // Check if we just came from OAuth callback to avoid double popup
        const justAuthenticated = sessionStorage.getItem('just_authenticated')
        const authTimestamp = sessionStorage.getItem('auth_timestamp')
        const now = Date.now()
        
        // If we just authenticated (within last 10 seconds), delay longer or skip popup
        if (justAuthenticated === 'true' && authTimestamp) {
          const timeSinceAuth = now - parseInt(authTimestamp)
          if (timeSinceAuth < 10000) { // Less than 10 seconds since auth
            console.log('ℹ️ Just authenticated, waiting longer before requesting calendar token to avoid double popup')
            // Wait longer to let Google session fully establish
            await new Promise(resolve => setTimeout(resolve, 5000))
            // Clear the flag after delay
            sessionStorage.removeItem('just_authenticated')
            sessionStorage.removeItem('auth_timestamp')
          }
        } else {
          // Normal delay for existing sessions
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Check if we have Google Client ID
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (!clientId) {
          console.log('ℹ️ NEXT_PUBLIC_GOOGLE_CLIENT_ID not set - will use service account fallback')
          setLoading(false)
          isRequestingRef.current = false
          return
        }

        // Load Google Identity Services script if not already loaded
        if (!window.google) {
          await new Promise<void>((resolve, reject) => {
            if (window.google) {
              resolve()
              return
            }
            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client'
            script.async = true
            script.defer = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
            document.head.appendChild(script)
          })
        }

        // Wait a bit for GSI to initialize
        await new Promise(resolve => setTimeout(resolve, 100))

        if (!window.google?.accounts?.oauth2) {
          console.log('ℹ️ Google Identity Services not available - will use service account fallback')
          setLoading(false)
          isRequestingRef.current = false
          return
        }

        // Request token using Google Identity Services
        let callbackFired = false
        const currentOrigin = window.location.origin
        
        // For GSI token client, we need to ensure the origin is in authorized JavaScript origins
        // The redirect URI should be the current origin or a postMessage target
        const tokenClientConfig: any = {
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: (response: any) => {
            callbackFired = true
            if (response.access_token) {
              console.log('✅ Got Google Calendar token from GSI')
              // Cache the token (expires_in is in seconds)
              const expiry = Date.now() + (response.expires_in * 1000) - (5 * 60 * 1000) // 5 min buffer
              localStorage.setItem('google_calendar_token', response.access_token)
              localStorage.setItem('google_calendar_token_expiry', expiry.toString())
              setAccessToken(response.access_token)
              setNeedsAuth(false)
              setLoading(false)
              isRequestingRef.current = false
              hasFetchedRef.current = true
              // Clear denied flag if user successfully granted access
              sessionStorage.removeItem('google_calendar_denied')
            } else {
              console.error('No access token in GSI response:', response)
              // Check if it's a redirect URI error
              if (response.error === 'redirect_uri_mismatch') {
                setError(`Redirect URI mismatch. Please add "${currentOrigin}" to authorized JavaScript origins in Google Cloud Console.`)
              } else if (response.error === 'popup_closed_by_user') {
                console.log('ℹ️ User closed the consent popup - will use service account fallback')
                sessionStorage.setItem('google_calendar_denied', 'true')
                setLoading(false)
                isRequestingRef.current = false
                // Don't set error - allow fallback to service account
              } else if (response.error === 'access_denied') {
                console.log('ℹ️ User denied calendar access - will use service account fallback')
                sessionStorage.setItem('google_calendar_denied', 'true')
                setLoading(false)
                isRequestingRef.current = false
                // Don't set error - allow fallback to service account
              } else {
                setError('Failed to get calendar access token. User may have denied access.')
                setLoading(false)
                isRequestingRef.current = false
              }
            }
          },
        }
        
        // If we have the user's email, we can hint GSI (though it doesn't directly support this)
        // The delay above should help GSI detect the existing session
        
        const tokenClient = window.google.accounts.oauth2.initTokenClient(tokenClientConfig)

        // Request token (will show consent dialog if needed)
        // This is non-blocking - user can interact with the consent dialog
        // Note: GSI will try to use the existing Google session if available
        try {
          tokenClient.requestAccessToken()
          setNeedsAuth(true) // We're requesting, so we might need user interaction
        } catch (error: any) {
          console.error('Error requesting token:', error)
          if (error.message?.includes('redirect_uri')) {
            setError(`Redirect URI configuration error. Please add "${currentOrigin}" to authorized JavaScript origins in Google Cloud Console.`)
          } else {
            setError(error.message || 'Failed to request calendar access')
          }
          setLoading(false)
          isRequestingRef.current = false
          return
        }
        
        // Set a timeout in case the callback never fires (e.g., popup blocked)
        setTimeout(() => {
          if (!callbackFired) {
            console.log('ℹ️ GSI token request timed out - will use service account fallback')
            setLoading(false)
            isRequestingRef.current = false
            // Don't set error - allow fallback to service account
          }
        }, 30000) // 30 second timeout
      } catch (error: any) {
        console.log('Could not get token:', error)
        setError(error.message)
        setLoading(false)
        isRequestingRef.current = false
      }
    }
    
    getToken()
  }, [refreshTrigger]) // Only depend on refreshTrigger - don't re-run when accessToken changes

  // Function to refresh the token (clears cache and requests new token)
  const refreshToken = () => {
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    // Check cooldown: only allow refresh if last refresh was > 5 minutes ago
    if (lastRefreshAttemptRef.current > 0 && (now - lastRefreshAttemptRef.current) < fiveMinutes) {
      const timeRemaining = Math.ceil((fiveMinutes - (now - lastRefreshAttemptRef.current)) / 1000)
      console.log(`⏸️  Refresh cooldown active. Please wait ${timeRemaining} seconds before refreshing again.`)
      return
    }
    
    console.log('🔄 Refreshing Google Calendar token...')
    lastRefreshAttemptRef.current = now
    
    // Clear cached token but DON'T clear denied flag - respect user's previous denial
    localStorage.removeItem('google_calendar_token')
    localStorage.removeItem('google_calendar_token_expiry')
    // Note: We intentionally do NOT clear 'google_calendar_denied' here
    // If user previously denied access, we should respect that
    setAccessToken(null)
    setError(null)
    setLoading(true)
    isRequestingRef.current = false // Reset requesting flag
    hasFetchedRef.current = false // Reset fetched flag
    // Trigger useEffect to run again
    setRefreshTrigger(prev => prev + 1)
  }

  return { accessToken, loading, error, needsAuth, refreshToken }
}

