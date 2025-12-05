import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST - Calculate a single stat value by database_stat_key
 * Used for displaying values in the admin panel's available stats bank
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { database_stat_key } = body

    if (!database_stat_key) {
      return NextResponse.json(
        { error: 'database_stat_key is required' },
        { status: 400 }
      )
    }

    // Calculate date ranges for database stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const sevenDaysAgoISO = sevenDaysAgo.toISOString()
    const todayStr = today.toISOString().split('T')[0]
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0]

    let value = '0'

    switch (database_stat_key) {
      case 'active_pitches':
        const { count: activeCount } = await supabase
          .from('pipeline_projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'In Progress')
        value = (activeCount || 0).toString()
        break

      case 'new_business':
        const { count: newBusinessCount } = await supabase
          .from('pipeline_projects')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgoISO)
        value = (newBusinessCount || 0).toString()
        break

      case 'pitches_due':
        const { count: pitchesDueCount } = await supabase
          .from('pipeline_projects')
          .select('*', { count: 'exact', head: true })
          .gte('due_date', todayStr)
          .lte('due_date', sevenDaysFromNowStr)
          .not('due_date', 'is', null)
        value = (pitchesDueCount || 0).toString()
        break

      case 'total_team_members':
        const { count: teamMembersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or('is_active.eq.true,is_active.is.null')
        value = (teamMembersCount || 0).toString()
        break

      case 'total_birthdays': {
        // Get all profiles with birthdays and check if they fall in next 7 days (excluding guests)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('birthday')
          .eq('is_active', true)
          .neq('is_guest', true) // Exclude guests
          .not('birthday', 'is', null)
          .neq('birthday', '')
        
        if (!profiles) {
          value = '0'
          break
        }

        const currentYear = today.getFullYear()
        const next7Days = []
        for (let i = 0; i <= 7; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() + i)
          next7Days.push({
            month: date.getMonth() + 1, // 1-12
            day: date.getDate()
          })
        }

        const birthdaysInNext7Days = profiles.filter(profile => {
          const [month, day] = profile.birthday.split('/').map(Number)
          return next7Days.some(d => d.month === month && d.day === day)
        })

        value = birthdaysInNext7Days.length.toString()
        break
      }

      case 'total_anniversaries': {
        // Get all profiles with start_date and check if anniversary falls in next 7 days (excluding guests)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('start_date')
          .eq('is_active', true)
          .neq('is_guest', true) // Exclude guests
          .not('start_date', 'is', null)
        
        if (!profiles) {
          value = '0'
          break
        }

        const currentYear = today.getFullYear()
        const next7DaysDates = []
        for (let i = 0; i <= 7; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() + i)
          next7DaysDates.push(date)
        }

        const anniversariesInNext7Days = profiles.filter(profile => {
          if (!profile.start_date) return false
          const startDate = new Date(profile.start_date)
          const startMonth = startDate.getMonth() + 1
          const startDay = startDate.getDate()
          
          return next7DaysDates.some(date => {
            return date.getMonth() + 1 === startMonth && date.getDate() === startDay
          })
        })

        value = anniversariesInNext7Days.length.toString()
        break
      }

      case 'total_snaps':
        // Count snaps created in last 7 days
        const { count: snapsCount } = await supabase
          .from('snaps')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgoISO)
        value = (snapsCount || 0).toString()
        break

      case 'won_projects':
        // Count projects won in last 7 days (check updated_at when status changed to Won)
        // We'll check for projects with status Won and updated_at in last 7 days
        const { count: wonCount } = await supabase
          .from('pipeline_projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Won')
          .gte('updated_at', sevenDaysAgoISO)
        value = (wonCount || 0).toString()
        break

      case 'total_work_samples':
        // Count work samples created in last 7 days
        const { count: workSamplesCount } = await supabase
          .from('work_samples')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgoISO)
        value = (workSamplesCount || 0).toString()
        break

      case 'total_resources':
        // Count resources created in last 7 days
        const { count: resourcesCount } = await supabase
          .from('resources')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgoISO)
        value = (resourcesCount || 0).toString()
        break

      default:
        value = '0'
    }

    return NextResponse.json({ value })
  } catch (error: any) {
    console.error('Error calculating stat value:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate stat value', details: error.toString() },
      { status: 500 }
    )
  }
}

