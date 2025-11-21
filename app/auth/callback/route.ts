import { createClient } from '@/lib/supabase/server'
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
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
      }

      // Successfully authenticated, redirect to home
      return NextResponse.redirect(`${origin}/`)
    } catch (error: any) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`)
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}

