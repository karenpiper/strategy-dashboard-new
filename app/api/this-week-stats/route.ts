import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - Fetch this week stats configuration and calculated values
 * Returns the 3 stats with their current values
 */
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

    // Fetch stat configurations - only positions 1-3
    const { data: statsConfig, error: configError } = await supabase
      .from('this_week_stats')
      .select('*')
      .gte('position', 1)
      .lte('position', 3)
      .order('position', { ascending: true })

    if (configError) {
      console.error('Error fetching this week stats config:', configError)
      return NextResponse.json(
        { error: 'Failed to fetch stats configuration', details: configError.message },
        { status: 500 }
      )
    }

    // If no stats configured, return empty array
    if (!statsConfig || statsConfig.length === 0) {
      return NextResponse.json({ stats: [] })
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

    // Calculate database stat values
    const statsWithValues = await Promise.all(
      statsConfig.map(async (stat) => {
        if (stat.stat_type === 'custom') {
          return {
            id: stat.id,
            position: stat.position,
            stat_type: stat.stat_type,
            title: stat.custom_title || '',
            value: stat.custom_value || '0',
            database_stat_key: null,
          }
        }

        // Calculate database stat value
        let value = '0'
        let title = ''

        switch (stat.database_stat_key) {
          case 'active_pitches':
            // Count pipeline projects with status "In Progress"
            const { count: activeCount } = await supabase
              .from('pipeline_projects')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'In Progress')
            value = (activeCount || 0).toString()
            title = 'active pitches'
            break

          case 'new_business':
            // Count pipeline projects created in last 7 days
            const { count: newBusinessCount } = await supabase
              .from('pipeline_projects')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', sevenDaysAgoISO)
            value = (newBusinessCount || 0).toString()
            title = 'new business'
            break

          case 'pitches_due':
            // Count pipeline projects with due date in next 7 days
            const { count: pitchesDueCount } = await supabase
              .from('pipeline_projects')
              .select('*', { count: 'exact', head: true })
              .gte('due_date', todayStr)
              .lte('due_date', sevenDaysFromNowStr)
              .not('due_date', 'is', null)
            value = (pitchesDueCount || 0).toString()
            title = 'pitches due'
            break

          case 'total_team_members':
            // Count active team members from profiles (is_active = true, or all if is_active doesn't exist)
            const { count: teamMembersCount } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .or('is_active.eq.true,is_active.is.null')
            value = (teamMembersCount || 0).toString()
            title = 'total team members'
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
              title = 'total birthdays'
              break
            }

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
            title = 'total birthdays'
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
              title = 'total anniversaries'
              break
            }

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
            title = 'total anniversaries'
            break
          }

          case 'total_snaps':
            // Count snaps created in last 7 days
            const { count: snapsCount } = await supabase
              .from('snaps')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', sevenDaysAgoISO)
            value = (snapsCount || 0).toString()
            title = 'total snaps'
            break

          case 'won_projects':
            // Count projects won in last 7 days (check updated_at when status changed to Won)
            const { count: wonCount } = await supabase
              .from('pipeline_projects')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'Won')
              .gte('updated_at', sevenDaysAgoISO)
            value = (wonCount || 0).toString()
            title = 'won projects'
            break

          case 'total_work_samples':
            // Count work samples created in last 7 days
            const { count: workSamplesCount } = await supabase
              .from('work_samples')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', sevenDaysAgoISO)
            value = (workSamplesCount || 0).toString()
            title = 'total work samples'
            break

          case 'total_resources':
            // Count resources created in last 7 days
            const { count: resourcesCount } = await supabase
              .from('resources')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', sevenDaysAgoISO)
            value = (resourcesCount || 0).toString()
            title = 'total resources'
            break

          default:
            value = '0'
            title = 'unknown'
        }

        return {
          id: stat.id,
          position: stat.position,
          stat_type: stat.stat_type,
          title,
          value,
          database_stat_key: stat.database_stat_key,
        }
      })
    )

    return NextResponse.json({ stats: statsWithValues })
  } catch (error: any) {
    console.error('Error in this week stats API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch this week stats', details: error.toString() },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update this week stats configuration
 * Expects an array of 3 stat configurations
 */
export async function PUT(request: NextRequest) {
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
    const { stats } = body

    if (!Array.isArray(stats) || stats.length !== 3) {
      return NextResponse.json(
        { error: 'Must provide exactly 3 stats' },
        { status: 400 }
      )
    }

    // Validate positions are 1-3
    const positions = stats.map((s: any) => s.position).sort()
    if (JSON.stringify(positions) !== JSON.stringify([1, 2, 3])) {
      return NextResponse.json(
        { error: 'Stats must have positions 1, 2, and 3' },
        { status: 400 }
      )
    }

    // Validate each stat
    for (const stat of stats) {
      if (!stat.position || stat.position < 1 || stat.position > 3) {
        return NextResponse.json(
          { error: `Invalid position for stat: ${stat.position}` },
          { status: 400 }
        )
      }
      if (!stat.stat_type || !['database', 'custom'].includes(stat.stat_type)) {
        return NextResponse.json(
          { error: `Invalid stat_type for position ${stat.position}` },
          { status: 400 }
        )
      }
      if (stat.stat_type === 'database' && !stat.database_stat_key) {
        return NextResponse.json(
          { error: `database_stat_key required for database stat at position ${stat.position}` },
          { status: 400 }
        )
      }
      if (stat.stat_type === 'custom' && (!stat.custom_title || !stat.custom_value)) {
        return NextResponse.json(
          { error: `custom_title and custom_value required for custom stat at position ${stat.position}` },
          { status: 400 }
        )
      }
    }

    // Delete existing stats
    const { error: deleteError } = await supabase
      .from('this_week_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.error('Error deleting existing stats:', deleteError)
      return NextResponse.json(
        { error: 'Failed to update stats', details: deleteError.message },
        { status: 500 }
      )
    }

    // Insert new stats
    const statsToInsert = stats.map((stat: any) => ({
      position: stat.position,
      stat_type: stat.stat_type,
      database_stat_key: stat.stat_type === 'database' ? stat.database_stat_key : null,
      custom_title: stat.stat_type === 'custom' ? stat.custom_title : null,
      custom_value: stat.stat_type === 'custom' ? stat.custom_value : null,
      created_by: user.id,
    }))

    const { data: insertedStats, error: insertError } = await supabase
      .from('this_week_stats')
      .insert(statsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting new stats:', insertError)
      return NextResponse.json(
        { error: 'Failed to save stats', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      stats: insertedStats 
    })
  } catch (error: any) {
    console.error('Error updating this week stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update this week stats', details: error.toString() },
      { status: 500 }
    )
  }
}

