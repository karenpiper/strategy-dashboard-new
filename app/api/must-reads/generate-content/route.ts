import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// Lazy initialization - only create client when actually needed
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables')
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

/**
 * Extract text content from a URL
 * Note: This may fail due to CORS restrictions. In production, consider using:
 * - A backend proxy service
 * - Mercury Reader API
 * - Readability API
 * - Or similar article extraction service
 */
async function extractArticleContent(url: string): Promise<string> {
  try {
    // Try to fetch the URL - this may fail due to CORS
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      // Add a timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Simple extraction - remove scripts, styles, and get text content
    // This is basic - for production, consider using a proper article extraction library
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Limit to first 5000 characters to avoid token limits
    return text.substring(0, 5000)
  } catch (error: any) {
    console.error('Error extracting article content:', error)
    // If CORS or fetch fails, we can still try to generate content from the URL/title
    // Return empty string and let the AI work with just the title
    if (error.name === 'AbortError' || error.message?.includes('CORS') || error.message?.includes('fetch')) {
      console.warn('CORS or fetch error - will use title only for generation')
      return ''
    }
    throw new Error('Failed to extract article content. The article may be behind a paywall or have CORS restrictions.')
  }
}

/**
 * Generate summary from article content
 */
async function generateSummary(content: string, title: string): Promise<string> {
  try {
    const contentText = content ? `\n\nContent: ${content.substring(0, 3000)}` : '\n\nNote: Full article content could not be extracted. Please provide a summary based on the title and URL context.'
    const prompt = `Please provide a concise summary (2-3 sentences) of the following article:

Title: ${title}${contentText}

Provide only the summary text, no additional commentary.`

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, informative summaries of articles.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    return response.choices[0]?.message?.content?.trim() || ''
  } catch (error) {
    console.error('Error generating summary:', error)
    throw new Error('Failed to generate summary')
  }
}

/**
 * Generate tags from article content
 */
async function generateTags(content: string, title: string): Promise<string[]> {
  try {
    const contentText = content ? `\n\nContent: ${content.substring(0, 3000)}` : '\n\nNote: Full article content could not be extracted. Please identify tags based on the title and URL context.'
    const prompt = `Analyze the following article and identify exactly 3 relevant tags. Return only the tags as a JSON array of strings, no other text.

Title: ${title}${contentText}

Example format: ["tag1", "tag2", "tag3"]`

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that identifies relevant tags for articles. Always return valid JSON array with exactly 3 tags.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature: 0.7,
    })

    const responseText = response.choices[0]?.message?.content?.trim()
    if (!responseText) {
      throw new Error('Empty response from OpenAI')
    }

    // Try to parse as JSON object first (OpenAI might wrap it)
    let parsed
    try {
      parsed = JSON.parse(responseText)
      // If it's an object, look for a tags array or extract values
      if (parsed.tags && Array.isArray(parsed.tags)) {
        return parsed.tags.slice(0, 3)
      } else if (Array.isArray(parsed)) {
        return parsed.slice(0, 3)
      } else {
        // Try to extract array from the response
        const arrayMatch = responseText.match(/\[(.*?)\]/)
        if (arrayMatch) {
          const tags = arrayMatch[1]
            .split(',')
            .map(t => t.trim().replace(/["']/g, ''))
            .filter(t => t.length > 0)
            .slice(0, 3)
          return tags
        }
      }
    } catch {
      // If JSON parsing fails, try to extract tags from text
      const arrayMatch = responseText.match(/\[(.*?)\]/)
      if (arrayMatch) {
        const tags = arrayMatch[1]
          .split(',')
          .map(t => t.trim().replace(/["']/g, ''))
          .filter(t => t.length > 0)
          .slice(0, 3)
        return tags
      }
    }

    throw new Error('Failed to parse tags from response')
  } catch (error) {
    console.error('Error generating tags:', error)
    throw new Error('Failed to generate tags')
  }
}

// POST - Generate summary and/or tags from article URL
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
    const { url, title, generateSummary, generateTags: generateTagsFlag } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Extract article content
    const content = await extractArticleContent(url)

    const result: any = {}

    // Generate summary if requested
    if (generateSummary) {
      try {
        result.summary = await generateSummary(content, title || '')
      } catch (error: any) {
        result.summaryError = error.message
      }
    }

    // Generate tags if requested
    if (generateTagsFlag) {
      try {
        result.tags = await generateTags(content, title || '')
      } catch (error: any) {
        result.tagsError = error.message
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in generate-content API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content', details: error.toString() },
      { status: 500 }
    )
  }
}

