import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'

/**
 * GET /api/calendar/refresh
 * Refreshes access token using stored refresh token
 * Returns new access token and expiry time
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

    // Get refresh token from user metadata
    const refreshToken = user.user_metadata?.google_calendar_refresh_token
    
    if (!refreshToken) {
      return NextResponse.json(
        { 
          error: 'No refresh token found. Please re-authenticate.',
          needsAuth: true
        },
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

    // Get redirect URI (must match the one used in auth endpoint)
    const redirectUri = `${request.nextUrl.origin}/api/calendar/callback`
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    // Refresh the access token
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 500 }
        )
      }

      // Calculate expiry time (default to 1 hour if not provided)
      const expiresIn = credentials.expiry_date 
        ? credentials.expiry_date 
        : Date.now() + (3600 * 1000) // 1 hour from now
      
      return NextResponse.json({
        accessToken: credentials.access_token,
        expiresAt: expiresIn,
        expiresIn: Math.floor((expiresIn - Date.now()) / 1000), // seconds until expiry
      })
    } catch (refreshError: any) {
      // Handle refresh token expiration or revocation
      if (refreshError.message?.includes('invalid_grant') || 
          refreshError.message?.includes('Token has been expired or revoked')) {
        console.error('Refresh token expired or revoked:', refreshError)
        
        // Clear the invalid refresh token from user metadata
        await supabase.auth.updateUser({
          data: {
            google_calendar_refresh_token: null,
          }
        })
        
        return NextResponse.json(
          { 
            error: 'Refresh token expired or revoked. Please re-authenticate.',
            needsAuth: true
          },
          { status: 401 }
        )
      }
      
      throw refreshError
    }
  } catch (error: any) {
    console.error('Error refreshing calendar token:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refresh access token' },
      { status: 500 }
    )
  }
}

