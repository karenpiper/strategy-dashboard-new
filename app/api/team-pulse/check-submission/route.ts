import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ hasSubmitted: false })
    }

    // Get current week start (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(now.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('team_pulse_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_key', weekKey)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking submission:', error)
      return NextResponse.json({ hasSubmitted: false })
    }

    return NextResponse.json({ hasSubmitted: !!data })
  } catch (error) {
    console.error('Error in check-submission:', error)
    return NextResponse.json({ hasSubmitted: false })
  }
}

