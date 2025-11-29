import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    try {
      // Create a response object for cookie handling - redirect URL will be set after auth
      const redirectUrl = new URL(`${origin}/`)
      redirectUrl.searchParams.set('just_authenticated', 'true')
      const response = NextResponse.redirect(redirectUrl.toString())
      
      // Determine if we're in production (HTTPS)
      const isProduction = origin.startsWith('https://')
      
      // Create Supabase client with proper cookie handling for route handlers
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              // Set all cookies on both request and response with proper options
              cookiesToSet.forEach(({ name, value, options = {} }) => {
                const cookieOptions = {
                  ...options,
                  path: options.path || '/',
                  sameSite: options.sameSite || 'lax' as const,
                  secure: options.secure !== undefined ? options.secure : isProduction,
                  httpOnly: options.httpOnly !== undefined ? options.httpOnly : true,
                }
                request.cookies.set({ name, value, ...cookieOptions })
                response.cookies.set({ name, value, ...cookieOptions })
              })
            },
            set(name: string, value: string, options: any) {
              // Set cookie on both request and response with proper options
              const cookieOptions = {
                ...options,
                path: options?.path || '/',
                sameSite: options?.sameSite || 'lax' as const,
                secure: options?.secure !== undefined ? options.secure : isProduction,
                httpOnly: options?.httpOnly !== undefined ? options.httpOnly : true,
              }
              request.cookies.set({ name, value, ...cookieOptions })
              response.cookies.set({ name, value, ...cookieOptions })
            },
            remove(name: string, options: any) {
              // Remove cookie from both request and response
              const cookieOptions = {
                ...options,
                path: options?.path || '/',
                sameSite: options?.sameSite || 'lax' as const,
                secure: options?.secure !== undefined ? options.secure : isProduction,
              }
              request.cookies.set({ name, value: '', ...cookieOptions })
              response.cookies.set({ name, value: '', ...cookieOptions })
            },
          },
        }
      )

      console.log('[Auth Callback] Exchanging code for session...')
      const { data: { session: exchangeSession }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('[Auth Callback] Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
      }

      if (!exchangeSession) {
        console.error('[Auth Callback] No session returned from exchangeCodeForSession')
        return NextResponse.redirect(`${origin}/login?error=Session not created`)
      }

      console.log('[Auth Callback] Successfully authenticated user:', exchangeSession.user.email)
      console.log('[Auth Callback] Session expires at:', new Date(exchangeSession.expires_at! * 1000).toISOString())

      // Try to extract and store Google Calendar refresh token
      // Since Supabase already exchanged the code, we check if provider_refresh_token exists
      // If not, we'll need to make a separate OAuth request (handled client-side)
      try {
        const providerRefreshToken = (exchangeSession as any).provider_refresh_token
        const providerToken = (exchangeSession as any).provider_token
        
        if (providerRefreshToken) {
          console.log('[Auth Callback] Found provider refresh token, storing in user metadata...')
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              google_calendar_refresh_token: providerRefreshToken,
              google_calendar_token_updated_at: new Date().toISOString(),
            }
          })
          
          if (updateError) {
            console.error('[Auth Callback] Error storing refresh token:', updateError)
          } else {
            console.log('[Auth Callback] Successfully stored Google Calendar refresh token')
          }
        } else if (providerToken) {
          // If we have provider_token but no refresh token, we can try to get refresh token
          // by making a new OAuth request with offline access
          // But we can't do that server-side without user interaction
          // So we'll set a flag to trigger client-side OAuth flow
          console.log('[Auth Callback] Provider token found but no refresh token')
          console.log('[Auth Callback] Will attempt to get refresh token via separate OAuth flow')
          
          // Check if user already has a refresh token stored
          const { data: { user } } = await supabase.auth.getUser()
          if (user && !user.user_metadata?.google_calendar_refresh_token) {
            // Set a flag in the redirect URL to trigger client-side refresh token acquisition
            redirectUrl.searchParams.set('needs_calendar_refresh_token', 'true')
          }
        } else {
          console.log('[Auth Callback] No provider token or refresh token found')
        }
      } catch (tokenError: any) {
        console.error('[Auth Callback] Error processing refresh token:', tokenError)
        // Don't fail the auth flow if we can't store the refresh token
      }

      // Verify the session is accessible after setting cookies
      // Try multiple times to ensure session is established
      let sessionVerified = false
      let attempts = 0
      const maxAttempts = 3
      
      while (!sessionVerified && attempts < maxAttempts) {
        attempts++
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error(`[Auth Callback] Error getting session after exchange (attempt ${attempts}):`, sessionError)
          if (attempts < maxAttempts) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 200))
            continue
          }
        } else if (!session) {
          console.error(`[Auth Callback] Session not accessible after exchange (attempt ${attempts})`)
          if (attempts < maxAttempts) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 200))
            continue
          }
        } else {
          console.log('[Auth Callback] Session verified after exchange:', session.user.email)
          sessionVerified = true
        }
      }

      // Log all cookies being set (for debugging)
      const allCookies = response.cookies.getAll()
      console.log('[Auth Callback] Cookies being set in response:', allCookies.map(c => ({
        name: c.name,
        path: c.path || '/',
        sameSite: c.sameSite,
        secure: c.secure,
      })))

      // Successfully authenticated, redirect to home with cookies set
      // Include just_authenticated flag so middleware knows to be lenient
      console.log('[Auth Callback] Redirecting to home page')
      return response
    } catch (error: any) {
      console.error('[Auth Callback] Error in auth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`)
    }
  }

  // No code provided, redirect to login
  console.error('[Auth Callback] No authorization code provided')
  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}

