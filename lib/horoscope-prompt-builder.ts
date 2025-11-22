/**
 * Horoscope Prompt Builder
 * Builds structured prompts using slot-based catalogs with deterministic seeding
 */

import {
  PromptSlotCatalog,
  SelectedPromptSlots,
  UserAvatarState,
  StyleGroup,
  fetchAllPromptSlotCatalogs,
  fetchStyleGroups,
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
 */
function selectFromCatalog(
  rng: SeededRandom,
  catalogs: PromptSlotCatalog[],
  weights?: Record<string, number>,
  excludeIds: string[] = []
): PromptSlotCatalog | null {
  if (catalogs.length === 0) return null

  // Filter out excluded items
  const available = catalogs.filter((c) => !excludeIds.includes(c.id))

  if (available.length === 0) {
    // If all are excluded, fall back to all catalogs
    return catalogs[Math.floor(rng.next() * catalogs.length)]
  }

  // Apply weights if provided
  const weighted = available.map((catalog) => {
    const weight = weights?.[catalog.value] || 1.0
    return { catalog, weight }
  })

  // Normalize weights
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight === 0) {
    return available[Math.floor(rng.next() * available.length)]
  }

  // Select based on weighted probability
  let random = rng.next() * totalWeight
  for (const item of weighted) {
    random -= item.weight
    if (random <= 0) {
      return item.catalog
    }
  }

  // Fallback
  return weighted[0]?.catalog || null
}

/**
 * Select style group with rotation logic
 */
function selectStyleGroup(
  rng: SeededRandom,
  styleGroups: StyleGroup[],
  recentGroupIds: string[]
): StyleGroup | null {
  if (styleGroups.length === 0) return null

  // Filter out recently used groups (last 7 days)
  const available = styleGroups.filter((g) => !recentGroupIds.includes(g.id))

  // If all groups were used recently, use all groups
  const candidates = available.length > 0 ? available : styleGroups

  return candidates[Math.floor(rng.next() * candidates.length)]
}

/**
 * Select style reference compatible with selected style group
 */
function selectStyleReference(
  rng: SeededRandom,
  catalogs: PromptSlotCatalog[],
  styleGroupId: string,
  excludeIds: string[] = []
): PromptSlotCatalog | null {
  // Filter by style group and exclude recent
  const compatible = catalogs.filter(
    (c) => c.style_group_id === styleGroupId && !excludeIds.includes(c.id)
  )

  if (compatible.length === 0) {
    // Fallback to any style reference
    const available = catalogs.filter((c) => !excludeIds.includes(c.id))
    if (available.length === 0) {
      return catalogs[Math.floor(rng.next() * catalogs.length)]
    }
    return available[Math.floor(rng.next() * available.length)]
  }

  return compatible[Math.floor(rng.next() * compatible.length)]
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
  if (subjectTwist) {
    subjectClause += ` ${subjectTwist.label.toLowerCase()}`
  }

  // Build prompt following the example format
  const styleText = styleReference
    ? `${styleReference.label}${styleMedium ? `. ${styleMedium.label}` : ''}`
    : styleMedium?.label || ''

  const activityText = activity ? ` ${activity.label.toLowerCase()}` : ''
  const settingText = settingPlace?.label.toLowerCase() || 'a setting'
  const timeText = settingTime?.label.toLowerCase() || 'a time'
  const moodText = moodVibe?.label.toLowerCase() || 'moody'
  const colorText = colorPalette?.label.toLowerCase() || 'colorful'
  const lightingText = lightingStyle?.label.toLowerCase() || 'natural lighting'
  const constraintsText = constraints.map((c) => c.label.toLowerCase()).join(', ')

  const prompt = `${styleText}. ${cameraFrame?.label || 'Portrait'} of ${subjectClause}${activityText}. They are in ${settingText} at ${timeText}. ${moodText} mood, ${colorText} palette, ${lightingText}. ${constraintsText}.`

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
): Promise<{ prompt: string; slots: SelectedPromptSlots }> {
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
  const selectedStyleGroup = selectStyleGroup(
    rng,
    styleGroups,
    userAvatarState.recent_style_group_ids || []
  )
  if (!selectedStyleGroup) {
    throw new Error('No style groups available')
  }

  // Select style reference compatible with style group
  // Apply profile weights if available
  const styleReferenceCandidates = catalogs.style_reference.filter(
    (c) => c.style_group_id === selectedStyleGroup.id && !userAvatarState.recent_style_reference_ids?.includes(c.id)
  )
  const styleReference = selectFromCatalog(
    rng,
    styleReferenceCandidates.length > 0 ? styleReferenceCandidates : catalogs.style_reference,
    profileWeights.styleReferenceWeight,
    userAvatarState.recent_style_reference_ids || []
  )
  if (!styleReference) {
    throw new Error('No compatible style reference found')
  }

  // Select style medium (can be random or based on compatible_mediums)
  // Apply profile weights if available
  const styleMediumCandidates = profileWeights.excludeValues
    ? catalogs.style_medium.filter((c) => !profileWeights.excludeValues!.some((exclude) => c.value.toLowerCase().includes(exclude)))
    : catalogs.style_medium
  const styleMedium = selectFromCatalog(
    rng,
    styleMediumCandidates,
    profileWeights.styleMediumWeight,
    []
  )
  if (!styleMedium) {
    throw new Error('No style medium available')
  }

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
  const subjectRole = selectFromCatalog(
    rng,
    subjectRoleCandidates,
    Object.keys(subjectRoleWeights).length > 0 ? subjectRoleWeights : undefined,
    userAvatarState.recent_subject_role_ids || []
  )
  if (!subjectRole) {
    throw new Error('No subject role available')
  }

  const subjectTwist = selectFromCatalog(rng, catalogs.subject_twist, undefined, [])

  const settingPlace = selectFromCatalog(
    rng,
    catalogs.setting_place,
    {
      ...weekdayTheme.settingPlaceWeight,
      ...seasonalTheme.settingPlaceWeight,
    },
    userAvatarState.recent_setting_place_ids || []
  )
  if (!settingPlace) {
    throw new Error('No setting place available')
  }

  const settingTime = selectFromCatalog(rng, catalogs.setting_time, undefined, [])
  if (!settingTime) {
    throw new Error('No setting time available')
  }

  const activity = selectFromCatalog(rng, catalogs.activity, undefined, [])
  if (!activity) {
    throw new Error('No activity available')
  }

  // Combine weekday, seasonal, and zodiac theme weights for mood
  const moodVibeWeights = {
    ...weekdayTheme.moodVibeWeight,
    ...seasonalTheme.moodVibeWeight,
    ...zodiacTheme.moodVibeWeight,
  }
  const moodVibe = selectFromCatalog(
    rng,
    catalogs.mood_vibe,
    Object.keys(moodVibeWeights).length > 0 ? moodVibeWeights : undefined,
    []
  )
  if (!moodVibe) {
    throw new Error('No mood vibe available')
  }

  // Combine seasonal and zodiac theme weights for color palette
  const colorPaletteWeights = {
    ...seasonalTheme.colorPaletteWeight,
    ...zodiacTheme.colorPaletteWeight,
  }
  const colorPalette = selectFromCatalog(
    rng,
    catalogs.color_palette,
    Object.keys(colorPaletteWeights).length > 0 ? colorPaletteWeights : undefined,
    []
  )
  if (!colorPalette) {
    throw new Error('No color palette available')
  }

  const cameraFrame = selectFromCatalog(rng, catalogs.camera_frame, undefined, [])
  if (!cameraFrame) {
    throw new Error('No camera frame available')
  }

  const lightingStyle = selectFromCatalog(rng, catalogs.lighting_style, undefined, [])
  if (!lightingStyle) {
    throw new Error('No lighting style available')
  }

  // Select constraints (can select multiple)
  const constraints = []
  const availableConstraints = catalogs.constraints.filter((c) => c.value !== 'no_text_in_image') // Always include no text
  for (let i = 0; i < Math.min(3, availableConstraints.length); i++) {
    const constraint = selectFromCatalog(
      rng,
      availableConstraints.filter((c) => !constraints.includes(c.id)),
      undefined,
      []
    )
    if (constraint) {
      constraints.push(constraint.id)
    }
  }
  // Always include no_text_in_image
  const noTextConstraint = catalogs.constraints.find((c) => c.value === 'no_text_in_image')
  if (noTextConstraint) {
    constraints.push(noTextConstraint.id)
  }

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

  return { prompt, slots }
}

