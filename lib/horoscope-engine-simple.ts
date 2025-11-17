/**
 * Horoscope Engine - Simplified Approach
 * 
 * Layer 1: Pure logic in code (this file)
 * - Decision trees for style family, character type, setting hints
 * - Style families and mappings
 * 
 * Layer 2: Database for user data
 * - User profiles
 * - Generated horoscopes and images
 * - Per-user overrides (future)
 * - Experiment flags (future)
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
  absurdity?: number // 0-1 scale, defaults to 0.5
}

export interface ResolvedChoices {
  styleFamily: string
  styleKey: string
  styleLabel: string
  characterType: 'human' | 'animal' | 'object' | 'hybrid'
  settingHint?: string
}

// Style families - grouped by visual style
const STYLE_FAMILIES = {
  AnalogColor: [
    { key: 'oil_painting', label: 'Oil painting' },
    { key: 'watercolor', label: 'Watercolor' },
    { key: 'acrylic', label: 'Acrylic painting' },
    { key: 'pastel', label: 'Pastel drawing' },
  ],
  CharacterCartoon: [
    { key: 'studio_ghibli', label: 'Studio Ghibli' },
    { key: 'disney_classic', label: 'Classic Disney animation' },
    { key: 'comic_book', label: 'Comic book art' },
    { key: 'chinese_watercolor', label: 'Chinese watercolor' },
  ],
  DigitalArt: [
    { key: 'digital_illustration', label: 'Modern digital illustration' },
    { key: 'vector_art', label: 'Vector art' },
    { key: '3d_textured', label: '3D textured illustration' },
    { key: 'pixel_art', label: 'Pixel art' },
  ],
  Whimsical: [
    { key: 'claymation', label: 'Claymation' },
    { key: 'perler_beads', label: 'Perler beads' },
    { key: 'paper_cutout', label: 'Paper cutout art' },
    { key: 'stained_glass', label: 'Stained glass' },
  ],
} as const

// All styles flattened
const ALL_STYLES = Object.values(STYLE_FAMILIES).flat()

/**
 * Pick style family based on element + discipline + absurdity
 */
function pickStyleFamily(profile: UserProfile): keyof typeof STYLE_FAMILIES {
  const { element, discipline, absurdity = 0.5 } = profile
  
  // High absurdity -> Whimsical
  if (absurdity > 0.7) {
    return 'Whimsical'
  }
  
  // Element-based defaults
  if (element === 'water') {
    // Water signs -> AnalogColor (watercolor, etc)
    return 'AnalogColor'
  } else if (element === 'fire') {
    // Fire signs -> DigitalArt (vibrant, energetic)
    return 'DigitalArt'
  } else if (element === 'earth') {
    // Earth signs -> AnalogColor (grounded, natural)
    return 'AnalogColor'
  } else if (element === 'air') {
    // Air signs -> CharacterCartoon (light, playful)
    return 'CharacterCartoon'
  }
  
  // Discipline-based overrides
  if (discipline) {
    const discLower = discipline.toLowerCase()
    if (discLower.includes('design') || discLower.includes('creative')) {
      return 'CharacterCartoon'
    } else if (discLower.includes('engineering') || discLower.includes('tech')) {
      return absurdity > 0.5 ? 'Whimsical' : 'DigitalArt'
    }
  }
  
  // Default
  return 'CharacterCartoon'
}

/**
 * Pick character type based on discipline + absurdity
 */
function pickCharacterType(profile: UserProfile): 'human' | 'animal' | 'object' | 'hybrid' {
  const { discipline, absurdity = 0.5 } = profile
  
  // High absurdity -> object or hybrid
  if (absurdity > 0.7) {
    return Math.random() > 0.5 ? 'object' : 'hybrid'
  }
  
  // Discipline-based
  if (discipline) {
    const discLower = discipline.toLowerCase()
    if (discLower.includes('engineering') || discLower.includes('tech')) {
      // Engineers -> more objects/hybrids
      if (absurdity > 0.5) {
        return Math.random() > 0.6 ? 'object' : 'hybrid'
      }
    } else if (discLower.includes('design') || discLower.includes('creative')) {
      // Designers -> more human/animal
      return Math.random() > 0.5 ? 'human' : 'animal'
    }
  }
  
  // Default distribution
  const rand = Math.random()
  if (rand < 0.5) return 'human'
  if (rand < 0.8) return 'animal'
  if (rand < 0.95) return 'hybrid'
  return 'object'
}

/**
 * Build setting hint from location + role level
 */
function buildSettingHint(profile: UserProfile): string | undefined {
  const { location, roleLevel } = profile
  
  if (!location && !roleLevel) return undefined
  
  const hints: string[] = []
  
  // Location-based hints
  if (location) {
    const locLower = location.toLowerCase()
    if (locLower.includes('san francisco') || locLower.includes('sf')) {
      hints.push('urban tech hub', 'foggy mornings', 'coastal vibes')
    } else if (locLower.includes('new york') || locLower.includes('nyc')) {
      hints.push('city energy', 'skyline views', 'fast-paced')
    } else if (locLower.includes('london')) {
      hints.push('historic streets', 'rainy days', 'cosmopolitan')
    } else if (locLower.includes('tokyo')) {
      hints.push('neon nights', 'traditional meets modern', 'bustling')
    }
  }
  
  // Role level hints
  if (roleLevel === 'senior') {
    hints.push('leadership energy', 'strategic thinking')
  } else if (roleLevel === 'junior') {
    hints.push('learning mindset', 'fresh perspective')
  }
  
  return hints.length > 0 ? hints.join(', ') : undefined
}

/**
 * Pick a random style from a family
 */
function pickStyleFromFamily(family: keyof typeof STYLE_FAMILIES): { key: string; label: string } {
  const styles = STYLE_FAMILIES[family]
  return styles[Math.floor(Math.random() * styles.length)]
}

/**
 * Build user profile from raw data
 */
export function buildUserProfile(
  birthdayMonth: number,
  birthdayDay: number,
  discipline?: string | null,
  role?: string | null,
  location?: string,
  absurdity?: number
): UserProfile {
  const sign = calculateStarSign(birthdayMonth, birthdayDay)
  const element = getStarSignElement(sign)
  const modality = getStarSignModality(sign)
  
  // Derive role level from role title
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
    absurdity: absurdity ?? 0.5,
  }
}

/**
 * Resolve all choices for a profile
 */
export function resolveChoices(profile: UserProfile): ResolvedChoices {
  const styleFamily = pickStyleFamily(profile)
  const style = pickStyleFromFamily(styleFamily)
  const characterType = pickCharacterType(profile)
  const settingHint = buildSettingHint(profile)
  
  return {
    styleFamily,
    styleKey: style.key,
    styleLabel: style.label,
    characterType,
    settingHint,
  }
}

/**
 * Get all available styles (for reference)
 */
export function getAllStyles() {
  return ALL_STYLES
}

/**
 * Get style families (for reference)
 */
export function getStyleFamilies() {
  return STYLE_FAMILIES
}

