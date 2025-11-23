# n8n Integration Environment Variables

This document describes the environment variables needed for the n8n-based deck processing system.

## Required Environment Variables

### Backend (Next.js / Vercel)

```bash
# Internal API Token (shared secret with n8n)
INTERNAL_API_TOKEN=your-secure-random-token-here

# n8n Webhook URL (for triggering processing)
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-host/webhook/work-sample-uploaded

# Supabase Configuration (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Drive Configuration (required)
GOOGLE_DRIVE_FOLDER_ID=your-folder-id

# Google Drive Authentication (choose one method)
# Option 1: Service Account JSON (recommended)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Option 2: Individual credentials (alternative)
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### n8n Environment Variables

Set these in your n8n instance:

```bash
# Internal API Token (must match INTERNAL_API_TOKEN in Next.js)
INTERNAL_API_TOKEN=your-secure-random-token-here

# OpenAI API Key (enterprise key for LLM and embeddings)
OPENAI_API_KEY=sk-...

# Backend URL (your Next.js app URL)
BACKEND_URL=https://your-app.vercel.app
```

## Deprecated Environment Variables

The following variables are **no longer needed** for deck processing (they may still be used for other features):

- `OPENAI_API_KEY` - No longer used in Next.js app (only in n8n)
- `OPENAI_API_KEY_FALLBACK` - No longer needed
- `OPENAI_CHAT_MODEL` - No longer needed (configured in n8n)
- `OPENAI_EMBEDDING_MODEL` - No longer needed (configured in n8n)
- `ELVEX_API_KEY` - No longer needed
- `ELVEX_ASSISTANT_ID` - No longer needed
- `OPENAI_PROXY_URL` - No longer needed

## Security Notes

1. **INTERNAL_API_TOKEN**: 
   - Use a strong, random token (e.g., `openssl rand -hex 32`)
   - Must be the same value in both Next.js and n8n
   - Never commit to git

2. **NEXT_PUBLIC_N8N_WEBHOOK_URL**:
   - Must be prefixed with `NEXT_PUBLIC_` to be accessible in client-side code
   - Can be public (webhook URLs are typically public endpoints)

3. **OPENAI_API_KEY in n8n**:
   - Only set in n8n, not in Next.js
   - Use enterprise/team key with higher rate limits

## Setting Up in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add all required variables listed above
4. Set `INTERNAL_API_TOKEN` to a secure random value
5. Set `NEXT_PUBLIC_N8N_WEBHOOK_URL` to your n8n webhook URL
6. Redeploy your application

## Setting Up in n8n

1. Go to your n8n instance settings
2. Navigate to "Environment Variables" or "Credentials"
3. Add `INTERNAL_API_TOKEN` (same value as in Vercel)
4. Add `OPENAI_API_KEY` (your enterprise OpenAI key)
5. Add `BACKEND_URL` (your Next.js app URL)
6. Save and restart n8n if needed

## Testing

After setting up environment variables:

1. **Test Internal Token**: Try calling `/api/internal/decks/extract-slides` with and without the token
2. **Test Webhook**: Upload a deck and check n8n logs to see if webhook is triggered
3. **Test Processing**: Verify n8n workflow completes successfully

## Troubleshooting

### "Unauthorized: Invalid or missing X-INTERNAL-TOKEN header"
- Check that `INTERNAL_API_TOKEN` is set in both Next.js and n8n
- Verify the values match exactly (no extra spaces)
- Check that n8n is sending the header: `X-INTERNAL-TOKEN: {{$env.INTERNAL_API_TOKEN}}`

### "N8N_WEBHOOK_URL not configured"
- Set `NEXT_PUBLIC_N8N_WEBHOOK_URL` in Vercel environment variables
- Note: Must be prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding the variable

### Webhook not triggering
- Check n8n webhook is active and listening
- Verify webhook URL is correct
- Check browser console for fetch errors
- Verify CORS is configured in n8n if needed



