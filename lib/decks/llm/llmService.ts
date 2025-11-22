import { getOpenAIClient } from '../config/openaiClient'
import { getEnv } from '../config/env'
import { buildDeckPrompt } from './deckPrompts'
import { buildTopicsPrompt } from './topicPrompts'
import { buildSlidePrompt } from './slidePrompts'

export type DeckMetadataJson = {
  deck_title: string
  deck_summary: string
  main_themes: string[]
  primary_audiences: string[]
  use_cases_for_other_presentations: string[]
}

export type TopicJson = {
  topic_title: string
  topic_summary: string
  story_context: string
  topics: string[]
  reuse_suggestions: string[]
  slide_numbers: number[]
}

export type SlideLabelJson = {
  slide_type: string
  slide_caption: string
  topics: string[]
  reusable: string
}

async function callOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
  const openai = getOpenAIClient()
  const config = getEnv()

  const messages: Array<{ role: 'system' | 'user'; content: string }> = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  try {
    const completion = await openai.chat.completions.create({
      model: config.openaiChatModel,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    if (!responseText) {
      throw new Error('Empty response from OpenAI')
    }

    return responseText
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API call failed: ${error.message || 'Unknown error'}`)
  }
}

function parseJsonResponse<T>(text: string, validator: (obj: any) => obj is T): T {
  try {
    const parsed = JSON.parse(text)
    if (!validator(parsed)) {
      throw new Error('Response does not match expected schema')
    }
    return parsed
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON response: ${error.message}`)
    }
    throw error
  }
}

function validateDeckMetadata(obj: any): obj is DeckMetadataJson {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.deck_title === 'string' &&
    typeof obj.deck_summary === 'string' &&
    Array.isArray(obj.main_themes) &&
    Array.isArray(obj.primary_audiences) &&
    Array.isArray(obj.use_cases_for_other_presentations)
  )
}

function validateTopicsArray(obj: any): obj is TopicJson[] {
  if (!Array.isArray(obj)) {
    return false
  }
  return obj.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.topic_title === 'string' &&
      typeof item.topic_summary === 'string' &&
      typeof item.story_context === 'string' &&
      Array.isArray(item.topics) &&
      Array.isArray(item.reuse_suggestions) &&
      Array.isArray(item.slide_numbers)
  )
}

function validateSlideLabel(obj: any): obj is SlideLabelJson {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.slide_type === 'string' &&
    typeof obj.slide_caption === 'string' &&
    Array.isArray(obj.topics) &&
    typeof obj.reusable === 'string'
  )
}

export async function generateDeckMetadata(deckText: string): Promise<DeckMetadataJson> {
  const prompt = buildDeckPrompt(deckText)
  const responseText = await callOpenAI(prompt)
  return parseJsonResponse(responseText, validateDeckMetadata)
}

export async function generateTopics(deckText: string): Promise<TopicJson[]> {
  const prompt = buildTopicsPrompt(deckText)
  const responseText = await callOpenAI(prompt)
  
  try {
    const parsed = JSON.parse(responseText)
    
    // Handle both direct array response and wrapped object
    if (Array.isArray(parsed)) {
      if (validateTopicsArray(parsed)) {
        return parsed
      }
    } else if (parsed.topics && Array.isArray(parsed.topics)) {
      if (validateTopicsArray(parsed.topics)) {
        return parsed.topics
      }
    }
    
    throw new Error('Invalid topics response format: expected array or object with topics array')
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON response: ${error.message}`)
    }
    throw error
  }
}

export async function labelSlide(slideText: string): Promise<SlideLabelJson> {
  const prompt = buildSlidePrompt(slideText)
  const responseText = await callOpenAI(prompt)
  return parseJsonResponse(responseText, validateSlideLabel)
}

