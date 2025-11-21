import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware')
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
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            // Set all cookies on both request and response
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set({ name, value, ...options })
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              response.cookies.set({ name, value, ...options })
            })
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Refresh session to ensure we have the latest auth state
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const user = session?.user ?? null

    // If there's an error getting the session, treat as unauthenticated
    if (sessionError) {
      console.error('Error getting session in middleware:', sessionError)
      // If we can't verify auth, redirect to login (except for login/auth/profile routes)
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

    // Protect all routes except login, auth callback, profile setup, and API routes
    if (
      !user &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/auth/callback') &&
      !pathname.startsWith('/profile/setup') &&
      !pathname.startsWith('/api')
    ) {
      console.log('No user found, redirecting to login. Pathname:', pathname)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from login page
    if (user && pathname === '/login') {
      console.log('User logged in, redirecting from login to home')
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Log successful auth check (only in development)
    if (user && process.env.NODE_ENV === 'development') {
      console.log('User authenticated:', user.email, 'Path:', pathname)
    }
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, redirect to login for security (except for login/auth/profile routes)
    const pathname = request.nextUrl.pathname
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

