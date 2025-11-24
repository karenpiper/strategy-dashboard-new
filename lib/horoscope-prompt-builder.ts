/**
 * Horoscope Prompt Builder
 * Builds structured prompts using slot-based catalogs with deterministic seeding
 */

import {
  PromptSlotCatalog,
  SelectedPromptSlots,
  SlotReasoning,
  UserAvatarState,
  StyleGroup,
  fetchAllPromptSlotCatalogs,
  fetchStyleGroups,
  fetchOrCreateUserAvatarState,
} from './horoscope-catalogs'

export interface UserProfile {
  id: string
  name: string
  role?: string | null
  hobbies?: string[] | null
  starSign?: string
  element?: string
  // Optional preferences (for future use)
  likes_fantasy?: boolean
  likes_scifi?: boolean
  likes_cute?: boolean
  likes_minimal?: boolean
  hates_clowns?: boolean
}

export interface PromptBuilderContext {
  userId: string
  date: string // YYYY-MM-DD format
  userProfile: UserProfile
  userAvatarState: UserAvatarState
  catalogs: Record<string, PromptSlotCatalog[]>
  styleGroups: StyleGroup[]
}

/**
 * Generate deterministic seed from user_id + date
 */
function generateSeed(userId: string, date: string): number {
  const str = `${userId}-${date}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Seeded random number generator
 */
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

/**
 * Get weekday theme
 */
function getWeekdayTheme(weekday: string): {
  subjectRoleWeight?: Record<string, number>
  settingPlaceWeight?: Record<string, number>
  moodVibeWeight?: Record<string, number>
} {
  const weekdayLower = weekday.toLowerCase()
  const themes: Record<string, any> = {
    monday: {
      subjectRoleWeight: { sci_fi_pilot: 1.5, space_explorer: 1.5, robot_version_of_yourself: 1.3 },
      settingPlaceWeight: { space_station_window: 1.5, futuristic_lab: 1.3 },
      moodVibeWeight: { sci_fi_high_tech: 1.5 },
    },
    tuesday: {
      subjectRoleWeight: { fantasy_wizard: 1.5, hero_in_rpg: 1.5, time_traveler: 1.3 },
      settingPlaceWeight: { enchanted_forest: 1.5, ancient_temple: 1.3, floating_island: 1.3 },
      moodVibeWeight: { whimsical_and_surreal: 1.5, epic_and_heroic: 1.3 },
    },
    wednesday: {
      subjectRoleWeight: { your_real_face_as_yourself: 1.3, chef: 1.3, quirky_inventor: 1.3 },
      settingPlaceWeight: { modern_office: 1.3, coffee_shop: 1.5, cozy_library: 1.5 },
      moodVibeWeight: { cozy_and_relaxed: 1.5, playful_and_fun: 1.3 },
    },
    thursday: {
      subjectRoleWeight: { gamer_in_tournament: 1.5, dj: 1.3, street_artist: 1.3 },
      settingPlaceWeight: { retro_80s_arcade: 1.5, '90s_lan_party': 1.5, busy_train_station: 1.3 },
      moodVibeWeight: { energetic_and_chaotic: 1.5, playful_and_fun: 1.3 },
    },
    friday: {
      subjectRoleWeight: {}, // Wild mashup - no specific weights
      settingPlaceWeight: {},
      moodVibeWeight: { energetic_and_chaotic: 1.3, playful_and_fun: 1.5 },
    },
    saturday: {
      subjectRoleWeight: { your_real_face_as_yourself: 1.3 },
      settingPlaceWeight: { cozy_library: 1.3, coffee_shop: 1.3, rooftop_garden: 1.3 },
      moodVibeWeight: { cozy_and_relaxed: 1.5, playful_and_fun: 1.3 },
    },
    sunday: {
      subjectRoleWeight: { your_real_face_as_yourself: 1.3 },
      settingPlaceWeight: { cozy_library: 1.3, coffee_shop: 1.3, rooftop_garden: 1.3 },
      moodVibeWeight: { cozy_and_relaxed: 1.5 },
    },
  }

  return themes[weekdayLower] || {}
}

/**
 * Get seasonal theme adjustments
 */
function getSeasonalTheme(season: string): {
  colorPaletteWeight?: Record<string, number>
  settingPlaceWeight?: Record<string, number>
  moodVibeWeight?: Record<string, number>
} {
  const seasonLower = season.toLowerCase()
  const themes: Record<string, any> = {
    winter: {
      colorPaletteWeight: { grayscale_with_one_accent_color: 1.3, cool_blues_and_greens: 1.3 },
      settingPlaceWeight: {},
      moodVibeWeight: { cozy_and_relaxed: 1.3 },
    },
    spring: {
      colorPaletteWeight: { pastel_candy_colors: 1.5, cool_blues_and_greens: 1.3 },
      settingPlaceWeight: { rooftop_garden: 1.3, enchanted_forest: 1.3 },
      moodVibeWeight: { playful_and_fun: 1.3 },
    },
    summer: {
      colorPaletteWeight: { warm_oranges_and_reds: 1.3, neon_cyan_and_magenta: 1.3 },
      settingPlaceWeight: { rooftop_garden: 1.3 },
      moodVibeWeight: { energetic_and_chaotic: 1.3 },
    },
    fall: {
      colorPaletteWeight: { warm_oranges_and_reds: 1.5, sepia_vintage_tones: 1.3 },
      settingPlaceWeight: {},
      moodVibeWeight: { cozy_and_relaxed: 1.3 },
    },
  }

  return themes[seasonLower] || {}
}

/**
 * Get zodiac sign theme adjustments
 * Influences subject_role, color_palette, and mood_vibe based on zodiac element
 */
function getZodiacTheme(starSign?: string, element?: string): {
  subjectRoleWeight?: Record<string, number>
  colorPaletteWeight?: Record<string, number>
  moodVibeWeight?: Record<string, number>
} {
  if (!element) return {}

  const elementLower = element.toLowerCase()
  const themes: Record<string, any> = {
    fire: {
      subjectRoleWeight: { superhero: 1.3, rock_musician: 1.3, sci_fi_pilot: 1.2 },
      colorPaletteWeight: { warm_oranges_and_reds: 1.5, neon_cyan_and_magenta: 1.2 },
      moodVibeWeight: { energetic_and_chaotic: 1.4, epic_and_heroic: 1.3 },
    },
    water: {
      subjectRoleWeight: { time_traveler: 1.3, space_explorer: 1.2 },
      colorPaletteWeight: { cool_blues_and_greens: 1.5, jewel_tones: 1.2 },
      moodVibeWeight: { mysterious_and_moody: 1.4, cozy_and_relaxed: 1.2 },
    },
    earth: {
      subjectRoleWeight: { chef: 1.3, quirky_inventor: 1.2, detective: 1.2 },
      colorPaletteWeight: { sepia_vintage_tones: 1.3, warm_oranges_and_reds: 1.2 },
      moodVibeWeight: { cozy_and_relaxed: 1.4, playful_and_fun: 1.2 },
    },
    air: {
      subjectRoleWeight: { fantasy_wizard: 1.3, hero_in_rpg: 1.2, quirky_inventor: 1.2 },
      colorPaletteWeight: { pastel_candy_colors: 1.3, cool_blues_and_greens: 1.2 },
      moodVibeWeight: { whimsical_and_surreal: 1.4, playful_and_fun: 1.3 },
    },
  }

  return themes[elementLower] || {}
}

/**
 * Get profile-based weights (Rule 4)
 * Increases chance for styles and roles that match user preferences
 * Excludes anything they dislike
 */
function getProfileWeights(userProfile: UserProfile): {
  styleReferenceWeight?: Record<string, number>
  subjectRoleWeight?: Record<string, number>
  styleMediumWeight?: Record<string, number>
  excludeValues?: string[]
} {
  const weights: {
    styleReferenceWeight?: Record<string, number>
    subjectRoleWeight?: Record<string, number>
    styleMediumWeight?: Record<string, number>
    excludeValues?: string[]
  } = {}

  // Boost fantasy-related if user likes fantasy
  if (userProfile.likes_fantasy) {
    weights.styleReferenceWeight = {
      ...weights.styleReferenceWeight,
      studio_ghibli_style: 1.3,
      disney_animation_style: 1.2,
      adventure_time_style: 1.2,
    }
    weights.subjectRoleWeight = {
      ...weights.subjectRoleWeight,
      fantasy_wizard: 1.4,
      hero_in_rpg: 1.3,
      time_traveler: 1.2,
    }
  }

  // Boost sci-fi related if user likes sci-fi
  if (userProfile.likes_scifi) {
    weights.styleReferenceWeight = {
      ...weights.styleReferenceWeight,
      cyberpunk_concept_art: 1.4,
      dreamworks_style_cg: 1.2,
      pixar_style_cg: 1.2,
    }
    weights.subjectRoleWeight = {
      ...weights.subjectRoleWeight,
      sci_fi_pilot: 1.4,
      space_explorer: 1.3,
      robot_version_of_yourself: 1.3,
    }
  }

  // Boost cute styles if user likes cute
  if (userProfile.likes_cute) {
    weights.styleReferenceWeight = {
      ...weights.styleReferenceWeight,
      chibi_anime_style: 1.4,
      childrens_picture_book: 1.3,
      studio_ghibli_style: 1.2,
    }
    weights.subjectRoleWeight = {
      ...weights.subjectRoleWeight,
      tiny_chibi_character: 1.3,
    }
  }

  // Boost minimal styles if user likes minimal
  if (userProfile.likes_minimal) {
    weights.styleMediumWeight = {
      ...weights.styleMediumWeight,
      flat_vector: 1.4,
      isometric_vector: 1.3,
      charcoal_sketch: 1.2,
    }
  }

  // Exclude clown-related if user hates clowns
  if (userProfile.hates_clowns) {
    weights.excludeValues = ['clown', 'circus', 'jester']
  }

  return weights
}

/**
 * Weighted random selection from catalog items
 * Returns both the selected item and reasoning
 */
function selectFromCatalog(
  rng: SeededRandom,
  catalogs: PromptSlotCatalog[],
  weights?: Record<string, number>,
  excludeIds: string[] = [],
  reasoningContext?: string
): { item: PromptSlotCatalog | null; reasoning: string } {
  if (catalogs.length === 0) return { item: null, reasoning: 'No items available' }

  // Filter out excluded items
  const available = catalogs.filter((c) => !excludeIds.includes(c.id))
  const wasFiltered = available.length < catalogs.length

  if (available.length === 0) {
    // If all are excluded, fall back to all catalogs
    const selected = catalogs[Math.floor(rng.next() * catalogs.length)]
    return {
      item: selected,
      reasoning: wasFiltered ? 'All items were recently used, selected from full catalog' : 'Random selection'
    }
  }

  // Apply weights if provided
  const weighted = available.map((catalog) => {
    const weight = weights?.[catalog.value] || 1.0
    return { catalog, weight }
  })

  // Check if any weights were applied
  const hasWeights = weights && Object.keys(weights).length > 0
  const boostedItems = hasWeights
    ? weighted.filter((w) => weights![w.catalog.value] && weights![w.catalog.value] > 1.0)
    : []

  // Normalize weights
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight === 0) {
    const selected = available[Math.floor(rng.next() * available.length)]
    return {
      item: selected,
      reasoning: wasFiltered ? 'Selected from available items (avoiding recent)' : 'Random selection'
    }
  }

  // Select based on weighted probability
  let random = rng.next() * totalWeight
  let selected: PromptSlotCatalog | null = null
  for (const item of weighted) {
    random -= item.weight
    if (random <= 0) {
      selected = item.catalog
      break
    }
  }

  // Fallback
  selected = selected || weighted[0]?.catalog || null

  // Build reasoning
  const reasons: string[] = []
  if (wasFiltered) {
    reasons.push('avoiding recently used')
  }
  if (hasWeights && boostedItems.length > 0) {
    const wasBoosted = boostedItems.some((b) => b.catalog.id === selected?.id)
    if (wasBoosted) {
      reasons.push('weighted by theme/preferences')
    } else {
      reasons.push('random selection')
    }
  } else {
    reasons.push('random selection')
  }
  if (reasoningContext) {
    reasons.push(`(${reasoningContext})`)
  }

  return {
    item: selected,
    reasoning: reasons.join(', ')
  }
}

/**
 * Select style group with rotation logic
 * Returns both the selected group and reasoning
 */
function selectStyleGroup(
  rng: SeededRandom,
  styleGroups: StyleGroup[],
  recentGroupIds: string[]
): { group: StyleGroup | null; reasoning: string } {
  if (styleGroups.length === 0) return { group: null, reasoning: 'No style groups available' }

  // Filter out recently used groups (last 7 days)
  const available = styleGroups.filter((g) => !recentGroupIds.includes(g.id))
  const wasFiltered = available.length < styleGroups.length

  // If all groups were used recently, use all groups
  const candidates = available.length > 0 ? available : styleGroups
  const selected = candidates[Math.floor(rng.next() * candidates.length)]

  const reasoning = wasFiltered
    ? 'selected from groups not used in last 7 days (style rotation)'
    : 'all groups were recently used, random selection from all groups'

  return { group: selected, reasoning }
}

/**
 * Select style reference compatible with selected style group
 * Returns both the selected item and reasoning
 */
function selectStyleReference(
  rng: SeededRandom,
  catalogs: PromptSlotCatalog[],
  styleGroupId: string,
  excludeIds: string[] = [],
  weights?: Record<string, number>
): { item: PromptSlotCatalog | null; reasoning: string } {
  // Filter by style group and exclude recent
  const compatible = catalogs.filter(
    (c) => c.style_group_id === styleGroupId && !excludeIds.includes(c.id)
  )

  if (compatible.length === 0) {
    // Fallback to any style reference
    const available = catalogs.filter((c) => !excludeIds.includes(c.id))
    if (available.length === 0) {
      const selected = catalogs[Math.floor(rng.next() * catalogs.length)]
      return {
        item: selected,
        reasoning: 'no compatible styles available, random selection from all'
      }
    }
    const selected = available[Math.floor(rng.next() * available.length)]
    return {
      item: selected,
      reasoning: 'no compatible styles in selected group, selected from available'
    }
  }

  // Apply weights if provided
  if (weights && Object.keys(weights).length > 0) {
    const result = selectFromCatalog(rng, compatible, weights, [], 'compatible with selected style group')
    return {
      item: result.item,
      reasoning: `compatible with selected style group, ${result.reasoning}`
    }
  }

  const selected = compatible[Math.floor(rng.next() * compatible.length)]
  return {
    item: selected,
    reasoning: 'compatible with selected style group, random selection'
  }
}

/**
 * Build prompt from selected slots
 */
function buildPromptString(
  slots: SelectedPromptSlots,
  catalogs: Record<string, PromptSlotCatalog[]>,
  userProfile: UserProfile
): string {
  // Get catalog items by ID
  const getCatalogItem = (slotType: string, id: string): PromptSlotCatalog | null => {
    return catalogs[slotType]?.find((c) => c.id === id) || null
  }

  const styleMedium = getCatalogItem('style_medium', slots.style_medium_id)
  const styleReference = getCatalogItem('style_reference', slots.style_reference_id)
  const subjectRole = getCatalogItem('subject_role', slots.subject_role_id)
  const subjectTwist = slots.subject_twist_id
    ? getCatalogItem('subject_twist', slots.subject_twist_id)
    : null
  const settingPlace = getCatalogItem('setting_place', slots.setting_place_id)
  const settingTime = getCatalogItem('setting_time', slots.setting_time_id)
  const activity = getCatalogItem('activity', slots.activity_id)
  const moodVibe = getCatalogItem('mood_vibe', slots.mood_vibe_id)
  const colorPalette = getCatalogItem('color_palette', slots.color_palette_id)
  const cameraFrame = getCatalogItem('camera_frame', slots.camera_frame_id)
  const lightingStyle = getCatalogItem('lighting_style', slots.lighting_style_id)
  const constraints = slots.constraints_ids
    .map((id) => getCatalogItem('constraints', id))
    .filter((c) => c !== null) as PromptSlotCatalog[]

  // Build subject clause
  let subjectClause = userProfile.name
  if (userProfile.role) {
    subjectClause += `, a ${userProfile.role.toLowerCase()}`
  }
  if (userProfile.hobbies && userProfile.hobbies.length > 0) {
    subjectClause += ` who loves ${userProfile.hobbies[0].toLowerCase()}`
  }
  if (subjectRole) {
    subjectClause += `, as ${subjectRole.label.toLowerCase()}`
  }
  // Handle subject_twist - add it in a way that makes grammatical sense
  if (subjectTwist) {
    const twistLabel = subjectTwist.label.toLowerCase()
    // If twist is a descriptor (adjective-like), add it before the role
    // If twist is a noun phrase, add it after with proper grammar
    if (twistLabel.includes('living') || twistLabel.includes('version') || twistLabel.includes('form')) {
      // These are noun phrases that should be integrated differently
      // Instead of "as hero in an rpg living neon sign", make it "as a living neon sign hero in an rpg"
      // Or better: restructure to avoid awkwardness
      if (subjectRole) {
        // If we have a role, integrate the twist more naturally
        subjectClause = subjectClause.replace(
          `, as ${subjectRole.label.toLowerCase()}`,
          `, as ${twistLabel} ${subjectRole.label.toLowerCase()}`
        )
      } else {
        subjectClause += `, as ${twistLabel}`
      }
    } else {
      // Simple descriptor - add it naturally
      subjectClause += ` ${twistLabel}`
    }
  }

  // Build style text - use both style reference and medium (original working format)
  const styleText = styleReference
    ? `${styleReference.label}${styleMedium ? `. ${styleMedium.label}` : ''}`
    : styleMedium?.label || ''

  // Build activity text
  const activityText = activity ? ` ${activity.label.toLowerCase()}` : ''
  
  // Build setting text
  const settingText = settingPlace?.label.toLowerCase() || 'a setting'
  let timeText = settingTime?.label.toLowerCase() || 'a time'
  // Fix grammar: "at stormy afternoon" -> "during a stormy afternoon"
  if (timeText.startsWith('stormy') || timeText.startsWith('sunny') || timeText.startsWith('rainy')) {
    timeText = `during a ${timeText}`
  } else if (timeText.includes('afternoon') || timeText.includes('morning') || timeText.includes('evening') || timeText.includes('night')) {
    if (!timeText.startsWith('during') && !timeText.startsWith('at') && !timeText.startsWith('on')) {
      timeText = `during ${timeText}`
    }
  } else if (!timeText.startsWith('at') && !timeText.startsWith('during') && !timeText.startsWith('on')) {
    timeText = `at ${timeText}`
  }

  // Build mood, color, lighting
  const moodText = moodVibe?.label.toLowerCase() || 'moody'
  const colorText = colorPalette?.label.toLowerCase() || 'colorful'
  const lightingText = lightingStyle?.label.toLowerCase() || 'natural lighting'

  // Build constraints text
  const constraintsText = constraints.map((c) => c.label.toLowerCase()).join(', ')

  // Build prompt following the original working format
  const prompt = `${styleText}. ${cameraFrame?.label || 'Portrait'} of ${subjectClause}${activityText}. They are in ${settingText} ${timeText}. ${moodText} mood, ${colorText} palette, ${lightingText}. ${constraintsText}.`

  return prompt.trim()
}

/**
 * Main prompt builder function
 */
export async function buildHoroscopePrompt(
  supabase: any,
  userId: string,
  date: string,
  userProfile: UserProfile,
  weekday: string,
  season: string
): Promise<{ prompt: string; slots: SelectedPromptSlots; reasoning: SlotReasoning }> {
  // Fetch catalogs and style groups
  let catalogs: Record<string, PromptSlotCatalog[]>
  let styleGroups: StyleGroup[]
  let userAvatarState: UserAvatarState | null

  try {
    [catalogs, styleGroups, userAvatarState] = await Promise.all([
      fetchAllPromptSlotCatalogs(supabase),
      fetchStyleGroups(supabase),
      fetchOrCreateUserAvatarState(supabase, userId),
    ])
  } catch (error: any) {
    // Check if it's a missing table error
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      throw new Error('Database tables not found. Please run the migrations: create-prompt-slot-system.sql and seed-prompt-slot-catalogs.sql')
    }
    throw error
  }

  if (!userAvatarState) {
    throw new Error('Failed to fetch or create user avatar state')
  }

  // Validate that we have the required data
  if (styleGroups.length === 0) {
    throw new Error('No style groups found. Please run the seed-prompt-slot-catalogs.sql migration.')
  }

  if (Object.keys(catalogs).length === 0 || catalogs.style_reference?.length === 0) {
    throw new Error('No prompt slot catalogs found. Please run the seed-prompt-slot-catalogs.sql migration.')
  }

  // Generate deterministic seed
  const seed = generateSeed(userId, date)
  const rng = new SeededRandom(seed)

  // Get themed weights
  const weekdayTheme = getWeekdayTheme(weekday)
  const seasonalTheme = getSeasonalTheme(season)
  const zodiacTheme = getZodiacTheme(userProfile.starSign, userProfile.element)
  const profileWeights = getProfileWeights(userProfile) // Rule 4: Profile-based weights

  // Rule 2: Select style group with rotation
  const styleGroupResult = selectStyleGroup(
    rng,
    styleGroups,
    userAvatarState.recent_style_group_ids || []
  )
  if (!styleGroupResult.group) {
    throw new Error('No style groups available')
  }
  const selectedStyleGroup = styleGroupResult.group
  const reasoning: SlotReasoning = {}

  // Select style reference compatible with style group
  // Apply profile weights if available
  const styleReferenceCandidates = catalogs.style_reference.filter(
    (c) => c.style_group_id === selectedStyleGroup.id && !userAvatarState.recent_style_reference_ids?.includes(c.id)
  )
  const styleReferenceResult = selectStyleReference(
    rng,
    styleReferenceCandidates.length > 0 ? styleReferenceCandidates : catalogs.style_reference,
    selectedStyleGroup.id,
    userAvatarState.recent_style_reference_ids || [],
    profileWeights.styleReferenceWeight
  )
  if (!styleReferenceResult.item) {
    throw new Error('No compatible style reference found')
  }
  const styleReference = styleReferenceResult.item
  reasoning.style_reference = styleReferenceResult.reasoning

  // Select style medium (can be random or based on compatible_mediums)
  // Apply profile weights if available
  const styleMediumCandidates = profileWeights.excludeValues
    ? catalogs.style_medium.filter((c) => !profileWeights.excludeValues!.some((exclude) => c.value.toLowerCase().includes(exclude)))
    : catalogs.style_medium
  const styleMediumResult = selectFromCatalog(
    rng,
    styleMediumCandidates,
    profileWeights.styleMediumWeight,
    [],
    profileWeights.excludeValues ? 'excluding user preferences' : undefined
  )
  if (!styleMediumResult.item) {
    throw new Error('No style medium available')
  }
  const styleMedium = styleMediumResult.item
  reasoning.style_medium = styleMediumResult.reasoning

  // Rule 5: Select other slots avoiding recent repeats
  // Combine weekday, zodiac theme, and profile weights for subject role
  const subjectRoleWeights = {
    ...weekdayTheme.subjectRoleWeight,
    ...zodiacTheme.subjectRoleWeight,
    ...profileWeights.subjectRoleWeight,
  }
  const subjectRoleCandidates = profileWeights.excludeValues
    ? catalogs.subject_role.filter((c) => !profileWeights.excludeValues!.some((exclude) => c.value.toLowerCase().includes(exclude)))
    : catalogs.subject_role
  const hasSubjectRoleWeights = Object.keys(subjectRoleWeights).length > 0
  const subjectRoleResult = selectFromCatalog(
    rng,
    subjectRoleCandidates,
    hasSubjectRoleWeights ? subjectRoleWeights : undefined,
    userAvatarState.recent_subject_role_ids || [],
    hasSubjectRoleWeights ? `weighted by ${weekday} theme, ${userProfile.starSign || 'zodiac'} theme, and user preferences` : undefined
  )
  if (!subjectRoleResult.item) {
    throw new Error('No subject role available')
  }
  const subjectRole = subjectRoleResult.item
  reasoning.subject_role = subjectRoleResult.reasoning

  const subjectTwistResult = selectFromCatalog(rng, catalogs.subject_twist, undefined, [])
  const subjectTwist = subjectTwistResult.item
  if (subjectTwist) {
    reasoning.subject_twist = subjectTwistResult.reasoning
  }

  const settingPlaceWeights = {
    ...weekdayTheme.settingPlaceWeight,
    ...seasonalTheme.settingPlaceWeight,
  }
  const hasSettingPlaceWeights = Object.keys(settingPlaceWeights).length > 0
  const settingPlaceResult = selectFromCatalog(
    rng,
    catalogs.setting_place,
    hasSettingPlaceWeights ? settingPlaceWeights : undefined,
    userAvatarState.recent_setting_place_ids || [],
    hasSettingPlaceWeights ? `weighted by ${weekday} theme and ${season} season` : undefined
  )
  if (!settingPlaceResult.item) {
    throw new Error('No setting place available')
  }
  const settingPlace = settingPlaceResult.item
  reasoning.setting_place = settingPlaceResult.reasoning

  const settingTimeResult = selectFromCatalog(rng, catalogs.setting_time, undefined, [])
  if (!settingTimeResult.item) {
    throw new Error('No setting time available')
  }
  const settingTime = settingTimeResult.item
  reasoning.setting_time = settingTimeResult.reasoning

  const activityResult = selectFromCatalog(rng, catalogs.activity, undefined, [])
  if (!activityResult.item) {
    throw new Error('No activity available')
  }
  const activity = activityResult.item
  reasoning.activity = activityResult.reasoning

  // Combine weekday, seasonal, and zodiac theme weights for mood
  const moodVibeWeights = {
    ...weekdayTheme.moodVibeWeight,
    ...seasonalTheme.moodVibeWeight,
    ...zodiacTheme.moodVibeWeight,
  }
  const hasMoodVibeWeights = Object.keys(moodVibeWeights).length > 0
  const moodVibeResult = selectFromCatalog(
    rng,
    catalogs.mood_vibe,
    hasMoodVibeWeights ? moodVibeWeights : undefined,
    [],
    hasMoodVibeWeights ? `weighted by ${weekday} theme, ${season} season, and ${userProfile.starSign || 'zodiac'} theme` : undefined
  )
  if (!moodVibeResult.item) {
    throw new Error('No mood vibe available')
  }
  const moodVibe = moodVibeResult.item
  reasoning.mood_vibe = moodVibeResult.reasoning

  // Combine seasonal and zodiac theme weights for color palette
  const colorPaletteWeights = {
    ...seasonalTheme.colorPaletteWeight,
    ...zodiacTheme.colorPaletteWeight,
  }
  const hasColorPaletteWeights = Object.keys(colorPaletteWeights).length > 0
  const colorPaletteResult = selectFromCatalog(
    rng,
    catalogs.color_palette,
    hasColorPaletteWeights ? colorPaletteWeights : undefined,
    [],
    hasColorPaletteWeights ? `weighted by ${season} season and ${userProfile.starSign || 'zodiac'} theme` : undefined
  )
  if (!colorPaletteResult.item) {
    throw new Error('No color palette available')
  }
  const colorPalette = colorPaletteResult.item
  reasoning.color_palette = colorPaletteResult.reasoning

  const cameraFrameResult = selectFromCatalog(rng, catalogs.camera_frame, undefined, [])
  if (!cameraFrameResult.item) {
    throw new Error('No camera frame available')
  }
  const cameraFrame = cameraFrameResult.item
  reasoning.camera_frame = cameraFrameResult.reasoning

  const lightingStyleResult = selectFromCatalog(rng, catalogs.lighting_style, undefined, [])
  if (!lightingStyleResult.item) {
    throw new Error('No lighting style available')
  }
  const lightingStyle = lightingStyleResult.item
  reasoning.lighting_style = lightingStyleResult.reasoning

  // Select constraints (can select multiple)
  const constraints = []
  const constraintReasons: string[] = []
  const availableConstraints = catalogs.constraints.filter((c) => c.value !== 'no_text_in_image') // Always include no text
  for (let i = 0; i < Math.min(3, availableConstraints.length); i++) {
    const constraintResult = selectFromCatalog(
      rng,
      availableConstraints.filter((c) => !constraints.includes(c.id)),
      undefined,
      []
    )
    if (constraintResult.item) {
      constraints.push(constraintResult.item.id)
      constraintReasons.push(constraintResult.reasoning)
    }
  }
  // Always include no_text_in_image
  const noTextConstraint = catalogs.constraints.find((c) => c.value === 'no_text_in_image')
  if (noTextConstraint) {
    constraints.push(noTextConstraint.id)
    constraintReasons.push('always included (no text in image)')
  }
  reasoning.constraints = constraintReasons.join('; ')

  const slots: SelectedPromptSlots = {
    style_medium_id: styleMedium.id,
    style_reference_id: styleReference.id,
    subject_role_id: subjectRole.id,
    subject_twist_id: subjectTwist?.id || null,
    setting_place_id: settingPlace.id,
    setting_time_id: settingTime.id,
    activity_id: activity.id,
    mood_vibe_id: moodVibe.id,
    color_palette_id: colorPalette.id,
    camera_frame_id: cameraFrame.id,
    lighting_style_id: lightingStyle.id,
    constraints_ids: constraints,
  }

  // Build prompt string
  const prompt = buildPromptString(slots, catalogs, userProfile)

  // Validate prompt was built correctly
  if (!prompt || prompt.trim() === '') {
    throw new Error('Failed to build prompt - prompt is empty. Check that all required slots were selected and catalog items exist.')
  }

  // Ensure prompt contains essential elements
  if (!prompt.includes(userProfile.name)) {
    console.warn('⚠️ Warning: Prompt does not include user name:', userProfile.name)
  }

  if (prompt.length < 50) {
    console.warn('⚠️ Warning: Prompt is very short (less than 50 characters). This may indicate missing slot data.')
    console.warn('Prompt:', prompt)
  }

  console.log('✅ Built prompt successfully:', prompt.substring(0, 150) + (prompt.length > 150 ? '...' : ''))
  console.log('Prompt length:', prompt.length)
  console.log('Slots used:', Object.keys(slots).filter(key => slots[key] !== null))

  return { prompt, slots, reasoning }
}

