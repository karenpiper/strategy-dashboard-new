import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Initialize Google Calendar API
function getCalendarClient() {
  // Try service account JSON first, then fallback to individual vars
  let clientEmail: string
  let privateKey: string
  
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson)
      clientEmail = parsed.client_email
      privateKey = parsed.private_key
    } catch (error) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON')
    }
  } else {
    clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || ''
    privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Google Calendar authentication required: either GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY must be set'
    )
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
  })

  return google.calendar({ version: 'v3', auth })
}

export const runtime = 'nodejs'

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  description?: string
  calendarId: string
  calendarName?: string
}

/**
 * GET /api/calendar
 * Fetches events from multiple Google Calendars
 * Query params:
 *   - calendarIds: comma-separated list of calendar IDs (default: primary calendar)
 *   - timeMin: ISO string for start time (default: now)
 *   - timeMax: ISO string for end time (default: 7 days from now)
 *   - maxResults: max number of results per calendar (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get calendar IDs from query params or use primary calendar
    const calendarIdsParam = searchParams.get('calendarIds')
    const calendarIds = calendarIdsParam 
      ? calendarIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : ['primary']
    
    // Get time range (default: now to 7 days from now)
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const maxResults = parseInt(searchParams.get('maxResults') || '10')

    const calendar = getCalendarClient()
    const allEvents: CalendarEvent[] = []

    // Fetch events from each calendar
    for (const calendarId of calendarIds) {
      try {
        const response = await calendar.events.list({
          calendarId: calendarId,
          timeMin: timeMin,
          timeMax: timeMax,
          maxResults: maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        })

        const events = response.data.items || []
        
        // Get calendar name
        let calendarName: string | undefined
        try {
          const calendarInfo = await calendar.calendars.get({
            calendarId: calendarId,
          })
          calendarName = calendarInfo.data.summary || undefined
        } catch (error) {
          // If we can't get calendar name, continue without it
          console.warn(`Could not fetch calendar name for ${calendarId}`)
        }

        // Transform events to our format
        const transformedEvents: CalendarEvent[] = events.map((event) => ({
          id: event.id || '',
          summary: event.summary || 'No Title',
          start: {
            dateTime: event.start?.dateTime || undefined,
            date: event.start?.date || undefined,
          },
          end: {
            dateTime: event.end?.dateTime || undefined,
            date: event.end?.date || undefined,
          },
          location: event.location || undefined,
          description: event.description || undefined,
          calendarId: calendarId,
          calendarName: calendarName,
        }))

        allEvents.push(...transformedEvents)
      } catch (error: any) {
        console.error(`Error fetching events from calendar ${calendarId}:`, error)
        // Continue with other calendars even if one fails
      }
    }

    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aStart = a.start.dateTime || a.start.date || ''
      const bStart = b.start.dateTime || b.start.date || ''
      return aStart.localeCompare(bStart)
    })

    return NextResponse.json({
      events: allEvents,
      count: allEvents.length,
    })
  } catch (error: any) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch calendar events',
      },
      { status: 500 }
    )
  }
}

