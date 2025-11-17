/**
 * Generate a silly character name based on star sign and other factors
 */

const SILLY_NAME_PATTERNS = [
  // Star sign based
  'Cosmic {sign}',
  'Stellar {sign}',
  'The {sign} Wizard',
  'Sir {sign} the Great',
  'Madame {sign}',
  'Captain {sign}',
  'Professor {sign}',
  'The {sign} Enigma',
  'Lord {sign}',
  'Lady {sign}',
  
  // Absurd titles
  'The Absurd {sign}',
  'The Silly {sign}',
  'The Ridiculous {sign}',
  'The Wacky {sign}',
  'The Zany {sign}',
  'The Bizarre {sign}',
  'The Quirky {sign}',
  'The Eccentric {sign}',
  
  // Random silly names
  'Bubbles Mc{sign}',
  '{sign} the Magnificent',
  'Sparkle {sign}',
  'Glimmer {sign}',
  'Twinkle {sign}',
  'Wobble {sign}',
  'Zigzag {sign}',
  'Fluffy {sign}',
  'Snuggles {sign}',
  'Bouncy {sign}',
]

const RANDOM_SILLY_NAMES = [
  'Cosmic Bubbles',
  'Stardust Sparkle',
  'Moonbeam McWobble',
  'Galaxy Giggles',
  'Nebula Nonsense',
  'Comet Chaos',
  'Asteroid Absurdity',
  'Planet Prankster',
  'Solar Silly',
  'Lunar Lunacy',
  'Cosmic Clown',
  'Stellar Silliness',
  'Space Spaghetti',
  'Universe Unicorn',
  'Galaxy Gremlin',
  'Starfish Supreme',
  'Moon Muffin',
  'Sunshine Silliness',
  'Cosmic Cookie',
  'Stardust Sandwich',
]

export function generateSillyCharacterName(starSign: string): string {
  // Randomly pick between pattern-based and completely random
  if (Math.random() > 0.5) {
    const pattern = SILLY_NAME_PATTERNS[Math.floor(Math.random() * SILLY_NAME_PATTERNS.length)]
    return pattern.replace('{sign}', starSign)
  } else {
    return RANDOM_SILLY_NAMES[Math.floor(Math.random() * RANDOM_SILLY_NAMES.length)]
  }
}

