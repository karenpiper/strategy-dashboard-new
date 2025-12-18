import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { imageUrl } = body

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    // Generate caption using GPT-4 Vision
    const openai = getOpenAIClient()
    
    const prompt = `Write a short caption for the image. Keep it silly and irreverent. Talk directly to the person in the image. Use a clear punchline. Keep it under 12 words. Use formats like:

• "Today you're giving ___"
• "Do you even ___ tho"
• "Congrats on ___"
• "Bold choice with the ___"
• "Who told you ___ was allowed"

Use casual language. Avoid emojis. Focus on the most obvious visual detail. If nothing stands out, point out something mundane in a funny way.

Return only the caption.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 50,
      temperature: 0.9,
    })

    const caption = response.choices[0]?.message?.content?.trim()
    
    if (!caption) {
      return NextResponse.json(
        { error: 'Failed to generate caption' },
        { status: 500 }
      )
    }

    return NextResponse.json({ caption })
  } catch (error: any) {
    console.error('Error generating image caption:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate caption' },
      { status: 500 }
    )
  }
}



