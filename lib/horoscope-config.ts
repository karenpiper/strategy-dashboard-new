/**
 * Shared horoscope configuration fetching logic
 * This avoids duplicating the same database queries in both text and image endpoints
 */

import {
  buildUserProfile,
  fetchSegmentsForProfile,
  fetchRulesForSegments,
  fetchCurrentThemes,
  fetchThemeRules,
  fetchActiveStyles,
  resolveConfig,
  makeResolvedChoices,
  type UserProfile,
  type ResolvedChoices,
} from './horoscope-engine'

export interface HoroscopeConfig {
  userProfile: UserProfile
  resolvedChoices: ResolvedChoices
  starSign: string
}

/**
 * Fetch and resolve horoscope configuration (shared between text and image endpoints)
 */
export async function fetchHoroscopeConfig(
  supabase: any,
  birthdayMonth: number | null,
  birthdayDay: number | null,
  discipline?: string | null,
  role?: string | null
): Promise<HoroscopeConfig> {
  // Build user profile
  const userProfile = buildUserProfile(
    birthdayMonth,
    birthdayDay,
    discipline,
    role
  )
  const starSign = userProfile.sign || 'Unknown'
  
  // Step 1: Fetch segments for profile
  const segments = await fetchSegmentsForProfile(supabase, userProfile)
  
  // Step 2: Fetch rules for segments
  const segmentIds = segments.map(s => s.id)
  const rules = await fetchRulesForSegments(supabase, segmentIds)
  
  // Step 3: Fetch current themes
  const themes = await fetchCurrentThemes(supabase, userProfile.today)
  
  // Step 4: Fetch theme rules for themes and segments
  let allThemeRules: any[] = []
  for (const theme of themes) {
    const themeRules = await fetchThemeRules(supabase, theme.id, segmentIds)
    allThemeRules.push(...themeRules)
  }
  
  // Step 5: Fetch active styles
  const styles = await fetchActiveStyles(supabase)
  
  if (styles.length === 0) {
    throw new Error('Horoscope configuration not initialized. Please run the seed script to populate styles, segments, and rules.')
  }
  
  // Step 6: Resolve config from database rules and themes
  const resolvedConfig = resolveConfig(rules, themes, allThemeRules, styles)
  
  // Step 7: Make resolved choices from config
  const resolvedChoices = makeResolvedChoices(resolvedConfig, styles)
  
  // Build list of matched segments for debugging/display
  const matchedSegments = segments.map(s => ({
    type: s.type,
    value: s.value,
  }))
  
  // Build list of applied rules for debugging/display
  const appliedRules = rules.map(r => ({
    segmentType: segments.find(s => s.id === r.segment_id)?.type || 'unknown',
    segmentValue: segments.find(s => s.id === r.segment_id)?.value || 'unknown',
    priority: r.priority,
    styleWeights: Object.keys(r.weight_styles_json || {}).length,
    characterWeights: Object.keys(r.weight_character_json || {}).length,
    promptTags: r.prompt_tags_json || [],
  }))
  
  return {
    userProfile,
    resolvedChoices,
    starSign,
    matchedSegments,
    appliedRules,
    themes: themes.map(t => ({
      name: t.name,
      moodTags: t.mood_tags_json || [],
      textSnippet: t.text_snippet,
    })),
  }
}

