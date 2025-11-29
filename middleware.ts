import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Missing Supabase environment variables')
    // If env vars are missing, allow access to login page only
    if (!pathname.startsWith('/login') && !pathname.startsWith('/auth/callback')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Log cookies for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      const cookieNames = request.cookies.getAll().map(c => c.name)
      const hasAuthCookies = cookieNames.some(name => 
        name.includes('sb-') || name.includes('supabase')
      )
      console.log('[Middleware] Request cookies:', cookieNames.length, 'cookies found')
      console.log('[Middleware] Has auth cookies:', hasAuthCookies)
    }

    // Determine if we're in production (HTTPS)
    const isProduction = request.nextUrl.protocol === 'https:'

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              response.cookies.set({ name, value, ...cookieOptions })
            })
          },
          set(name: string, value: string, options: any) {
            const cookieOptions = {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax' as const,
              secure: options?.secure !== undefined ? options.secure : isProduction,
              httpOnly: options?.httpOnly !== undefined ? options.httpOnly : true,
            }
            request.cookies.set({
              name,
              value,
              ...cookieOptions,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...cookieOptions,
            })
          },
          remove(name: string, options: any) {
            const cookieOptions = {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax' as const,
              secure: options?.secure !== undefined ? options.secure : isProduction,
            }
            request.cookies.set({
              name,
              value: '',
              ...cookieOptions,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...cookieOptions,
            })
          },
        },
      }
    )

    // Check if this is a post-auth redirect (just authenticated)
    const justAuthenticated = request.nextUrl.searchParams.get('just_authenticated') === 'true'
    
    // Refresh session to ensure we have the latest auth state
    console.log('[Middleware] Checking session for path:', pathname, justAuthenticated ? '(just authenticated)' : '')
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    let user = session?.user ?? null

    // If we just authenticated but session isn't available yet, try refreshing
    if (justAuthenticated && !user && !sessionError) {
      console.log('[Middleware] Just authenticated but session not found, attempting to refresh...')
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
      user = refreshedSession?.user ?? null
      if (user) {
        console.log('[Middleware] Session refreshed successfully after authentication')
      }
    }

    // If there's an error getting the session, treat as unauthenticated
    if (sessionError) {
      console.error('[Middleware] Error getting session:', sessionError.message)
      // If we just authenticated, give it a chance - don't redirect immediately
      if (justAuthenticated) {
        console.log('[Middleware] Session error after auth, but allowing through (cookies may still be propagating)')
        // Remove the just_authenticated param and allow through
        const url = request.nextUrl.clone()
        url.searchParams.delete('just_authenticated')
        return NextResponse.redirect(url)
      }
      // If we can't verify auth, redirect to login (except for login/auth/profile routes)
      if (
        !pathname.startsWith('/login') &&
        !pathname.startsWith('/auth/callback') &&
        !pathname.startsWith('/profile/setup') &&
        !pathname.startsWith('/api')
      ) {
        console.log('[Middleware] Redirecting to login due to session error')
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    }

    // Protect all routes except login, auth callback, profile setup, and API routes
    if (
      !user &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/auth/callback') &&
      !pathname.startsWith('/profile/setup') &&
      !pathname.startsWith('/api')
    ) {
      // If we just authenticated but still no user, allow through anyway
      // The client-side auth context will handle the session once cookies propagate
      if (justAuthenticated) {
        console.log('[Middleware] Just authenticated but no user found yet - allowing through (cookies may still be propagating)')
        // Remove the just_authenticated param and allow through
        const url = request.nextUrl.clone()
        url.searchParams.delete('just_authenticated')
        return NextResponse.redirect(url)
      }
      console.log('[Middleware] No user found, redirecting to login. Pathname:', pathname)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // If we just authenticated and have a user, clean up the URL param
    if (justAuthenticated && user) {
      console.log('[Middleware] Successfully authenticated, removing just_authenticated param')
      const url = request.nextUrl.clone()
      url.searchParams.delete('just_authenticated')
      return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from login page
    if (user && pathname === '/login') {
      console.log('[Middleware] User logged in, redirecting from login to home')
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Log successful auth check (only in development)
    if (user && process.env.NODE_ENV === 'development') {
      console.log('[Middleware] User authenticated:', user.email, 'Path:', pathname)
    }
  } catch (error) {
    console.error('[Middleware] Error:', error)
    // On error, redirect to login for security (except for login/auth/profile routes)
    if (
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/auth/callback') &&
      !pathname.startsWith('/profile/setup') &&
      !pathname.startsWith('/api')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

