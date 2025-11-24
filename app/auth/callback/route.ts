import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

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

      // Verify the session is accessible after setting cookies
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[Auth Callback] Error getting session after exchange:', sessionError)
        // Still redirect - cookies might be set even if getSession fails
      } else if (!session) {
        console.error('[Auth Callback] Session not accessible after exchange')
        // Still redirect - try anyway
      } else {
        console.log('[Auth Callback] Session verified after exchange:', session.user.email)
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

