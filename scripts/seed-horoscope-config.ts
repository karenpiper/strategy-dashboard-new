/**
 * Seed script for horoscope configuration system
 * Run this to populate initial styles, segments, rules, and a default ruleset
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seed() {
  console.log('Starting seed...')

  // 1. Create default ruleset
  console.log('Creating default ruleset...')
  const { data: ruleset, error: rulesetError } = await supabase
    .from('rulesets')
    .upsert({
      name: 'default',
      active: true,
    }, {
      onConflict: 'name',
    })
    .select()
    .single()

  if (rulesetError) {
    console.error('Error creating ruleset:', rulesetError)
    throw rulesetError
  }

  console.log('Created ruleset:', ruleset.id)

  // 2. Create styles
  console.log('Creating styles...')
  const styles = [
    // AnalogColor family
    { key: 'oil_painting', label: 'Oil painting', family: 'AnalogColor' },
    { key: 'watercolor', label: 'Watercolor', family: 'AnalogColor' },
    { key: 'acrylic', label: 'Acrylic painting', family: 'AnalogColor' },
    { key: 'pastel', label: 'Pastel drawing', family: 'AnalogColor' },
    // CharacterCartoon family
    { key: 'studio_ghibli', label: 'Studio Ghibli', family: 'CharacterCartoon' },
    { key: 'disney_classic', label: 'Classic Disney animation', family: 'CharacterCartoon' },
    { key: 'comic_book', label: 'Comic book art', family: 'CharacterCartoon' },
    { key: 'chinese_watercolor', label: 'Chinese watercolor', family: 'CharacterCartoon' },
    // DigitalArt family
    { key: 'digital_illustration', label: 'Modern digital illustration', family: 'DigitalArt' },
    { key: 'vector_art', label: 'Vector art', family: 'DigitalArt' },
    { key: '3d_textured', label: '3D textured illustration', family: 'DigitalArt' },
    { key: 'pixel_art', label: 'Pixel art', family: 'DigitalArt' },
    // Whimsical family
    { key: 'claymation', label: 'Claymation', family: 'Whimsical' },
    { key: 'perler_beads', label: 'Perler beads', family: 'Whimsical' },
    { key: 'paper_cutout', label: 'Paper cutout art', family: 'Whimsical' },
    { key: 'stained_glass', label: 'Stained glass', family: 'Whimsical' },
  ]

  const { data: createdStyles, error: stylesError } = await supabase
    .from('styles')
    .upsert(styles, {
      onConflict: 'key',
      ignoreDuplicates: false,
    })
    .select()

  if (stylesError) {
    console.error('Error creating styles:', stylesError)
    throw stylesError
  }

  console.log(`Created ${createdStyles?.length || 0} styles`)

  // 3. Create segments
  console.log('Creating segments...')
  const segments = [
    // Signs
    ...['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map(sign => ({
      type: 'sign',
      value: sign,
      description: `${sign} zodiac sign`,
    })),
    // Elements
    ...['fire', 'earth', 'air', 'water'].map(element => ({
      type: 'element',
      value: element,
      description: `${element} element`,
    })),
    // Modalities
    ...['cardinal', 'fixed', 'mutable'].map(modality => ({
      type: 'modality',
      value: modality,
      description: `${modality} modality`,
    })),
    // Weekdays
    ...['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({
      type: 'weekday',
      value: day,
      description: day,
    })),
    // Seasons
    ...['spring', 'summer', 'fall', 'winter'].map(season => ({
      type: 'season',
      value: season,
      description: season,
    })),
    // Disciplines (common ones)
    ...['Design', 'Engineering', 'Product', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance'].map(discipline => ({
      type: 'discipline',
      value: discipline,
      description: discipline,
    })),
    // Role levels
    ...['junior', 'mid', 'senior'].map(level => ({
      type: 'role_level',
      value: level,
      description: level,
    })),
  ]

  const { data: createdSegments, error: segmentsError } = await supabase
    .from('segments')
    .upsert(segments, {
      onConflict: 'type,value',
      ignoreDuplicates: false,
    })
    .select()

  if (segmentsError) {
    console.error('Error creating segments:', segmentsError)
    throw segmentsError
  }

  console.log(`Created ${createdSegments?.length || 0} segments`)

  // 4. Create default rules
  console.log('Creating default rules...')
  
  // Get segment IDs for rules
  const segmentMap = new Map<string, string>()
  createdSegments?.forEach(seg => {
    segmentMap.set(`${seg.type}:${seg.value}`, seg.id)
  })

  const getSegmentId = (type: string, value: string) => segmentMap.get(`${type}:${value}`)

  const defaultRules = [
    // Water element -> AnalogColor styles
    {
      segment_id: getSegmentId('element', 'water'),
      ruleset_id: ruleset.id,
      weight_styles_json: {
        watercolor: 2.0,
        chinese_watercolor: 1.8,
        studio_ghibli: 1.5,
        acrylic: 1.2,
      },
      weight_character_json: {
        human: 1.0,
        animal: 1.2,
        hybrid: 0.8,
        object: 0.3,
      },
      prompt_tags_json: ['flowing', 'emotional', 'intuitive'],
      priority: 10,
    },
    // Fire element -> DigitalArt styles
    {
      segment_id: getSegmentId('element', 'fire'),
      ruleset_id: ruleset.id,
      weight_styles_json: {
        digital_illustration: 2.0,
        vector_art: 1.8,
        comic_book: 1.5,
        pixel_art: 1.2,
      },
      weight_character_json: {
        human: 1.2,
        animal: 1.0,
        hybrid: 1.0,
        object: 0.5,
      },
      prompt_tags_json: ['energetic', 'bold', 'dynamic'],
      priority: 10,
    },
    // Earth element -> AnalogColor styles
    {
      segment_id: getSegmentId('element', 'earth'),
      ruleset_id: ruleset.id,
      weight_styles_json: {
        oil_painting: 1.8,
        acrylic: 1.8,
        pastel: 1.5,
        watercolor: 1.2,
      },
      weight_character_json: {
        human: 1.0,
        animal: 1.1,
        object: 0.8,
        hybrid: 0.6,
      },
      prompt_tags_json: ['grounded', 'stable', 'natural'],
      priority: 10,
    },
    // Air element -> CharacterCartoon styles
    {
      segment_id: getSegmentId('element', 'air'),
      ruleset_id: ruleset.id,
      weight_styles_json: {
        studio_ghibli: 2.0,
        disney_classic: 1.8,
        comic_book: 1.5,
        vector_art: 1.2,
      },
      weight_character_json: {
        human: 1.1,
        animal: 1.2,
        hybrid: 1.0,
        object: 0.4,
      },
      prompt_tags_json: ['playful', 'light', 'communicative'],
      priority: 10,
    },
    // Engineering discipline -> Whimsical/DigitalArt
    {
      segment_id: getSegmentId('discipline', 'Engineering'),
      ruleset_id: ruleset.id,
      weight_styles_json: {
        pixel_art: 2.0,
        claymation: 1.8,
        perler_beads: 1.5,
        digital_illustration: 1.2,
      },
      weight_character_json: {
        object: 1.5,
        hybrid: 1.3,
        human: 0.8,
        animal: 0.7,
      },
      prompt_tags_json: ['technical', 'precise', 'systematic'],
      priority: 5,
    },
    // Design discipline -> CharacterCartoon
    {
      segment_id: getSegmentId('discipline', 'Design'),
      ruleset_id: ruleset.id,
      weight_styles_json: {
        studio_ghibli: 2.0,
        disney_classic: 1.8,
        vector_art: 1.5,
        digital_illustration: 1.2,
      },
      weight_character_json: {
        human: 1.2,
        animal: 1.1,
        hybrid: 0.9,
        object: 0.5,
      },
      prompt_tags_json: ['creative', 'aesthetic', 'visual'],
      priority: 5,
    },
  ]

  // Filter out rules with missing segment IDs
  const validRules = defaultRules.filter(r => r.segment_id)

  const { data: createdRules, error: rulesError } = await supabase
    .from('rules')
    .insert(validRules)
    .select()

  if (rulesError) {
    console.error('Error creating rules:', rulesError)
    throw rulesError
  }

  console.log(`Created ${createdRules?.length || 0} rules`)

  console.log('Seed completed successfully!')
}

seed().catch(console.error)

