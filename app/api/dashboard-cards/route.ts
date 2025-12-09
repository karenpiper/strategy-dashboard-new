import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all card visibility settings
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

    const { data: cardSettings, error } = await supabase
      .from('dashboard_card_settings')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching card settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch card settings', details: error.message },
        { status: 500 }
      )
    }

    // Convert to a map for easier lookup
    const settingsMap: Record<string, { is_visible: boolean; display_order: number }> = {}
    cardSettings?.forEach(setting => {
      settingsMap[setting.card_name] = {
        is_visible: setting.is_visible,
        display_order: setting.display_order
      }
    })

    return NextResponse.json({
      settings: settingsMap,
      allSettings: cardSettings || []
    })
  } catch (error: any) {
    console.error('Error in dashboard-cards API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch card settings' },
      { status: 500 }
    )
  }
}

// PUT - Update card visibility settings (admin only)
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('base_role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.base_role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { updates } = body // Array of { card_name, is_visible, display_order? }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      )
    }

    // Update each card setting
    const results = []
    for (const update of updates) {
      if (!update.card_name) {
        continue
      }

      const updateData: any = {
        is_visible: Boolean(update.is_visible),
        updated_at: new Date().toISOString(),
      }

      if (update.display_order !== undefined) {
        updateData.display_order = parseInt(update.display_order)
      }

      const { data, error } = await supabase
        .from('dashboard_card_settings')
        .update(updateData)
        .eq('card_name', update.card_name)
        .select()
        .single()

      if (error) {
        console.error(`Error updating card ${update.card_name}:`, error)
        results.push({ card_name: update.card_name, error: error.message })
      } else {
        results.push({ card_name: update.card_name, success: true, data })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error: any) {
    console.error('Error in dashboard-cards API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update card settings' },
      { status: 500 }
    )
  }
}

