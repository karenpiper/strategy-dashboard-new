/**
 * Elvex service for processing decks
 * Replaces OpenAI calls with Elvex assistant API
 */

import { getEnv } from '../config/env'

export interface ElvexConfig {
  apiKey: string
  assistantId: string
  baseUrl?: string
}

export interface ElvexDeckMetadata {
  deck_title: string
  deck_summary: string
  main_themes: string[]
  primary_audiences: string[]
  use_cases_for_other_presentations: string[]
}

export interface ElvexTopic {
  topic_title: string
  topic_summary: string
  story_context: string
  topics: string[]
  reuse_suggestions: string[]
  slide_numbers: number[]
}

export interface ElvexSlide {
  slide_number: number
  slide_type: string
  slide_caption: string
  topics: string[]
  reusable: string
}

export interface ElvexProcessingResult {
  deck_metadata: ElvexDeckMetadata
  topics: ElvexTopic[]
  slides: ElvexSlide[]
}

/**
 * Get Elvex configuration from environment
 */
function getElvexConfig(): ElvexConfig {
  const apiKey = process.env.ELVEX_API_KEY
  const assistantId = process.env.ELVEX_ASSISTANT_ID
  const baseUrl = process.env.ELVEX_BASE_URL || 'https://api.elvex.ai'

  if (!apiKey) {
    throw new Error('ELVEX_API_KEY is required')
  }
  if (!assistantId) {
    throw new Error('ELVEX_ASSISTANT_ID is required')
  }

  return { apiKey, assistantId, baseUrl }
}

/**
 * Process a deck file using Elvex assistant
 * Elvex will:
 * 1. Extract text from the PDF in Google Drive
 * 2. Analyze the content with LLM
 * 3. Return structured metadata, topics, and slide information
 * 
 * @param gdriveFileId - Google Drive file ID to process
 * @param fileName - Optional file name for context
 * @returns Processing results with metadata, topics, and slides
 */
export async function processDeckWithElvex(
  gdriveFileId: string,
  fileName?: string
): Promise<ElvexProcessingResult> {
  const config = getElvexConfig()

  try {
    // Call Elvex assistant API to process the file
    // Elvex will extract PDF text and perform LLM analysis
    const response = await fetch(`${config.baseUrl}/v1/assistants/${config.assistantId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        file_id: gdriveFileId,
        file_source: 'google_drive',
        file_name: fileName,
        instructions: `Please extract text from this PDF presentation deck and analyze it. 
        
        Steps:
        1. Extract all text from each slide in the PDF
        2. Analyze the deck to generate metadata, topics, and slide labels
        3. Return structured JSON matching the required format
        
        Return a JSON object with this exact structure:
        {
          "deck_metadata": {
            "deck_title": "cleaned up title",
            "deck_summary": "2-4 sentence overview",
            "main_themes": ["theme1", "theme2"],
            "primary_audiences": ["audience1", "audience2"],
            "use_cases_for_other_presentations": ["use case 1", "use case 2"]
          },
          "topics": [
            {
              "topic_title": "short name",
              "topic_summary": "3-5 sentence description",
              "story_context": "one of: credibility, market_problem, solution_vision, implementation, results, other",
              "topics": ["keyword1", "keyword2"],
              "reuse_suggestions": ["suggestion1"],
              "slide_numbers": [1, 2, 3]
            }
          ],
          "slides": [
            {
              "slide_number": 1,
              "slide_type": "one of: case_study, vision, market_context, data_chart, model, process, roadmap, cover, credits, other",
              "slide_caption": "one sentence description",
              "topics": ["keyword1"],
              "reusable": "yes or no or needs_edit"
            }
          ]
        }`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Elvex API call failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    
    // Validate and map Elvex response to our format
    return mapElvexResponse(result)
  } catch (error: any) {
    console.error('Error calling Elvex API:', error)
    throw new Error(`Failed to process deck with Elvex: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Map Elvex response to our expected format
 */
function mapElvexResponse(elvexResponse: any): ElvexProcessingResult {
  // Elvex response format may vary - adjust based on actual API response
  // This is a template that should be adjusted based on Elvex's actual response structure
  
  if (elvexResponse.data) {
    return {
      deck_metadata: elvexResponse.data.deck_metadata || elvexResponse.deck_metadata,
      topics: elvexResponse.data.topics || elvexResponse.topics || [],
      slides: elvexResponse.data.slides || elvexResponse.slides || [],
    }
  }

  // If response is already in our format
  if (elvexResponse.deck_metadata) {
    return elvexResponse
  }

  // If Elvex returns text that needs parsing
  if (typeof elvexResponse === 'string' || elvexResponse.content) {
    const content = typeof elvexResponse === 'string' ? elvexResponse : elvexResponse.content
    try {
      return JSON.parse(content)
    } catch {
      throw new Error('Elvex returned non-JSON response. Please configure Elvex assistant to return structured JSON.')
    }
  }

  throw new Error('Unexpected Elvex response format')
}

/**
 * Alternative: Use Elvex chat completion API if assistant API doesn't exist
 * This sends a prompt to Elvex to extract PDF text and perform LLM analysis
 */
export async function processDeckWithElvexChat(
  gdriveFileId: string,
  fileName?: string
): Promise<ElvexProcessingResult> {
  const config = getElvexConfig()

  const prompt = `Please extract text from and analyze the presentation deck from Google Drive file ID: ${gdriveFileId}
  
  Steps:
  1. Extract all text from each slide in the PDF
  2. Analyze the deck content to generate metadata, topics, and slide labels
  3. Return structured JSON matching the required format

Extract and return a JSON object with this exact structure:
{
  "deck_metadata": {
    "deck_title": "cleaned up title",
    "deck_summary": "2-4 sentence overview",
    "main_themes": ["theme1", "theme2"],
    "primary_audiences": ["audience1", "audience2"],
    "use_cases_for_other_presentations": ["use case 1", "use case 2"]
  },
  "topics": [
    {
      "topic_title": "short name",
      "topic_summary": "3-5 sentence description",
      "story_context": "one of: credibility, market_problem, solution_vision, implementation, results, other",
      "topics": ["keyword1", "keyword2"],
      "reuse_suggestions": ["suggestion1"],
      "slide_numbers": [1, 2, 3]
    }
  ],
  "slides": [
    {
      "slide_number": 1,
      "slide_type": "one of: case_study, vision, market_context, data_chart, model, process, roadmap, cover, credits, other",
      "slide_caption": "one sentence description",
      "topics": ["keyword1"],
      "reusable": "yes or no or needs_edit"
    }
  ]
}

Return only valid JSON, no other text.`

  try {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Elvex may use different model names
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Elvex API call failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    const content = result.choices[0]?.message?.content

    if (!content) {
      throw new Error('Empty response from Elvex')
    }

    // Parse JSON response
    const parsed = JSON.parse(content)
    return mapElvexResponse(parsed)
  } catch (error: any) {
    console.error('Error calling Elvex chat API:', error)
    throw new Error(`Failed to process deck with Elvex: ${error.message || 'Unknown error'}`)
  }
}

