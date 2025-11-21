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
      // Create a response object for cookie handling
      const response = NextResponse.redirect(`${origin}/`)
      
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
              // Set all cookies on both request and response
              cookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set({ name, value, ...options })
                response.cookies.set({ name, value, ...options })
              })
            },
            set(name: string, value: string, options: any) {
              // Set cookie on both request and response
              request.cookies.set({ name, value, ...options })
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: any) {
              // Remove cookie from both request and response
              request.cookies.set({ name, value: '', ...options })
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )

      const { data: { session: exchangeSession }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
      }

      if (!exchangeSession) {
        console.error('No session returned from exchangeCodeForSession')
        return NextResponse.redirect(`${origin}/login?error=Session not created`)
      }

      console.log('Successfully authenticated user:', exchangeSession.user.email)
      console.log('Session expires at:', new Date(exchangeSession.expires_at! * 1000).toISOString())

      // Verify the session is accessible after setting cookies
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error getting session after exchange:', sessionError)
        // Still redirect - cookies might be set even if getSession fails
      } else if (!session) {
        console.error('Session not accessible after exchange')
        // Still redirect - try anyway
      } else {
        console.log('Session verified after exchange:', session.user.email)
      }

      // Log all cookies being set (for debugging)
      const allCookies = response.cookies.getAll()
      console.log('Cookies being set in response:', allCookies.map(c => c.name))

      // Successfully authenticated, redirect to home with cookies set
      // The response object already has the cookies set from the exchangeCodeForSession call
      return response
    } catch (error: any) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`)
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}

