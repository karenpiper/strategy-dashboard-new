/**
 * Script to clear today's horoscope cache for a user
 * This forces regeneration with the new slot-based prompt system
 * 
 * Usage: npx tsx scripts/clear-todays-horoscope.ts [userId]
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearTodaysHoroscope(userId?: string) {
  const today = new Date()
  const todayDate = today.toISOString().split('T')[0] // YYYY-MM-DD format

  console.log(`Clearing horoscope cache for date: ${todayDate}`)

  try {
    let query = supabase
      .from('horoscopes')
      .delete()
      .eq('date', todayDate)

    if (userId) {
      query = query.eq('user_id', userId)
      console.log(`Clearing for user: ${userId}`)
    } else {
      console.log('Clearing for ALL users')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error clearing horoscope:', error)
      process.exit(1)
    }

    console.log(`✅ Successfully cleared horoscope cache for ${todayDate}`)
    console.log('Next request will generate a new image with the slot-based system')
  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

// Get userId from command line args or use all users
const userId = process.argv[2]
clearTodaysHoroscope(userId)

