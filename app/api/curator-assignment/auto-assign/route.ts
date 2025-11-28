import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST - Automatically assign next curator
 * This should be called 3 days before the current curator's period ends
 * Or can be called manually to assign the next curator
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Handle empty body gracefully
    let body = {}
    try {
      const bodyText = await request.text()
      if (bodyText) {
        body = JSON.parse(bodyText)
      }
    } catch {
      // Body is optional, continue with empty object
    }
    
    const { assignment_date } = body

    // If no date provided, calculate: 3 days before the next curator period should start
    // Find the latest curator assignment and calculate from their end_date
    let targetAssignmentDate = assignment_date

    if (!targetAssignmentDate) {
      const { data: latestAssignment } = await supabase
        .from('curator_assignments')
        .select('end_date')
        .order('end_date', { ascending: false })
        .limit(1)
        .single()

      if (latestAssignment?.end_date) {
        // Next curator should be assigned 3 days before current one ends
        const endDate = new Date(latestAssignment.end_date)
        endDate.setDate(endDate.getDate() - 3)
        targetAssignmentDate = endDate.toISOString().split('T')[0]
      } else {
        // No previous assignments, assign for today
        targetAssignmentDate = new Date().toISOString().split('T')[0]
      }
    }

    // Check if there's already an assignment for this period
    const assignmentDateObj = new Date(targetAssignmentDate)
    const startDateObj = new Date(assignmentDateObj)
    startDateObj.setDate(startDateObj.getDate() + 3)
    const endDateObj = new Date(startDateObj)
    endDateObj.setDate(endDateObj.getDate() + 7)

    const start_date = startDateObj.toISOString().split('T')[0]
    const end_date = endDateObj.toISOString().split('T')[0]

    // Check for overlapping assignments (periods that overlap)
    // Two periods overlap if: start_date <= other.end_date AND end_date >= other.start_date
    const { data: existing } = await supabase
      .from('curator_assignments')
      .select('id, curator_name, start_date, end_date')
      .lte('start_date', end_date)
      .gte('end_date', start_date)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `A curator (${existing[0].curator_name}) is already assigned for this period (${existing[0].start_date} - ${existing[0].end_date})` },
        { status: 400 }
      )
    }

    // Select random curator
    const selectedCurator = await selectRandomCurator(supabase, targetAssignmentDate)

    if (!selectedCurator) {
      return NextResponse.json(
        { error: 'No eligible curators found' },
        { status: 400 }
      )
    }

    // Grant curator permissions
    const { data: curatorProfile } = await supabase
      .from('profiles')
      .select('special_access')
      .eq('id', selectedCurator.id)
      .single()

    if (curatorProfile) {
      const specialAccess = curatorProfile.special_access || []
      if (!specialAccess.includes('curator')) {
        await supabase
          .from('profiles')
          .update({
            special_access: [...specialAccess, 'curator']
          })
          .eq('id', selectedCurator.id)
      }
    }

    // Create assignment
    const { data: { user } } = await supabase.auth.getUser()
    const { data: assignment, error } = await supabase
      .from('curator_assignments')
      .insert({
        curator_name: selectedCurator.full_name,
        curator_profile_id: selectedCurator.id,
        assignment_date: targetAssignmentDate,
        start_date,
        end_date,
        is_manual_override: false,
        assigned_by: user?.id || null
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
    const { data: curatorProfileWithSlack } = await supabase
      .from('profiles')
      .select('slack_id, full_name')
      .eq('id', selectedCurator.id)
      .single()

    if (curatorProfileWithSlack?.slack_id) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const curationUrl = `${baseUrl}/curate?assignment=${assignment.id}`
      
      try {
        await fetch(`${baseUrl}/api/slack/notify-curator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slack_id: curatorProfileWithSlack.slack_id,
            curator_name: curatorProfileWithSlack.full_name || selectedCurator.full_name,
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
    console.error('Error in auto-assign curator:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Select a random curator ensuring fair rotation
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

