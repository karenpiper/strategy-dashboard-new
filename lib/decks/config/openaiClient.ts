import OpenAI from 'openai'
import { getEnv } from './env'

let openaiClient: OpenAI | null = null

export function getOpenAIClient() {
  if (openaiClient) {
    return openaiClient
  }

  const config = getEnv()
  openaiClient = new OpenAI({
    apiKey: config.openaiApiKey,
  })

  return openaiClient
}

