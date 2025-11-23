import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { responses } = body

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get current week start (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
    const weekStart = new Date(now.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString().split('T')[0]

    // Check if user already submitted this week
    const { data: existing } = await supabase
      .from('team_pulse_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_key', weekKey)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already submitted this week' }, { status: 400 })
    }

    // Insert responses
    const responseData = responses.map((r: any) => ({
      user_id: user.id,
      week_key: weekKey,
      question_key: r.questionKey,
      score: r.score,
      comment: r.comment || null,
    }))

    const { error } = await supabase
      .from('team_pulse_responses')
      .insert(responseData)

    if (error) {
      console.error('Error inserting pulse responses:', error)
      return NextResponse.json({ error: 'Failed to save responses' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in team-pulse submit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

