import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/calendar/sync-scheduled
 * Scheduled sync endpoint for automated background syncing via cron
 * Uses service account authentication (no user OAuth required)
 * 
 * This endpoint should be called by Vercel Cron or similar scheduling service
 * Example Vercel Cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/calendar/sync-scheduled",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a scheduled request (optional security check)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If CRON_SECRET is set, require it (for Vercel Cron, this is automatically set)
      // For manual testing, you can skip this check
      const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')
      if (!isVercelCron && cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Get calendar IDs from env var
    const calendarIds = process.env.GOOGLE_CALENDAR_IDS?.split(',').map(id => id.trim()).filter(Boolean) || []
    
    if (calendarIds.length === 0) {
      console.warn('⚠️ No calendar IDs configured in GOOGLE_CALENDAR_IDS env var')
      return NextResponse.json({
        success: false,
        error: 'No calendar IDs configured. Set GOOGLE_CALENDAR_IDS env var.',
      })
    }

    // Calculate time range: now to 60 days from now (sync more for scheduled jobs)
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // Call the sync endpoint internally
    const syncUrl = new URL('/api/calendar/sync', request.nextUrl.origin)
    syncUrl.searchParams.set('calendarIds', calendarIds.join(','))
    syncUrl.searchParams.set('timeMin', timeMin)
    syncUrl.searchParams.set('timeMax', timeMax)
    syncUrl.searchParams.set('maxResults', '500') // More results for scheduled sync

    console.log(`🔄 Starting scheduled calendar sync for ${calendarIds.length} calendar(s)`)
    
    const syncResponse = await fetch(syncUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!syncResponse.ok) {
      const errorData = await syncResponse.json().catch(() => ({ error: 'Unknown error' }))
      console.error('❌ Scheduled sync failed:', errorData)
      return NextResponse.json({
        success: false,
        error: errorData.error || 'Sync failed',
      }, { status: syncResponse.status })
    }

    const syncResult = await syncResponse.json()
    console.log(`✅ Scheduled sync completed:`, syncResult)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...syncResult,
    })
  } catch (error: any) {
    console.error('❌ Error in scheduled calendar sync:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run scheduled sync',
      },
      { status: 500 }
    )
  }
}


