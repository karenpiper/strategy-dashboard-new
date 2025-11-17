import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Transform a Cafe Astrology horoscope into Co-Star style with do's and don'ts
 */
export async function transformHoroscopeToCoStarStyle(
  cafeAstrologyText: string,
  starSign: string
): Promise<{ horoscope: string; dos: string[]; donts: string[] }> {
  console.log('Transforming horoscope to Co-Star style...')
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    
    const prompt = `Transform this horoscope from Cafe Astrology into the irreverent, silly style of Co-Star. Make it witty, slightly sarcastic, and fun. Keep the core meaning but make it more casual and entertaining.

Original horoscope for ${starSign}:
${cafeAstrologyText}

Return a JSON object with this exact structure:
{
  "horoscope": "An irreverent, expanded version of the horoscope in Co-Star's style. Make it approximately 150 words. Keep it witty, casual, and entertaining while expanding on the themes from the original. Break it into multiple paragraphs for readability.",
  "dos": ["Do thing 1", "Do thing 2", "Do thing 3"],
  "donts": ["Don't thing 1", "Don't thing 2", "Don't thing 3"]
}

Make the do's and don'ts silly, specific, and related to the horoscope content. They should be funny and slightly absurd but still relevant.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.9,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    if (!responseText) {
      throw new Error('Failed to transform horoscope - empty response')
    }

    const parsed = JSON.parse(responseText)
    
    if (!parsed.horoscope || !Array.isArray(parsed.dos) || !Array.isArray(parsed.donts)) {
      throw new Error('Invalid response format from OpenAI')
    }

    console.log('Successfully transformed horoscope to Co-Star style')
    return {
      horoscope: parsed.horoscope,
      dos: parsed.dos,
      donts: parsed.donts,
    }
  } catch (error: any) {
    console.error('Error transforming horoscope:', error)
    if (error.response) {
      console.error('OpenAI API error response:', error.response.status, error.response.data)
    }
    throw error
  }
}

/**
 * Generate a fun, illustrative portrait for the horoscope using resolved choices
 * Returns both the image URL and the prompt used
 */
export async function generateHoroscopeImage(
  starSign: string,
  resolvedChoices: {
    characterType: 'human' | 'animal' | 'object' | 'hybrid'
    styleLabel: string
    promptTags?: string[]
    themeSnippet?: string | null
  }
): Promise<{ imageUrl: string; prompt: string }> {
  const { characterType, styleLabel, promptTags = [], themeSnippet } = resolvedChoices
  
  // Build character description based on type
  let characterDescription = ''
  switch (characterType) {
    case 'human':
      characterDescription = 'a human character or figure'
      break
    case 'animal':
      characterDescription = 'an animal character (realistic or anthropomorphic)'
      break
    case 'object':
      characterDescription = 'an object or inanimate thing personified'
      break
    case 'hybrid':
      characterDescription = 'a hybrid or fantastical creature combining human, animal, or object elements'
      break
  }
  
  // Build prompt tags text
  const tagsText = promptTags.length > 0 ? ` Incorporate these mood and style elements: ${promptTags.join(', ')}.` : ''
  
  // Build theme snippet text
  const themeText = themeSnippet ? ` Theme context: ${themeSnippet}.` : ''
  
  const prompt = `An absolutely absurd, hilariously silly, and delightfully ridiculous illustration portrait representing ${starSign} energy, featuring ${characterDescription}.

Illustration style: ${styleLabel}.${tagsText}${themeText}

Make this EXTREMELY silly and absurd:
- Over-the-top, exaggerated expressions and poses
- Ridiculously whimsical and nonsensical details
- Playfully absurd accessories, props, or elements
- Maximum silliness and humor - think cartoon absurdity
- Completely unserious and delightfully ridiculous
- Make it laugh-out-loud funny and charmingly absurd

Style requirements:
- Absolutely NO text, NO words, NO letters, NO numbers anywhere in the image
- No borders, clean background or subtle abstract background
- Full body or three-quarter portrait
- Vibrant, saturated, eye-popping colors
- Fun, expressive, and engaging
- Square format, portrait orientation
- Professional digital art quality
- Suitable for use as a profile picture or avatar

The illustration should be creatively absurd, hilariously silly, and capture the essence of ${starSign} in the most ridiculous and entertaining way possible. Think maximum absurdity, complete silliness, and delightful nonsense.`

  console.log('Calling OpenAI DALL-E API...')
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: '1024x1024', // Square format for portrait/avatar use
      quality: 'standard',
      n: 1,
    })

    const imageUrl = response.data[0]?.url
    if (!imageUrl) {
      throw new Error('Failed to generate horoscope image - empty response')
    }

    console.log('OpenAI DALL-E API call successful')
    return { imageUrl, prompt }
  } catch (error: any) {
    console.error('Error generating horoscope image:', error)
    if (error.response) {
      console.error('OpenAI API error response:', error.response.status, error.response.data)
    }
    throw error
  }
}

