import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Shared seeding logic
async function seedHoroscopeConfig() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Starting horoscope configuration seeding...')

    // 1. Create default ruleset
    const { data: ruleset, error: rulesetError } = await supabase
      .from('rulesets')
      .upsert({ name: 'default', active: true }, { onConflict: 'name' })
      .select()
      .single()

    if (rulesetError || !ruleset) {
      console.error('Error creating/fetching default ruleset:', rulesetError)
      throw new Error('Failed to create ruleset: ' + (rulesetError?.message || 'Unknown error'))
    }
    const defaultRulesetId = ruleset.id
    console.log('Default ruleset created/fetched:', ruleset.name, ruleset.id)

    // 2. Create styles
    const stylesToSeed = [
      // AnalogColor
      { key: 'oil_painting', label: 'Oil painting', family: 'AnalogColor' },
      { key: 'watercolor', label: 'Watercolor', family: 'AnalogColor' },
      { key: 'acrylic', label: 'Acrylic painting', family: 'AnalogColor' },
      { key: 'pastel', label: 'Pastel drawing', family: 'AnalogColor' },
      // CharacterCartoon
      { key: 'studio_ghibli', label: 'Studio Ghibli animation', family: 'CharacterCartoon' },
      { key: 'disney_cartoon', label: 'Disney cartoon', family: 'CharacterCartoon' },
      { key: 'comic_book', label: 'Comic book art', family: 'CharacterCartoon' },
      { key: 'chinese_watercolor', label: 'Chinese watercolor painting', family: 'CharacterCartoon' },
      // DigitalArt
      { key: 'digital_illustration', label: 'Digital illustration', family: 'DigitalArt' },
      { key: 'vector_art', label: 'Vector art', family: 'DigitalArt' },
      { key: '3d_textured', label: '3D textured render', family: 'DigitalArt' },
      { key: 'pixel_art', label: 'Pixel art', family: 'DigitalArt' },
      // Whimsical
      { key: 'claymation', label: 'Claymation', family: 'Whimsical' },
      { key: 'perler_beads', label: 'Perler bead art', family: 'Whimsical' },
      { key: 'paper_cutout', label: 'Paper cutout art', family: 'Whimsical' },
      { key: 'stained_glass', label: 'Stained glass art', family: 'Whimsical' },
    ]

    const { data: createdStyles, error: stylesError } = await supabase
      .from('styles')
      .upsert(stylesToSeed, { onConflict: 'key' })
      .select()

    if (stylesError) {
      console.error('Error creating styles:', stylesError)
      throw new Error('Failed to create styles: ' + stylesError.message)
    }
    console.log(`Created/updated ${createdStyles?.length || 0} styles.`)
    const styleMap = new Map(createdStyles?.map(s => [s.key, s.id]) || [])

    // 3. Create segments
    const segmentsToSeed = [
      // Signs
      { type: 'sign', value: 'Aries', description: 'Aries zodiac sign' },
      { type: 'sign', value: 'Taurus', description: 'Taurus zodiac sign' },
      { type: 'sign', value: 'Gemini', description: 'Gemini zodiac sign' },
      { type: 'sign', value: 'Cancer', description: 'Cancer zodiac sign' },
      { type: 'sign', value: 'Leo', description: 'Leo zodiac sign' },
      { type: 'sign', value: 'Virgo', description: 'Virgo zodiac sign' },
      { type: 'sign', value: 'Libra', description: 'Libra zodiac sign' },
      { type: 'sign', value: 'Scorpio', description: 'Scorpio zodiac sign' },
      { type: 'sign', value: 'Sagittarius', description: 'Sagittarius zodiac sign' },
      { type: 'sign', value: 'Capricorn', description: 'Capricorn zodiac sign' },
      { type: 'sign', value: 'Aquarius', description: 'Aquarius zodiac sign' },
      { type: 'sign', value: 'Pisces', description: 'Pisces zodiac sign' },
      // Elements
      { type: 'element', value: 'fire', description: 'Fire element' },
      { type: 'element', value: 'earth', description: 'Earth element' },
      { type: 'element', value: 'air', description: 'Air element' },
      { type: 'element', value: 'water', description: 'Water element' },
      // Modalities
      { type: 'modality', value: 'cardinal', description: 'Cardinal modality' },
      { type: 'modality', value: 'fixed', description: 'Fixed modality' },
      { type: 'modality', value: 'mutable', description: 'Mutable modality' },
      // Weekdays
      { type: 'weekday', value: 'Monday', description: 'Monday' },
      { type: 'weekday', value: 'Tuesday', description: 'Tuesday' },
      { type: 'weekday', value: 'Wednesday', description: 'Wednesday' },
      { type: 'weekday', value: 'Thursday', description: 'Thursday' },
      { type: 'weekday', value: 'Friday', description: 'Friday' },
      { type: 'weekday', value: 'Saturday', description: 'Saturday' },
      { type: 'weekday', value: 'Sunday', description: 'Sunday' },
      // Seasons
      { type: 'season', value: 'spring', description: 'Spring season' },
      { type: 'season', value: 'summer', description: 'Summer season' },
      { type: 'season', value: 'autumn', description: 'Autumn season' },
      { type: 'season', value: 'winter', description: 'Winter season' },
      // Disciplines
      { type: 'discipline', value: 'Design', description: 'Design discipline' },
      { type: 'discipline', value: 'Engineering', description: 'Engineering discipline' },
      { type: 'discipline', value: 'Marketing', description: 'Marketing discipline' },
      // Role Levels
      { type: 'role_level', value: 'Junior', description: 'Junior role level' },
      { type: 'role_level', value: 'Mid', description: 'Mid-level role' },
      { type: 'role_level', value: 'Senior', description: 'Senior role level' },
      { type: 'role_level', value: 'Lead', description: 'Lead role level' },
      { type: 'role_level', value: 'Director', description: 'Director role level' },
    ]

    const { data: createdSegments, error: segmentsError } = await supabase
      .from('segments')
      .upsert(segmentsToSeed, { onConflict: 'type,value' })
      .select()

    if (segmentsError) {
      console.error('Error creating segments:', segmentsError)
      throw new Error('Failed to create segments: ' + segmentsError.message)
    }
    console.log(`Created/updated ${createdSegments?.length || 0} segments.`)
    const segmentMap = new Map(createdSegments?.map(s => [`${s.type}_${s.value}`, s.id]) || [])

    // 4. Create default rules
    const defaultRules = [
      // Baseline rule for all users (low priority)
      {
        ruleset_id: defaultRulesetId,
        segment_id: segmentMap.get('sign_Aries') || createdSegments?.[0]?.id || '',
        weight_styles_json: {
          'oil_painting': 1.0, 'watercolor': 1.0, 'acrylic': 1.0, 'pastel': 1.0,
          'studio_ghibli': 1.0, 'disney_cartoon': 1.0, 'comic_book': 1.0, 'chinese_watercolor': 1.0,
          'digital_illustration': 1.0, 'vector_art': 1.0, '3d_textured': 1.0, 'pixel_art': 1.0,
          'claymation': 1.0, 'perler_beads': 1.0, 'paper_cutout': 1.0, 'stained_glass': 1.0,
        },
        weight_character_json: { 'human': 1.0, 'animal': 1.0, 'object': 1.0, 'hybrid': 1.0 },
        prompt_tags_json: ['whimsical', 'playful'],
        priority: 0,
        active: true,
      },
      // Example: Fire signs prefer AnalogColor styles
      {
        ruleset_id: defaultRulesetId,
        segment_id: segmentMap.get('element_fire'),
        weight_styles_json: {
          'oil_painting': 2.0, 'watercolor': 1.5, 'acrylic': 1.5, 'pastel': 1.0,
          'studio_ghibli': 0.5, 'digital_illustration': 0.5,
        },
        weight_character_json: { 'human': 1.5, 'animal': 1.0 },
        prompt_tags_json: ['energetic', 'bold'],
        priority: 10,
        active: true,
      },
      // Example: Design discipline prefers CharacterCartoon styles
      {
        ruleset_id: defaultRulesetId,
        segment_id: segmentMap.get('discipline_Design'),
        weight_styles_json: {
          'studio_ghibli': 2.0, 'disney_cartoon': 1.5, 'comic_book': 1.5,
          'oil_painting': 0.5, 'pixel_art': 0.5,
        },
        weight_character_json: { 'human': 1.0, 'hybrid': 1.5 },
        prompt_tags_json: ['creative', 'aesthetic'],
        priority: 10,
        active: true,
      },
      // Example: Engineering discipline prefers DigitalArt styles
      {
        ruleset_id: defaultRulesetId,
        segment_id: segmentMap.get('discipline_Engineering'),
        weight_styles_json: {
          'digital_illustration': 2.0, 'vector_art': 1.5, 'pixel_art': 1.5,
          'watercolor': 0.5, 'studio_ghibli': 0.5,
        },
        weight_character_json: { 'object': 1.5, 'hybrid': 1.0 },
        prompt_tags_json: ['precise', 'futuristic'],
        priority: 10,
        active: true,
      },
      // Example: Senior roles get more "absurd" character types
      {
        ruleset_id: defaultRulesetId,
        segment_id: segmentMap.get('role_level_Senior'),
        weight_character_json: { 'object': 1.5, 'hybrid': 2.0, 'animal': 1.0 },
        prompt_tags_json: ['sophisticated', 'unexpected'],
        priority: 20,
        active: true,
      },
    ].filter(rule => rule.segment_id) // Filter out rules with missing segment IDs

    // Delete existing rules for this ruleset first (to allow re-running)
    await supabase
      .from('rules')
      .delete()
      .eq('ruleset_id', defaultRulesetId)

    const { data: createdRules, error: rulesError } = await supabase
      .from('rules')
      .insert(defaultRules)
      .select()

    if (rulesError) {
      console.error('Error creating rules:', rulesError)
      throw new Error('Failed to create rules: ' + rulesError.message)
    }
    console.log(`Created ${createdRules?.length || 0} rules.`)

    return {
      success: true,
      message: 'Horoscope configuration seeded successfully',
      data: {
        ruleset: ruleset.name,
        styles: createdStyles?.length || 0,
        segments: createdSegments?.length || 0,
        rules: createdRules?.length || 0,
      }
    }
  } catch (error: any) {
    console.error('Error seeding horoscope configuration:', error)
    throw error
  }
}

// This is a one-time setup route to seed the horoscope configuration
// Call this once to populate the database with initial data
export async function POST(request: NextRequest) {
  try {
    console.log('Starting horoscope seed via POST...')
    const result = await seedHoroscopeConfig()
    console.log('Seed completed successfully:', result)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Seed error in POST handler:', error)
    return NextResponse.json(
      { 
        error: 'Failed to seed configuration: ' + (error.message || 'Unknown error'),
        details: error.stack
      },
      { status: 500 }
    )
  }
}

// Also support GET for easy browser access
export async function GET(request: NextRequest) {
  try {
    console.log('Starting horoscope seed via GET...')
    const result = await seedHoroscopeConfig()
    console.log('Seed completed successfully:', result)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Seed error in GET handler:', error)
    return NextResponse.json(
      { 
        error: 'Failed to seed configuration: ' + (error.message || 'Unknown error'),
        details: error.stack
      },
      { status: 500 }
    )
  }
}

