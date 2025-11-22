/**
 * Environment configuration for deck ingestion system
 */

export interface DeckConfig {
  openaiApiKey: string
  supabaseUrl: string
  supabaseServiceRoleKey: string
  googleDriveFolderId: string
  googleClientEmail?: string
  googlePrivateKey?: string
  googleServiceAccountJson?: string
  openaiChatModel: string
  openaiEmbeddingModel: string
  maxDeckPages: number
  maxDeckSizeMB: number
}

let cachedConfig: DeckConfig | null = null

export function getEnv(): DeckConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required')
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required')
  }

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }

  const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!googleDriveFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is required')
  }

  // Google auth: try JSON first, then fallback to individual vars
  let googleClientEmail: string | undefined
  let googlePrivateKey: string | undefined
  const googleServiceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (googleServiceAccountJson) {
    try {
      const parsed = JSON.parse(googleServiceAccountJson)
      googleClientEmail = parsed.client_email
      googlePrivateKey = parsed.private_key
    } catch (error) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON')
    }
  } else {
    googleClientEmail = process.env.GOOGLE_CLIENT_EMAIL
    googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }

  if (!googleClientEmail || !googlePrivateKey) {
    throw new Error(
      'Google Drive authentication required: either GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be set'
    )
  }

  const openaiChatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
  const openaiEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
  const maxDeckPages = parseInt(process.env.MAX_DECK_PAGES || '100', 10)
  const maxDeckSizeMB = parseInt(process.env.MAX_DECK_SIZE_MB || '25', 10)

  cachedConfig = {
    openaiApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    googleDriveFolderId,
    googleClientEmail,
    googlePrivateKey,
    googleServiceAccountJson,
    openaiChatModel,
    openaiEmbeddingModel,
    maxDeckPages,
    maxDeckSizeMB,
  }

  return cachedConfig
}

