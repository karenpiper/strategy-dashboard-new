import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - Get curator assignment history and rotation status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get recent curator assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('curator_assignments')
      .select(`
        id,
        playlist_id,
        curator_name,
        curator_profile_id,
        assignment_date,
        is_manual_override,
        assigned_by,
        created_at,
        playlists(id, date, title, spotify_url)
      `)
      .order('assignment_date', { ascending: false })
      .limit(limit)

    if (assignmentsError) {
      console.error('Error fetching curator assignments:', assignmentsError)
      return NextResponse.json(
        { error: assignmentsError.message },
        { status: 500 }
      )
    }

    // Get all active team members for rotation tracking
    const { data: teamMembers, error: teamError } = await supabase
      .from('profiles')
      .select('id, full_name, email, discipline, role, hierarchy_level, avatar_url, is_active')
      .eq('is_active', true)
      .not('full_name', 'is', null)

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json(
        { error: teamError.message },
        { status: 500 }
      )
    }

    // Calculate rotation status - who has been assigned recently
    const recentAssignments = assignments?.slice(0, teamMembers?.length || 0) || []
    const recentlyAssigned = new Set(
      recentAssignments.map(a => a.curator_name.toLowerCase().trim())
    )

    // Get curator counts per person
    const curatorCounts: Record<string, number> = {}
    assignments?.forEach(assignment => {
      const name = assignment.curator_name.toLowerCase().trim()
      curatorCounts[name] = (curatorCounts[name] || 0) + 1
    })

    return NextResponse.json({
      assignments: assignments || [],
      teamMembers: teamMembers || [],
      rotationStatus: {
        recentlyAssigned: Array.from(recentlyAssigned),
        curatorCounts,
        totalAssignments: assignments?.length || 0
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/curator-assignment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Assign a curator (random or manual override)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { playlist_id, curator_name, curator_profile_id, assignment_date, is_manual_override } = body

    // Validate required fields
    // For manual override, curator_name is required
    // For random assignment, only assignment_date is required
    if (is_manual_override && !curator_name) {
      return NextResponse.json(
        { error: 'Missing required field: curator_name is required for manual assignment' },
        { status: 400 }
      )
    }

    if (!assignment_date) {
      return NextResponse.json(
        { error: 'Missing required field: assignment_date is required' },
        { status: 400 }
      )
    }

    // Check if user is admin or leader
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'leader'].includes(profile.base_role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins and leaders can assign curators' },
        { status: 403 }
      )
    }

    // Look up curator profile if only name is provided
    let finalCuratorProfileId = curator_profile_id
    if (!finalCuratorProfileId && curator_name) {
      const { data: lookupProfile } = await supabase
        .from('profiles')
        .select('id, special_access')
        .or(`full_name.ilike.%${curator_name}%,email.ilike.%${curator_name}%`)
        .limit(1)
        .single()
      
      if (lookupProfile) {
        finalCuratorProfileId = lookupProfile.id
      }
    }

    // Grant curator permissions to the assigned person
    if (finalCuratorProfileId) {
      const { data: curatorProfileData } = await supabase
        .from('profiles')
        .select('special_access')
        .eq('id', finalCuratorProfileId)
        .single()

      if (curatorProfileData) {
        const specialAccess = curatorProfileData.special_access || []
        if (!specialAccess.includes('curator')) {
          await supabase
            .from('profiles')
            .update({
              special_access: [...specialAccess, 'curator']
            })
            .eq('id', finalCuratorProfileId)
        }
      }
    }

    // If manual override, just assign directly
    if (is_manual_override) {
      // Calculate start_date (assignment_date + 3 days) and end_date (start_date + 7 days)
      const assignmentDateObj = new Date(assignment_date)
      const startDateObj = new Date(assignmentDateObj)
      startDateObj.setDate(startDateObj.getDate() + 3)
      const endDateObj = new Date(startDateObj)
      endDateObj.setDate(endDateObj.getDate() + 7)

      const start_date = startDateObj.toISOString().split('T')[0]
      const end_date = endDateObj.toISOString().split('T')[0]
      // Calculate start_date (assignment_date + 3 days) and end_date (start_date + 7 days)
      const assignmentDateObj = new Date(assignment_date)
      const startDateObj = new Date(assignmentDateObj)
      startDateObj.setDate(startDateObj.getDate() + 3)
      const endDateObj = new Date(startDateObj)
      endDateObj.setDate(endDateObj.getDate() + 7)

      const start_date = startDateObj.toISOString().split('T')[0]
      const end_date = endDateObj.toISOString().split('T')[0]

      // Check for overlapping assignments
      const { data: existing } = await supabase
        .from('curator_assignments')
        .select('id')
        .or(`start_date.lte.${end_date},end_date.gte.${start_date}`)
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'A curator is already assigned for this period' },
          { status: 400 }
        )
      }

      const { data: assignment, error } = await supabase
        .from('curator_assignments')
        .insert({
          curator_name,
          curator_profile_id: finalCuratorProfileId || null,
          assignment_date,
          start_date,
          end_date,
          is_manual_override: true,
          assigned_by: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating curator assignment:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      // Send Slack notification if curator has slack_id
      if (finalCuratorProfileId && assignment) {
        const { data: curatorProfile } = await supabase
          .from('profiles')
          .select('slack_id, full_name')
          .eq('id', finalCuratorProfileId)
          .single()

        if (curatorProfile?.slack_id) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const curationUrl = `${baseUrl}/curate?assignment=${assignment.id}`
          
          try {
            await fetch(`${baseUrl}/api/slack/notify-curator`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slack_id: curatorProfile.slack_id,
                curator_name: curatorProfile.full_name || curator_name,
                curation_url: curationUrl,
                start_date,
                end_date
              })
            })
          } catch (slackError) {
            console.error('Error sending Slack notification:', slackError)
            // Don't fail the assignment if Slack fails
          }
        }
      }

      return NextResponse.json({ assignment })
    }

    // Calculate start_date (assignment_date + 3 days) and end_date (start_date + 7 days)
    const assignmentDateObj = new Date(assignment_date)
    const startDateObj = new Date(assignmentDateObj)
    startDateObj.setDate(startDateObj.getDate() + 3)
    const endDateObj = new Date(startDateObj)
    endDateObj.setDate(endDateObj.getDate() + 7)

    const start_date = startDateObj.toISOString().split('T')[0]
    const end_date = endDateObj.toISOString().split('T')[0]

    // Check for overlapping assignments
    const { data: existing } = await supabase
      .from('curator_assignments')
      .select('id')
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A curator is already assigned for this period' },
        { status: 400 }
      )
    }

    // Otherwise, use random selection
    const selectedCurator = await selectRandomCurator(supabase, assignment_date)

    if (!selectedCurator) {
      return NextResponse.json(
        { error: 'No eligible curators found' },
        { status: 400 }
      )
    }

    // Grant curator permissions
    const { data: selectedCuratorProfile } = await supabase
      .from('profiles')
      .select('special_access')
      .eq('id', selectedCurator.id)
      .single()

    if (selectedCuratorProfile) {
      const specialAccess = selectedCuratorProfile.special_access || []
      if (!specialAccess.includes('curator')) {
        await supabase
          .from('profiles')
          .update({
            special_access: [...specialAccess, 'curator']
          })
          .eq('id', selectedCurator.id)
      }
    }

    // Calculate start_date (assignment_date + 3 days) and end_date (start_date + 7 days)
    const assignmentDateObj = new Date(assignment_date)
    const startDateObj = new Date(assignmentDateObj)
    startDateObj.setDate(startDateObj.getDate() + 3)
    const endDateObj = new Date(startDateObj)
    endDateObj.setDate(endDateObj.getDate() + 7)

    const start_date = startDateObj.toISOString().split('T')[0]
    const end_date = endDateObj.toISOString().split('T')[0]

    // Create assignment (no playlist_id - curator is independent)
    const { data: assignment, error } = await supabase
      .from('curator_assignments')
      .insert({
        curator_name: selectedCurator.full_name,
        curator_profile_id: selectedCurator.id,
        assignment_date,
        start_date,
        end_date,
        is_manual_override: false,
        assigned_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating curator assignment:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Send Slack notification
    const { data: curatorProfile } = await supabase
      .from('profiles')
      .select('slack_id, full_name')
      .eq('id', selectedCurator.id)
      .single()

    if (curatorProfile?.slack_id) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const curationUrl = `${baseUrl}/curate?assignment=${assignment.id}`
      
      try {
        await fetch(`${baseUrl}/api/slack/notify-curator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slack_id: curatorProfile.slack_id,
            curator_name: curatorProfile.full_name || selectedCurator.full_name,
            curation_url: curationUrl,
            start_date,
            end_date
          })
        })
      } catch (slackError) {
        console.error('Error sending Slack notification:', slackError)
        // Don't fail the assignment if Slack fails
      }
    }

    return NextResponse.json({ 
      assignment,
      selectedCurator: {
        id: selectedCurator.id,
        full_name: selectedCurator.full_name,
        avatar_url: selectedCurator.avatar_url
      }
    })
  } catch (error: any) {
    console.error('Error in POST /api/curator-assignment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Select a random curator ensuring fair rotation
 * Uses cryptographically secure random number generation
 */
async function selectRandomCurator(
  supabase: any,
  assignmentDate: string
): Promise<{ id: string; full_name: string; avatar_url: string | null; discipline: string | null; role: string | null } | null> {
  // Get all active team members
  const { data: teamMembers, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, discipline, role, hierarchy_level, avatar_url, is_active')
    .eq('is_active', true)
    .not('full_name', 'is', null)

  if (error || !teamMembers || teamMembers.length === 0) {
    console.error('Error fetching team members:', error)
    return null
  }

  // Get recent curator assignments (last N assignments where N = team size)
  const { data: recentAssignments } = await supabase
    .from('curator_assignments')
    .select('curator_name, assignment_date')
    .order('assignment_date', { ascending: false })
    .limit(teamMembers.length)

  // Create a set of recently assigned curators (normalized to lowercase)
  const recentlyAssigned = new Set(
    (recentAssignments || []).map(a => a.curator_name.toLowerCase().trim())
  )

  // Filter out recently assigned curators
  let eligibleCurators = teamMembers.filter(member => {
    const name = member.full_name?.toLowerCase().trim()
    return name && !recentlyAssigned.has(name)
  })

  // If everyone has been assigned recently, reset and use all team members
  if (eligibleCurators.length === 0) {
    eligibleCurators = teamMembers
  }

  // Use cryptographically secure random number generation
  const randomBytes = new Uint32Array(1)
  crypto.getRandomValues(randomBytes)
  
  // Convert to float between 0 and 1
  const random = randomBytes[0] / (0xFFFFFFFF + 1)
  
  // Select random curator
  const selectedIndex = Math.floor(random * eligibleCurators.length)
  const selected = eligibleCurators[selectedIndex]

  if (!selected || !selected.full_name) {
    return null
  }

  return {
    id: selected.id,
    full_name: selected.full_name,
    avatar_url: selected.avatar_url || null,
    discipline: selected.discipline || null,
    role: selected.role || null
  }
}

