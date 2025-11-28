import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'

/**
 * GET /api/calendar/callback
 * Handles OAuth callback from Google
 * Exchanges authorization code for access token + refresh token
 * Stores refresh token in Supabase user metadata
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // User ID
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      const errorDescription = searchParams.get('error_description') || error
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?calendar_auth=error&error=${encodeURIComponent(errorDescription)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?calendar_auth=error&error=${encodeURIComponent('No authorization code received')}`
      )
    }

    // Authenticate user and verify state
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?calendar_auth=error&error=${encodeURIComponent('Authentication required')}`
      )
    }

    // Verify state matches user ID (security check)
    if (state && state !== user.id) {
      console.error('State mismatch:', { state, userId: user.id })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?calendar_auth=error&error=${encodeURIComponent('Invalid state parameter')}`
      )
    }

    // Get OAuth credentials
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?calendar_auth=error&error=${encodeURIComponent('Google OAuth credentials not configured')}`
      )
    }

    // Get redirect URI (must match the one used in auth endpoint)
    const redirectUri = `${request.nextUrl.origin}/api/calendar/callback`
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.refresh_token) {
      console.warn('No refresh token received. This may happen if user has already granted access.')
      // If we don't get a refresh token, we can still use the access token
      // but we'll need to prompt for consent again later
    }

    // Store refresh token in Supabase user metadata
    // Only update if we got a refresh token
    if (tokens.refresh_token) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          google_calendar_refresh_token: tokens.refresh_token,
          google_calendar_token_updated_at: new Date().toISOString(),
        }
      })

      if (updateError) {
        console.error('Error storing refresh token:', updateError)
        return NextResponse.redirect(
          `${request.nextUrl.origin}/?calendar_auth=error&error=${encodeURIComponent('Failed to store refresh token')}`
        )
      }
    }

    // Also cache the access token temporarily in localStorage (will be handled by client)
    // The access token will be returned via the refresh endpoint

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?calendar_auth=success`
    )
  } catch (error: any) {
    console.error('Error in calendar OAuth callback:', error)
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?calendar_auth=error&error=${encodeURIComponent(error.message || 'Failed to complete authentication')}`
    )
  }
}

