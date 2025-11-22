import { getSupabaseClient } from '../config/supabaseClient'
import { embedText } from '../llm/embeddingService'
import { getOpenAIClient } from '../config/openaiClient'
import { getEnv } from '../config/env'

export interface ChatReference {
  deck_id: string
  deck_title: string
  topic_id?: string
  topic_title?: string
  slide_id?: string
  slide_number?: number
}

interface Snippet {
  deck_title: string
  deck_id: string
  topic_title?: string
  topic_summary?: string
  reuse_suggestions?: string[]
  slide_numbers?: number[]
  slide_caption?: string
  slide_number?: number
}

export async function answerChatQuery(input: {
  userMessage: string
  limit?: number
}): Promise<{ answer: string; references: ChatReference[] }> {
  const supabase = getSupabaseClient()
  const limit = input.limit || 10

  // Generate embedding for user message
  let queryEmbedding: number[] | null = null
  try {
    queryEmbedding = await embedText(input.userMessage)
  } catch (error) {
    throw new Error(`Failed to generate query embedding: ${error.message || 'Unknown error'}`)
  }

  const snippets: Snippet[] = []
  const references: ChatReference[] = []

  if (queryEmbedding) {
    // Get top topics
    const { data: topics } = await supabase.rpc('match_topics', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: Math.ceil(limit / 2),
    })

    if (topics) {
      for (const topic of topics) {
        snippets.push({
          deck_title: topic.deck_title,
          deck_id: topic.deck_id,
          topic_title: topic.topic_title,
          topic_summary: topic.topic_summary,
          reuse_suggestions: topic.reuse_suggestions,
          slide_numbers: topic.slide_numbers,
        })

        references.push({
          deck_id: topic.deck_id,
          deck_title: topic.deck_title,
          topic_id: topic.id,
          topic_title: topic.topic_title,
        })
      }
    }

    // Get top slides
    const { data: slides } = await supabase.rpc('match_slides', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: Math.ceil(limit / 2),
    })

    if (slides) {
      for (const slide of slides) {
        snippets.push({
          deck_title: slide.deck_title,
          deck_id: slide.deck_id,
          slide_caption: slide.slide_caption,
          slide_number: slide.slide_number,
        })

        references.push({
          deck_id: slide.deck_id,
          deck_title: slide.deck_title,
          slide_id: slide.id,
          slide_number: slide.slide_number,
        })
      }
    }
  }

  if (snippets.length === 0) {
    return {
      answer: "I couldn't find any relevant decks or slides for your request. Please try rephrasing your question or using different keywords.",
      references: [],
    }
  }

  // Build context for LLM
  const snippetsText = snippets
    .map((snippet, idx) => {
      let text = `Snippet ${idx + 1}:\n`
      text += `Deck: ${snippet.deck_title}\n`
      if (snippet.topic_title) {
        text += `Topic: ${snippet.topic_title}\n`
        if (snippet.topic_summary) {
          text += `Summary: ${snippet.topic_summary}\n`
        }
        if (snippet.reuse_suggestions && snippet.reuse_suggestions.length > 0) {
          text += `Reuse suggestions: ${snippet.reuse_suggestions.join('; ')}\n`
        }
        if (snippet.slide_numbers && snippet.slide_numbers.length > 0) {
          text += `Covers slides: ${snippet.slide_numbers.join(', ')}\n`
        }
      }
      if (snippet.slide_caption) {
        text += `Slide ${snippet.slide_number}: ${snippet.slide_caption}\n`
      }
      return text
    })
    .join('\n---\n\n')

  const systemPrompt = `You are a presentation assistant helping internal teams reuse slides and sections from existing decks.

You receive:
- A user request.
- A list of snippets describing topics and slides from existing decks.

Your goals:
- Suggest how the user can structure their story.
- Recommend specific decks and slide numbers.
- For each recommendation, explain in 1-2 sentences why it is relevant.
- Only use information from the provided snippets. If something is not covered, say that it is not available.

Your answer should be concise and practical. Explicitly call out 'Deck: [title], Slides: [numbers]' when you reference material.`

  const userPrompt = `User request: ${input.userMessage}

Available snippets:
${snippetsText}

Provide a helpful recommendation based on the available snippets.`

  // Call OpenAI
  const openai = getOpenAIClient()
  const config = getEnv()

  try {
    const completion = await openai.chat.completions.create({
      model: config.openaiChatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const answer = completion.choices[0]?.message?.content?.trim()
    if (!answer) {
      throw new Error('Empty response from OpenAI')
    }

    return {
      answer,
      references,
    }
  } catch (error: any) {
    console.error('Error calling OpenAI for chat:', error)
    throw new Error(`Failed to generate chat response: ${error.message || 'Unknown error'}`)
  }
}

