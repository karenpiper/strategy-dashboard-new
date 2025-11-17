/**
 * Horoscope Engine - Three-Layer Architecture
 * 
 * Layer 1: Engine in code (this file)
 * - Profile building
 * - Segment fetching
 * - Rule resolution and merging
 * - Config resolution
 * - Style/character sampling
 * 
 * Layer 2: Config in database
 * - Styles, segments, rules, themes
 * 
 * Layer 3: Daily theme layer
 * - Themes with date ranges
 * - Theme rules for segment-specific overrides
 */

import { calculateStarSign, getStarSignElement, getStarSignModality } from './horoscope-utils'

// Types
export interface UserProfile {
  dob: { month: number; day: number }
  sign: string
  element: string
  modality: string
  location?: string
  discipline?: string | null
  roleLevel?: string | null
  absurdity?: number
  today: Date
  weekday: string
  season: string
}

export interface Segment {
  id: string
  type: string
  value: string
  description?: string
}

export interface Rule {
  id: string
  segment_id: string
  weight_styles_json: Record<string, number>
  weight_character_json: Record<string, number>
  prompt_tags_json: string[]
  priority: number
}

export interface Theme {
  id: string
  date_range_start: string
  date_range_end: string
  name: string
  mood_tags_json: string[]
  text_snippet?: string | null
}

export interface ThemeRule {
  id: string
  theme_id: string
  segment_id: string
  weight_boost_json: Record<string, number>
}

export interface Style {
  id: string
  key: string
  label: string
  family?: string
}

export interface ResolvedConfig {
  styleWeights: Record<string, number>
  characterTypeWeights: { human: number; animal: number; object: number; hybrid: number }
  extraPromptTags: string[]
  themeSnippet: string | null
}

export interface ResolvedChoices {
  characterType: 'human' | 'animal' | 'object' | 'hybrid'
  styleKey: string
  styleLabel: string
  promptTags: string[]
  themeSnippet: string | null
}

/**
 * Build user profile from raw data
 */
export function buildUserProfile(
  birthdayMonth: number,
  birthdayDay: number,
  discipline?: string | null,
  role?: string | null,
  location?: string
): UserProfile {
  const sign = calculateStarSign(birthdayMonth, birthdayDay)
  const element = getStarSignElement(sign)
  const modality = getStarSignModality(sign)
  const today = new Date()
  
  // Derive weekday
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const weekday = weekdays[today.getDay()]
  
  // Derive season (simplified - can be enhanced with location)
  const month = today.getMonth() + 1
  let season = 'spring'
  if (month >= 3 && month <= 5) season = 'spring'
  else if (month >= 6 && month <= 8) season = 'summer'
  else if (month >= 9 && month <= 11) season = 'fall'
  else season = 'winter'
  
  // Derive role level from role title (simplified)
  let roleLevel: string | undefined
  if (role) {
    const roleLower = role.toLowerCase()
    if (roleLower.includes('senior') || roleLower.includes('lead') || roleLower.includes('director') || roleLower.includes('head')) {
      roleLevel = 'senior'
    } else if (roleLower.includes('junior') || roleLower.includes('associate') || roleLower.includes('intern')) {
      roleLevel = 'junior'
    } else {
      roleLevel = 'mid'
    }
  }
  
  return {
    dob: { month: birthdayMonth, day: birthdayDay },
    sign,
    element,
    modality,
    location,
    discipline: discipline || null,
    roleLevel: roleLevel || null,
    today,
    weekday,
    season,
  }
}

/**
 * Fetch active segments for a profile
 */
export async function fetchSegmentsForProfile(
  supabase: any,
  profile: UserProfile
): Promise<Segment[]> {
  const segmentPairs = [
    ['sign', profile.sign],
    ['element', profile.element],
    ['modality', profile.modality],
    ['weekday', profile.weekday],
    ['season', profile.season],
  ]
  
  if (profile.discipline) {
    segmentPairs.push(['discipline', profile.discipline])
  }
  
  if (profile.roleLevel) {
    segmentPairs.push(['role_level', profile.roleLevel])
  }
  
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .in('type', segmentPairs.map(p => p[0]))
    .in('value', segmentPairs.map(p => p[1]))
  
  if (error) {
    console.error('Error fetching segments:', error)
    return []
  }
  
  return data || []
}

/**
 * Fetch rules for segments
 */
export async function fetchRulesForSegments(
  supabase: any,
  segmentIds: string[],
  rulesetId?: string | null
): Promise<Rule[]> {
  if (segmentIds.length === 0) return []
  
  let query = supabase
    .from('rules')
    .select('*')
    .in('segment_id', segmentIds)
    .eq('active', true)
  
  if (rulesetId) {
    query = query.eq('ruleset_id', rulesetId)
  } else {
    // Get active ruleset
    const { data: activeRuleset } = await supabase
      .from('rulesets')
      .select('id')
      .eq('active', true)
      .maybeSingle()
    
    if (activeRuleset) {
      query = query.eq('ruleset_id', activeRuleset.id)
    }
  }
  
  const { data, error } = await query.order('priority', { ascending: false })
  
  if (error) {
    console.error('Error fetching rules:', error)
    return []
  }
  
  return data || []
}

/**
 * Fetch current themes
 */
export async function fetchCurrentThemes(
  supabase: any,
  date: Date
): Promise<Theme[]> {
  const dateStr = date.toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('active', true)
    .lte('date_range_start', dateStr)
    .gte('date_range_end', dateStr)
  
  if (error) {
    console.error('Error fetching themes:', error)
    return []
  }
  
  return data || []
}

/**
 * Fetch theme rules for a theme and segments
 */
export async function fetchThemeRules(
  supabase: any,
  themeId: string,
  segmentIds: string[]
): Promise<ThemeRule[]> {
  if (segmentIds.length === 0) return []
  
  const { data, error } = await supabase
    .from('theme_rules')
    .select('*')
    .eq('theme_id', themeId)
    .in('segment_id', segmentIds)
  
  if (error) {
    console.error('Error fetching theme rules:', error)
    return []
  }
  
  return data || []
}

/**
 * Fetch active styles
 */
export async function fetchActiveStyles(supabase: any): Promise<Style[]> {
  const { data, error } = await supabase
    .from('styles')
    .select('*')
    .eq('active', true)
  
  if (error) {
    console.error('Error fetching styles:', error)
    return []
  }
  
  return data || []
}

/**
 * Resolve config from rules and themes
 */
export function resolveConfig(
  rules: Rule[],
  themes: Theme[],
  themeRules: ThemeRule[],
  styles: Style[]
): ResolvedConfig {
  // Start with baseline equal weights
  const styleWeights: Record<string, number> = {}
  const characterTypeWeights = {
    human: 1.0,
    animal: 1.0,
    object: 1.0,
    hybrid: 1.0,
  }
  const extraPromptTags: string[] = []
  let themeSnippet: string | null = null
  
  // Initialize style weights from available styles
  styles.forEach(style => {
    styleWeights[style.key] = 1.0
  })
  
  // Apply rules (sorted by priority, higher first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)
  
  for (const rule of sortedRules) {
    // Apply style weights (multiplicative)
    for (const [styleKey, weight] of Object.entries(rule.weight_styles_json)) {
      if (styleWeights[styleKey] !== undefined) {
        styleWeights[styleKey] *= weight
      }
    }
    
    // Apply character weights (multiplicative)
    for (const [charType, weight] of Object.entries(rule.weight_character_json)) {
      if (charType in characterTypeWeights) {
        characterTypeWeights[charType as keyof typeof characterTypeWeights] *= weight
      }
    }
    
    // Add prompt tags
    if (rule.prompt_tags_json && Array.isArray(rule.prompt_tags_json)) {
      extraPromptTags.push(...rule.prompt_tags_json)
    }
  }
  
  // Apply theme weight boosts (last, so they override)
  for (const themeRule of themeRules) {
    for (const [key, boost] of Object.entries(themeRule.weight_boost_json)) {
      // Could be style or character type
      if (styleWeights[key] !== undefined) {
        styleWeights[key] *= boost
      } else if (key in characterTypeWeights) {
        characterTypeWeights[key as keyof typeof characterTypeWeights] *= boost
      }
    }
  }
  
  // Get theme snippet from first theme
  if (themes.length > 0 && themes[0].text_snippet) {
    themeSnippet = themes[0].text_snippet
  }
  
  // Add theme mood tags
  for (const theme of themes) {
    if (theme.mood_tags_json && Array.isArray(theme.mood_tags_json)) {
      extraPromptTags.push(...theme.mood_tags_json)
    }
  }
  
  // Normalize weights to probabilities (optional, but helpful)
  const normalizeWeights = (weights: Record<string, number>): Record<string, number> => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    if (sum === 0) return weights
    const normalized: Record<string, number> = {}
    for (const [key, value] of Object.entries(weights)) {
      normalized[key] = value / sum
    }
    return normalized
  }
  
  return {
    styleWeights: normalizeWeights(styleWeights),
    characterTypeWeights: normalizeWeights(characterTypeWeights) as typeof characterTypeWeights,
    extraPromptTags: [...new Set(extraPromptTags)], // Remove duplicates
    themeSnippet,
  }
}

/**
 * Sample from weights (weighted random selection)
 */
function sampleFromWeights<T extends string>(weights: Record<T, number>): T {
  const items = Object.entries(weights) as [T, number][]
  const total = items.reduce((sum, [, weight]) => sum + weight, 0)
  let random = Math.random() * total
  
  for (const [item, weight] of items) {
    random -= weight
    if (random <= 0) {
      return item
    }
  }
  
  // Fallback to first item
  return items[0]?.[0] || items[items.length - 1]?.[0]
}

/**
 * Make resolved choices from config
 */
export function makeResolvedChoices(
  config: ResolvedConfig,
  styles: Style[]
): ResolvedChoices {
  // Sample character type
  const characterType = sampleFromWeights(config.characterTypeWeights)
  
  // Sample style
  const styleKey = sampleFromWeights(config.styleWeights as Record<string, number>)
  const style = styles.find(s => s.key === styleKey)
  const styleLabel = style?.label || styleKey
  
  return {
    characterType,
    styleKey,
    styleLabel,
    promptTags: config.extraPromptTags,
    themeSnippet: config.themeSnippet,
  }
}

