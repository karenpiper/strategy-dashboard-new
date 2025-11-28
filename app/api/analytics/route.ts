import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30

    // Calculate date ranges
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
    const startDateISO = startDate.toISOString()
    const startDateStr = startDate.toISOString().split('T')[0]

    // 1. LOGINS - Get login data from analytics_events
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, created_at')
      .order('created_at', { ascending: false })

    const totalUsers = profiles?.length || 0
    
    // Get login events from analytics_events table
    const { data: loginEvents, error: loginEventsError } = await supabase
      .from('analytics_events')
      .select('user_id, created_at')
      .eq('event_type', 'login')
      .gte('created_at', startDateISO)
      .order('created_at', { ascending: false })

    // Count unique users who logged in during period
    const uniqueLoginUsers = new Set(loginEvents?.map(e => e.user_id).filter(Boolean) || []).size
    
    // Get login events over time (daily)
    const loginsByDate: Record<string, number> = {}
    loginEvents?.forEach(event => {
      if (!event.created_at) return
      const dateKey = new Date(event.created_at).toISOString().split('T')[0]
      loginsByDate[dateKey] = (loginsByDate[dateKey] || 0) + 1
    })

    // Get login counts per user with profile data
    const loginCountsPerUser: Record<string, number> = {}
    loginEvents?.forEach(event => {
      if (event.user_id) {
        loginCountsPerUser[event.user_id] = (loginCountsPerUser[event.user_id] || 0) + 1
      }
    })

    // Fetch profile data for users with logins
    const userIdsWithLogins = Object.keys(loginCountsPerUser)
    const loginUsersWithProfiles: Array<{ userId: string; count: number; full_name: string | null; email: string | null; avatar_url: string | null }> = []
    
    if (userIdsWithLogins.length > 0) {
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIdsWithLogins)
      
      userIdsWithLogins.forEach(userId => {
        const profile = userProfiles?.find(p => p.id === userId)
        loginUsersWithProfiles.push({
          userId,
          count: loginCountsPerUser[userId],
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null
        })
      })
      
      // Sort by count descending
      loginUsersWithProfiles.sort((a, b) => b.count - a.count)
    }

    // New signups (from profiles table)
    const newSignups = profiles?.filter(p => {
      if (!p.created_at) return false
      return new Date(p.created_at) >= startDate
    }).length || 0

    // 2. ROLLING SENTIMENT - Get team pulse data
    // Calculate current week start (Monday)
    const currentWeekStart = new Date(now)
    const dayOfWeek = currentWeekStart.getDay()
    const diff = currentWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(currentWeekStart.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    const currentWeekKey = weekStart.toISOString().split('T')[0]

    // Get current week responses
    const { data: currentWeekResponses } = await supabase
      .from('team_pulse_responses')
      .select('score')
      .eq('week_key', currentWeekKey)

    let currentMood = 0
    let currentWeekResponseCount = 0
    if (currentWeekResponses && currentWeekResponses.length > 0) {
      currentMood = Math.round(
        currentWeekResponses.reduce((sum, r) => sum + r.score, 0) / currentWeekResponses.length
      )
      currentWeekResponseCount = currentWeekResponses.length
    }

    // Get historical sentiment (multiple weeks)
    const weeksToFetch = Math.ceil(days / 7)
    const historicalSentiment: Array<{ week: string; mood: number; responses: number }> = []
    
    for (let i = 0; i < weeksToFetch; i++) {
      const weekDate = new Date(now)
      weekDate.setDate(weekDate.getDate() - (i * 7))
      const weekDayOfWeek = weekDate.getDay()
      const weekDiff = weekDate.getDate() - weekDayOfWeek + (weekDayOfWeek === 0 ? -6 : 1)
      const historicalWeekStart = new Date(weekDate.setDate(weekDiff))
      historicalWeekStart.setHours(0, 0, 0, 0)
      const weekKey = historicalWeekStart.toISOString().split('T')[0]

      const { data: weekResponses } = await supabase
        .from('team_pulse_responses')
        .select('score')
        .eq('week_key', weekKey)

      if (weekResponses && weekResponses.length > 0) {
        const avgMood = weekResponses.reduce((sum, r) => sum + r.score, 0) / weekResponses.length
        historicalSentiment.push({
          week: weekKey,
          mood: Math.round(avgMood),
          responses: weekResponses.length
        })
      }
    }

    // 3. SNAPS - Get snap statistics
    const { data: allSnaps, error: snapsError } = await supabase
      .from('snaps')
      .select('id, created_at, date, submitted_by, mentioned_user_id')
      .order('created_at', { ascending: false })

    const totalSnaps = allSnaps?.length || 0
    const snapsInPeriod = allSnaps?.filter(s => {
      if (!s.created_at) return false
      return new Date(s.created_at) >= startDate
    }).length || 0

    // Snaps over time (daily)
    const snapsByDate: Record<string, number> = {}
    allSnaps?.forEach(snap => {
      if (!snap.date) return
      const dateKey = snap.date
      snapsByDate[dateKey] = (snapsByDate[dateKey] || 0) + 1
    })

    // Snaps per user
    const snapsPerUser: Record<string, number> = {}
    allSnaps?.forEach(snap => {
      if (snap.submitted_by) {
        snapsPerUser[snap.submitted_by] = (snapsPerUser[snap.submitted_by] || 0) + 1
      }
    })

    // 4. ADDITIONAL METRICS
    // Work samples
    const { count: totalWorkSamples } = await supabase
      .from('work_samples')
      .select('*', { count: 'exact', head: true })
    
    const { count: workSamplesInPeriod } = await supabase
      .from('work_samples')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateISO)

    // Must reads
    const { count: totalMustReads } = await supabase
      .from('must_reads')
      .select('*', { count: 'exact', head: true })
    
    const { count: mustReadsInPeriod } = await supabase
      .from('must_reads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateISO)

    // Resources
    const { count: totalResources } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
    
    const { count: resourcesInPeriod } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateISO)

    // Playground tool views
    const { count: totalToolViews } = await supabase
      .from('playground_tool_views')
      .select('*', { count: 'exact', head: true })
    
    const { count: toolViewsInPeriod } = await supabase
      .from('playground_tool_views')
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', startDateISO)

    // Team pulse response rate
    const { count: uniqueUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    
    const { data: currentWeekResponseUsers } = await supabase
      .from('team_pulse_responses')
      .select('user_id')
      .eq('week_key', currentWeekKey)

    const uniqueResponders = new Set(currentWeekResponseUsers?.map(r => r.user_id) || []).size
    const responseRate = uniqueUsers ? (uniqueResponders / uniqueUsers) * 100 : 0

    // Format snaps over time for chart
    const snapsOverTime = Object.entries(snapsByDate)
      .filter(([date]) => date >= startDateStr)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      period: {
        days,
        startDate: startDateStr,
        endDate: now.toISOString().split('T')[0]
      },
      logins: {
        totalUsers,
        newSignups,
        activeUsers: uniqueLoginUsers, // Users who logged in during period
        totalLogins: loginEvents?.length || 0,
        loginsOverTime: Object.entries(loginsByDate)
          .filter(([date]) => date >= startDateStr)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        loginsPerUser: loginUsersWithProfiles.slice(0, 10) // Top 10
      },
      sentiment: {
        current: currentMood,
        historical: historicalSentiment.reverse(), // Oldest first
        responseRate: Math.round(responseRate),
        currentWeekResponses: currentWeekResponseCount
      },
      snaps: {
        total: totalSnaps,
        inPeriod: snapsInPeriod,
        overTime: snapsOverTime,
        perUser: Object.entries(snapsPerUser)
          .map(([userId, count]) => ({ userId, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10) // Top 10
      },
      content: {
        workSamples: {
          total: totalWorkSamples || 0,
          inPeriod: workSamplesInPeriod || 0
        },
        mustReads: {
          total: totalMustReads || 0,
          inPeriod: mustReadsInPeriod || 0
        },
        resources: {
          total: totalResources || 0,
          inPeriod: resourcesInPeriod || 0
        }
      },
      engagement: {
        toolViews: {
          total: totalToolViews || 0,
          inPeriod: toolViewsInPeriod || 0
        },
        teamPulseResponseRate: Math.round(responseRate)
      }
    })
  } catch (error: any) {
    console.error('Error in analytics API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics', details: error.toString() },
      { status: 500 }
    )
  }
}

