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

    // Refresh session to ensure we have the latest auth state
    console.log('[Middleware] Checking session for path:', pathname)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const user = session?.user ?? null

    // If there's an error getting the session, treat as unauthenticated
    if (sessionError) {
      console.error('[Middleware] Error getting session:', sessionError.message)
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
      console.log('[Middleware] No user found, redirecting to login. Pathname:', pathname)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
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

