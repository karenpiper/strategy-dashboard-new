/**
 * Horoscope Prompt Slot Catalog System
 * Interfaces and functions for fetching prompt slot catalogs from database
 */

export type PromptSlotType =
  | 'style_medium'
  | 'style_reference'
  | 'subject_role'
  | 'subject_twist'
  | 'setting_place'
  | 'setting_time'
  | 'activity'
  | 'mood_vibe'
  | 'color_palette'
  | 'camera_frame'
  | 'lighting_style'
  | 'constraints'

export interface StyleGroup {
  id: string
  name: string
  description: string | null
}

export interface PromptSlotCatalog {
  id: string
  slot_type: PromptSlotType
  value: string
  label: string
  style_group_id: string | null
  compatible_mediums: string[] // Array of style_medium catalog IDs
  active: boolean
}

export interface UserAvatarState {
  id: string
  user_id: string
  last_generated_date: string | null
  recent_style_group_ids: string[]
  recent_style_reference_ids: string[]
  recent_subject_role_ids: string[]
  recent_setting_place_ids: string[]
}

export interface SelectedPromptSlots {
  style_medium_id: string
  style_reference_id: string
  subject_role_id: string
  subject_twist_id: string | null
  setting_place_id: string
  setting_time_id: string
  activity_id: string
  mood_vibe_id: string
  color_palette_id: string
  camera_frame_id: string
  lighting_style_id: string
  constraints_ids: string[]
}

export interface SlotReasoning {
  style_medium?: string
  style_reference?: string
  subject_role?: string
  subject_twist?: string
  setting_place?: string
  setting_time?: string
  activity?: string
  mood_vibe?: string
  color_palette?: string
  camera_frame?: string
  lighting_style?: string
  constraints?: string
}

/**
 * Fetch all style groups from database
 */
export async function fetchStyleGroups(supabase: any): Promise<StyleGroup[]> {
  const { data, error } = await supabase
    .from('style_groups')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching style groups:', error)
    return []
  }

  return data || []
}

/**
 * Fetch prompt slot catalogs by slot type
 */
export async function fetchPromptSlotCatalogs(
  supabase: any,
  slotType: PromptSlotType
): Promise<PromptSlotCatalog[]> {
  const { data, error } = await supabase
    .from('prompt_slot_catalogs')
    .select('*')
    .eq('slot_type', slotType)
    .eq('active', true)
    .order('label')

  if (error) {
    console.error(`Error fetching ${slotType} catalogs:`, error)
    return []
  }

  return data || []
}

/**
 * Fetch all prompt slot catalogs (for caching)
 */
export async function fetchAllPromptSlotCatalogs(
  supabase: any
): Promise<Record<PromptSlotType, PromptSlotCatalog[]>> {
  const slotTypes: PromptSlotType[] = [
    'style_medium',
    'style_reference',
    'subject_role',
    'subject_twist',
    'setting_place',
    'setting_time',
    'activity',
    'mood_vibe',
    'color_palette',
    'camera_frame',
    'lighting_style',
    'constraints',
  ]

  const catalogs: Record<PromptSlotType, PromptSlotCatalog[]> = {} as Record<
    PromptSlotType,
    PromptSlotCatalog[]
  >

  for (const slotType of slotTypes) {
    catalogs[slotType] = await fetchPromptSlotCatalogs(supabase, slotType)
  }

  return catalogs
}

/**
 * Fetch user avatar state (or create if doesn't exist)
 */
export async function fetchOrCreateUserAvatarState(
  supabase: any,
  userId: string
): Promise<UserAvatarState | null> {
  // Try to fetch existing state
  const { data: existing, error: fetchError } = await supabase
    .from('user_avatar_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching user avatar state:', fetchError)
    return null
  }

  if (existing) {
    return existing
  }

  // Create new state if doesn't exist
  const { data: created, error: createError } = await supabase
    .from('user_avatar_state')
    .insert({
      user_id: userId,
      recent_style_group_ids: [],
      recent_style_reference_ids: [],
      recent_subject_role_ids: [],
      recent_setting_place_ids: [],
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating user avatar state:', createError)
    return null
  }

  return created
}

/**
 * Update user avatar state with new selections
 */
export async function updateUserAvatarState(
  supabase: any,
  userId: string,
  updates: {
    last_generated_date?: string
    recent_style_group_ids?: string[]
    recent_style_reference_ids?: string[]
    recent_subject_role_ids?: string[]
    recent_setting_place_ids?: string[]
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('user_avatar_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating user avatar state:', error)
    return false
  }

  return true
}

