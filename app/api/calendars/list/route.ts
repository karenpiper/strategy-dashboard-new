import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'

/**
 * GET /api/calendars/list
 * Lists all calendars accessible to the authenticated user
 * Query params:
 *   - accessToken: Google OAuth access token (required for user session)
 *   - minAccessRole: minimum access role to filter by (default: 'reader')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('accessToken')
    const minAccessRole = searchParams.get('minAccessRole') || 'reader'

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Get OAuth client ID from environment (optional but recommended)
    const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    
    // Initialize OAuth2 client with client ID if available
    const oauth2Client = oauthClientId 
      ? new google.auth.OAuth2(oauthClientId)
      : new google.auth.OAuth2()
    
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // List all calendars
    console.log(`Fetching calendars with minAccessRole: ${minAccessRole}`)
    const response = await calendar.calendarList.list({
      minAccessRole: minAccessRole as 'owner' | 'writer' | 'reader',
    })
    
    console.log(`Found ${response.data.items?.length || 0} calendars`)

    const calendars = (response.data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      accessRole: cal.accessRole,
      primary: cal.primary || false,
      selected: cal.selected !== false, // Default to true if not specified
    }))

    return NextResponse.json({
      calendars,
      count: calendars.length,
    })
  } catch (error: any) {
    console.error('Error listing calendars:', error)
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to list calendars'
    let statusCode = 500
    
    if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
      errorMessage = 'Invalid or expired access token. Please re-authenticate with calendar permissions.'
      statusCode = 401
    } else if (error.code === 403 || error.message?.includes('Insufficient Permission')) {
      errorMessage = 'Access token does not have calendar permissions. Please grant calendar access.'
      statusCode = 403
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      },
      { status: statusCode }
    )
  }
}

