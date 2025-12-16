import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

// Calendar API uses OAuth tokens (primary) with optional database fallback
// OAuth tokens are required for accessing user's calendars

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
 * Fetches events from Google Calendar using OAuth token (primary)
 * Falls back to database if OAuth token not available
 * Query params:
 *   - calendarIds: comma-separated list of calendar IDs (default: primary calendar)
 *   - timeMin: ISO string for start time (default: now)
 *   - timeMax: ISO string for end time (default: 7 days from now)
 *   - maxResults: max number of results per calendar (default: 10)
 *   - accessToken: Google OAuth access token (required for OAuth flow)
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

    // Access token from OAuth (primary method)
    const accessToken = searchParams.get('accessToken')
    
    const allEvents: CalendarEvent[] = []
    const successfulCalendars: string[] = []
    const failedCalendars: Array<{ id: string; error: string; isTokenExpired?: boolean }> = []

    // Try OAuth flow first if access token is provided
    if (accessToken) {
      try {
        // Use the provided access token (from user's Google OAuth session)
        console.log('✅ Using provided Google OAuth access token for calendar access')
        const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const oauth2Client = oauthClientId 
          ? new google.auth.OAuth2(oauthClientId)
          : new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken })
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
        
        // Fetch events from each calendar
        for (const calendarId of calendarIds) {
          const decodedCalendarId = decodeURIComponent(calendarId)
          
          try {
            console.log(`Fetching events from calendar: ${decodedCalendarId}`)
            
            const response = await calendar.events.list({
              calendarId: decodedCalendarId,
              timeMin: timeMin,
              timeMax: timeMax,
              maxResults: maxResults,
              singleEvents: true,
              orderBy: 'startTime',
            })

            const events = response.data.items || []
            console.log(`Found ${events.length} events in calendar ${decodedCalendarId}`)
            
            // Get calendar name
            let calendarName: string | undefined
            try {
              const calendarInfo = await calendar.calendars.get({
                calendarId: decodedCalendarId,
              })
              calendarName = calendarInfo.data.summary || undefined
            } catch (error) {
              console.warn(`Could not fetch calendar name for ${decodedCalendarId}:`, error)
            }

            // Transform events to our format
            const transformedEvents: CalendarEvent[] = events.map((event) => {
              // Check if this is an OOO calendar
              const isOOOCalendar = decodedCalendarId.includes('6elnqlt8ok3kmcpim2vge0qqqk') || 
                                    decodedCalendarId.includes('ojeuiov0bhit2k17g8d6gj4i68')
              
              // Remove '[Pending approval] ' prefix from OOO calendar event names
              let summary = event.summary || 'No Title'
              if (isOOOCalendar && summary.startsWith('[Pending approval] ')) {
                summary = summary.replace(/^\[Pending approval\] /, '')
              }
              
              return {
                id: event.id || '',
                summary: summary,
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
                calendarId: decodedCalendarId,
                calendarName: calendarName,
              }
            })

            allEvents.push(...transformedEvents)
            successfulCalendars.push(decodedCalendarId)
          } catch (error: any) {
            const errorDetails = {
              message: error.message,
              code: error.code,
              status: error.response?.status,
              statusText: error.response?.statusText,
            }
            console.error(`Error fetching events from calendar ${decodedCalendarId}:`, error)
            console.error(`Error details:`, errorDetails)
            
            let errorMessage = error.message || 'Unknown error'
            let isTokenExpired = false
            
            // Check for token expiration (401 with Invalid Credentials)
            if ((error.code === 401 || error.status === 401) && accessToken) {
              if (error.message?.includes('Invalid Credentials') || error.message?.includes('invalid_token')) {
                isTokenExpired = true
                errorMessage = 'Access denied - may be token expiration or permissions issue'
                console.error(`⚠️  401 error for calendar ${decodedCalendarId}. Will check if all calendars fail to determine if token expired.`)
              }
            }
            
            // Provide helpful error messages for common issues
            if (error.code === 403 || error.status === 403) {
              if (error.message?.includes('not been used') || error.message?.includes('disabled')) {
                errorMessage = 'Google Calendar API is not enabled'
                console.error(`⚠️  Google Calendar API is not enabled. Enable it at: https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=141888268813`)
              } else {
                errorMessage = 'Permission denied - calendar not accessible with OAuth2 account'
                console.error(`⚠️  Permission denied. Make sure the OAuth2 account has access to this calendar.`)
                console.error(`   Calendar ID: ${decodedCalendarId}`)
              }
            } else if (error.code === 404 || error.status === 404) {
              errorMessage = 'Calendar not found or not accessible'
              console.error(`⚠️  Calendar not found (404).`)
              console.error(`   Calendar ID: ${decodedCalendarId}`)
              console.error(`   Using OAuth2 authentication. Make sure the OAuth2 account has access to this calendar.`)
            }
            
            failedCalendars.push({ 
              id: decodedCalendarId, 
              error: errorMessage,
              isTokenExpired: isTokenExpired 
            })
            // Continue with other calendars even if one fails
          }
        }
      } catch (error: any) {
        console.error('Error in OAuth calendar fetch:', error)
        // Fall through to database fallback
      }
    } else {
      // No access token - try database fallback
      console.log('⚠️ No OAuth token provided, trying database fallback...')
      const supabase = await createClient()
      
      try {
        let syncedQuery = supabase
          .from('synced_calendar_events')
          .select('*')
          .is('deleted_at', null)
        
        if (calendarIds && calendarIds.length > 0) {
          syncedQuery = syncedQuery.in('calendar_id', calendarIds)
        }
        
        const { data: syncedEventsData, error: syncedError } = await syncedQuery

        if (!syncedError && syncedEventsData) {
          const filteredSyncedEvents = syncedEventsData.filter((event) => {
            if (event.is_all_day) {
              const eventStart = event.start_date ? new Date(event.start_date) : null
              const eventEnd = event.end_date ? new Date(event.end_date) : eventStart
              const rangeStart = new Date(timeMin)
              const rangeEnd = new Date(timeMax)
              if (!eventStart) return false
              return eventStart <= rangeEnd && (!eventEnd || eventEnd >= rangeStart)
            } else {
              const eventStart = event.start_date_time ? new Date(event.start_date_time) : null
              const eventEnd = event.end_date_time ? new Date(event.end_date_time) : eventStart
              const rangeStart = new Date(timeMin)
              const rangeEnd = new Date(timeMax)
              if (!eventStart) return false
              return eventStart <= rangeEnd && (!eventEnd || eventEnd >= rangeStart)
            }
          })
          
          const transformedSyncedEvents: CalendarEvent[] = filteredSyncedEvents.map((event) => {
            const isOOOCalendar = event.calendar_id.includes('6elnqlt8ok3kmcpim2vge0qqqk') || 
                                  event.calendar_id.includes('ojeuiov0bhit2k17g8d6gj4i68')
            let summary = event.summary || 'No Title'
            if (isOOOCalendar && summary.startsWith('[Pending approval] ')) {
              summary = summary.replace(/^\[Pending approval\] /, '')
            }
            
            return {
              id: event.google_event_id,
              summary: summary,
              start: {
                dateTime: event.start_date_time || undefined,
                date: event.start_date || undefined,
              },
              end: {
                dateTime: event.end_date_time || undefined,
                date: event.end_date || undefined,
              },
              location: event.location || undefined,
              description: event.description || undefined,
              calendarId: event.calendar_id,
              calendarName: event.calendar_name || undefined,
            }
          })
          
          allEvents.push(...transformedSyncedEvents)
          console.log(`📅 Found ${transformedSyncedEvents.length} events from database fallback`)
        }
      } catch (error: any) {
        console.warn('Error fetching from database fallback:', error)
      }
    }

    // Fetch manual calendar events
    let manualEvents: CalendarEvent[] = []
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Fetch manual events within the same time range
        const minDate = new Date(timeMin).toISOString().split('T')[0]
        const maxDate = new Date(timeMax).toISOString().split('T')[0]
        
        // Fetch events that might overlap with the time range
        // An event overlaps if: start_date <= maxDate AND (end_date >= minDate OR end_date IS NULL)
        // We'll fetch events where start_date <= maxDate and filter in memory
        const { data: manualEventsData, error: manualError } = await supabase
          .from('manual_calendar_events')
          .select('*')
          .lte('start_date', maxDate)
          .order('start_date', { ascending: true })
          .order('start_time', { ascending: true, nullsFirst: false })

        if (!manualError && manualEventsData) {
          // Filter events that actually overlap with the time range
          const filteredManualEvents = manualEventsData.filter((event) => {
            const eventStart = new Date(event.start_date)
            const eventEnd = event.end_date ? new Date(event.end_date) : eventStart
            const rangeStart = new Date(timeMin)
            const rangeEnd = new Date(timeMax)
            
            // Event overlaps if: eventStart <= rangeEnd AND eventEnd >= rangeStart
            return eventStart <= rangeEnd && eventEnd >= rangeStart
          })
          
          // Transform manual events to match CalendarEvent interface
          manualEvents = filteredManualEvents.map((event) => {
            // Build start dateTime or date
            let startDateTime: string | undefined
            let startDate: string | undefined
            
            if (event.is_all_day) {
              startDate = event.start_date
            } else {
              // Combine date and time for dateTime
              if (event.start_time) {
                const [hours, minutes] = event.start_time.split(':')
                const dateObj = new Date(event.start_date)
                dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                startDateTime = dateObj.toISOString()
              } else {
                startDate = event.start_date
              }
            }

            // Build end dateTime or date
            let endDateTime: string | undefined
            let endDate: string | undefined
            const endDateValue = event.end_date || event.start_date
            
            if (event.is_all_day) {
              endDate = endDateValue
            } else {
              if (event.end_time) {
                const [hours, minutes] = event.end_time.split(':')
                const dateObj = new Date(endDateValue)
                dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                endDateTime = dateObj.toISOString()
              } else {
                endDate = endDateValue
              }
            }

            return {
              id: `manual_${event.id}`, // Prefix to avoid conflicts
              summary: event.title,
              start: {
                dateTime: startDateTime,
                date: startDate,
              },
              end: {
                dateTime: endDateTime,
                date: endDate,
              },
              location: event.location || undefined,
              description: event.description || undefined,
              calendarId: 'manual',
              calendarName: 'Manual Events',
            }
          })
          
          console.log(`Found ${manualEvents.length} manual calendar events`)
        } else if (manualError) {
          console.warn('Error fetching manual calendar events:', manualError)
        }
      }
    } catch (error: any) {
      console.warn('Error fetching manual calendar events:', error)
      // Continue without manual events if there's an error
    }

    // Merge manual events with Google Calendar events
    allEvents.push(...manualEvents)

    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aStart = a.start.dateTime || a.start.date || ''
      const bStart = b.start.dateTime || b.start.date || ''
      return aStart.localeCompare(bStart)
    })

    // Determine if token is truly expired
    const failed401Count = failedCalendars.filter(f => f.isTokenExpired).length
    const hasTokenExpiration = accessToken && 
                                successfulCalendars.length === 0 && 
                                failedCalendars.length > 0 && 
                                failed401Count === failedCalendars.length
    
    if (hasTokenExpiration) {
      console.error(`⚠️  Token appears to be expired: All ${failedCalendars.length} calendar(s) failed with 401 errors`)
    } else if (failed401Count > 0 && successfulCalendars.length > 0) {
      console.log(`ℹ️  Some calendars failed with 401, but ${successfulCalendars.length} succeeded. This is likely a permissions issue, not token expiration.`)
    }
    
    return NextResponse.json({
      events: allEvents,
      count: allEvents.length,
      successfulCalendars: successfulCalendars.length,
      failedCalendars: failedCalendars.length,
      failedCalendarDetails: failedCalendars,
      tokenExpired: hasTokenExpiration,
      source: accessToken ? 'oauth' : 'database', // Indicate source
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

