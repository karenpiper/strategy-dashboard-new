/**
 * Calculate star sign from birthday (month and day)
 */
export function calculateStarSign(month: number, day: number): string {
  // Month is 1-indexed (1 = January, 12 = December)
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return 'Aries'
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return 'Taurus'
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return 'Gemini'
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return 'Cancer'
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return 'Leo'
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return 'Virgo'
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return 'Libra'
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return 'Scorpio'
  }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return 'Sagittarius'
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return 'Capricorn'
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return 'Aquarius'
  }
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
    return 'Pisces'
  }
  
  // Fallback (shouldn't happen)
  return 'Aries'
}

/**
 * Get emoji for star sign
 */
export function getStarSignEmoji(starSign: string): string {
  const emojis: Record<string, string> = {
    'Aries': '♈',
    'Taurus': '♉',
    'Gemini': '♊',
    'Cancer': '♋',
    'Leo': '♌',
    'Virgo': '♍',
    'Libra': '♎',
    'Scorpio': '♏',
    'Sagittarius': '♐',
    'Capricorn': '♑',
    'Aquarius': '♒',
    'Pisces': '♓',
  }
  return emojis[starSign] || '✨'
}

/**
 * Get date ranges for a star sign
 */
export function getStarSignDates(starSign: string): { start: { month: number; day: number }; end: { month: number; day: number } } {
  const dates: Record<string, { start: { month: number; day: number }; end: { month: number; day: number } }> = {
    'Aries': { start: { month: 3, day: 21 }, end: { month: 4, day: 19 } },
    'Taurus': { start: { month: 4, day: 20 }, end: { month: 5, day: 20 } },
    'Gemini': { start: { month: 5, day: 21 }, end: { month: 6, day: 20 } },
    'Cancer': { start: { month: 6, day: 21 }, end: { month: 7, day: 22 } },
    'Leo': { start: { month: 7, day: 23 }, end: { month: 8, day: 22 } },
    'Virgo': { start: { month: 8, day: 23 }, end: { month: 9, day: 22 } },
    'Libra': { start: { month: 9, day: 23 }, end: { month: 10, day: 22 } },
    'Scorpio': { start: { month: 10, day: 23 }, end: { month: 11, day: 21 } },
    'Sagittarius': { start: { month: 11, day: 22 }, end: { month: 12, day: 21 } },
    'Capricorn': { start: { month: 12, day: 22 }, end: { month: 1, day: 19 } },
    'Aquarius': { start: { month: 1, day: 20 }, end: { month: 2, day: 18 } },
    'Pisces': { start: { month: 2, day: 19 }, end: { month: 3, day: 20 } },
  }
  return dates[starSign] || dates['Aries']
}

/**
 * Get element for a star sign
 */
export function getStarSignElement(starSign: string): string {
  const elements: Record<string, string> = {
    'Aries': 'fire',
    'Taurus': 'earth',
    'Gemini': 'air',
    'Cancer': 'water',
    'Leo': 'fire',
    'Virgo': 'earth',
    'Libra': 'air',
    'Scorpio': 'water',
    'Sagittarius': 'fire',
    'Capricorn': 'earth',
    'Aquarius': 'air',
    'Pisces': 'water',
  }
  return elements[starSign] || 'fire'
}

/**
 * Get modality for a star sign
 */
export function getStarSignModality(starSign: string): string {
  const modalities: Record<string, string> = {
    'Aries': 'cardinal',
    'Taurus': 'fixed',
    'Gemini': 'mutable',
    'Cancer': 'cardinal',
    'Leo': 'fixed',
    'Virgo': 'mutable',
    'Libra': 'cardinal',
    'Scorpio': 'fixed',
    'Sagittarius': 'mutable',
    'Capricorn': 'cardinal',
    'Aquarius': 'fixed',
    'Pisces': 'mutable',
  }
  return modalities[starSign] || 'cardinal'
}

