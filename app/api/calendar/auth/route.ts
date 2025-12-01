import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'

/**
 * GET /api/calendar/auth
 * Initiates OAuth2 flow with access_type=offline to get refresh tokens
 * Redirects to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get OAuth credentials
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured' },
        { status: 500 }
      )
    }

    // Get redirect URI from query params or use default
    const { searchParams } = new URL(request.url)
    const redirectUri = searchParams.get('redirect_uri') || `${request.nextUrl.origin}/api/calendar/callback`
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // Generate authorization URL with offline access to get refresh token
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly']
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required to get refresh token
      prompt: 'consent', // Force consent screen to ensure we get refresh token
      scope: scopes,
      state: user.id, // Include user ID in state for verification
    })

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Error initiating calendar OAuth:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate calendar authentication' },
      { status: 500 }
    )
  }
}


