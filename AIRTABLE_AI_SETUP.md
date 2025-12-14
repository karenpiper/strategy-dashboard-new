# Airtable AI Horoscope Generation Setup

This guide explains how to set up Airtable AI to generate horoscopes and images, then return them to your app.

## Overview

Instead of using OpenAI directly, you can use Airtable AI to generate horoscopes. The workflow is:

1. **App sends prompt to Airtable** - Creates a record with the horoscope request
2. **Airtable generates horoscope & image** - Uses Airtable Script/Automation with AI
3. **App polls Airtable** - Waits for generation to complete
4. **App retrieves results** - Gets the generated horoscope text and image URL
5. **App stores in Supabase** - Saves the results to your database

## Setup Steps

### 1. Create Airtable Base and Table

1. Create a new Airtable base (or use an existing one)
2. Create a table called **"Horoscope Generation"** (or set `AIRTABLE_AI_TABLE_NAME` env var)
3. Add these fields to the table:

| Field Name | Field Type | Description |
|------------|------------|-------------|
| User ID | Single line text | The user's ID |
| Date | Date | Date for the horoscope (YYYY-MM-DD) |
| Star Sign | Single line text | User's zodiac sign |
| Cafe Astrology Text | Long text | Original horoscope text from Cafe Astrology |
| Image Prompt | Long text | The prompt for image generation |
| Status | Single select | Options: `Pending`, `Processing`, `Completed`, `Failed` |
| Horoscope Text | Long text | Generated horoscope text |
| Dos | Multiple select or JSON | Array of "do" suggestions |
| Donts | Multiple select or JSON | Array of "don't" suggestions |
| Image URL | URL | URL to the generated image |
| Character Name | Single line text | Optional character name |
| Prompt Slots | Long text | JSON string of prompt slots (optional) |
| Prompt Reasoning | Long text | JSON string of reasoning (optional) |
| Error Message | Long text | Error message if generation fails |
| Created At | Date | When the record was created |
| Completed At | Date | When generation completed |

### 2. Set Up Airtable Script/Automation

You need to create an Airtable Script or Automation that:

1. **Watches for new records** with `Status = "Pending"`
2. **Generates horoscope text** using Airtable AI:
   - Transform the Cafe Astrology text into Co-Star style
   - Extract dos and donts
3. **Generates image** using Airtable AI:
   - Use the Image Prompt to generate an image
   - Get the image URL
4. **Updates the record** with:
   - `Status = "Completed"`
   - `Horoscope Text` = generated text
   - `Dos` = array of dos
   - `Donts` = array of donts
   - `Image URL` = image URL
   - `Completed At` = current timestamp

#### Option A: Airtable Scripting (Recommended)

Create an Airtable Script that runs on a schedule or is triggered manually:

```javascript
// Example Airtable Script structure
let table = base.getTable("Horoscope Generation");

// Query for pending records
let query = await table.selectRecordsAsync({
    filterByFormula: "{Status} = 'Pending'"
});

for (let record of query.records) {
    // Update status to Processing
    await table.updateRecordAsync(record.id, {
        "Status": "Processing"
    });
    
    // Get the input data
    let cafeAstrologyText = record.getCellValue("Cafe Astrology Text");
    let starSign = record.getCellValue("Star Sign");
    let imagePrompt = record.getCellValue("Image Prompt");
    
    try {
        // Generate horoscope text using Airtable AI
        // (Use Airtable's AI features or call OpenAI via Airtable)
        let horoscopeResult = await generateHoroscopeText(cafeAstrologyText, starSign);
        
        // Generate image using Airtable AI
        let imageResult = await generateImage(imagePrompt);
        
        // Update record with results
        await table.updateRecordAsync(record.id, {
            "Status": "Completed",
            "Horoscope Text": horoscopeResult.horoscope,
            "Dos": horoscopeResult.dos,
            "Donts": horoscopeResult.donts,
            "Image URL": imageResult.imageUrl,
            "Completed At": new Date()
        });
    } catch (error) {
        await table.updateRecordAsync(record.id, {
            "Status": "Failed",
            "Error Message": error.message
        });
    }
}
```

#### Option B: Airtable Automation with Webhook Trigger (Recommended)

**Two webhook approaches:**

##### Option B1: Webhook Trigger (Best - No Record Needed)

**📖 See [AIRTABLE_AI_STEP_BY_STEP.md](./AIRTABLE_AI_STEP_BY_STEP.md) for detailed step-by-step instructions!**

Quick overview:
1. Create an Automation in Airtable
2. **Trigger**: "When webhook is received" 
   - Get the webhook URL from Airtable (e.g., `https://hooks.airtable.com/workflows/...`)
   - Set this as `AIRTABLE_WEBHOOK_URL` environment variable
3. **Action 1**: Generate horoscope text using "Generate structured data with AI"
   - Uses Cafe Astrology text and star sign
   - Returns JSON with `horoscope`, `dos`, `donts`
4. **Action 2**: Generate image using "Generate image with AI"
   - Uses the image prompt from webhook
   - Returns image URL
5. **Action 3**: Combine results and send webhook back to your app
   - URL: `https://your-app.vercel.app/api/airtable/horoscope-webhook`
   - Method: POST
   - Body: Include `userId`, `date`, `horoscope`, `dos`, `donts`, `imageUrl`, etc.

**Benefits:**
- ✅ No Airtable record needed (cleaner)
- ✅ Direct webhook-to-webhook communication
- ✅ Faster (no database operations in Airtable)
- ✅ Uses Airtable AI tokens (no direct OpenAI needed)

##### Option B2: Record-Based with Webhook Callback

1. Create an Automation in Airtable
2. **Trigger**: "When record matches conditions" → `Status = "Pending"`
3. **Action 1**: Run a script or use Airtable AI extension to generate horoscope & image
4. **Action 2**: Update record with results (`Status = "Completed"`, horoscope text, image URL, etc.)
5. **Action 3**: Send webhook to your app:
   - URL: `https://your-app.vercel.app/api/airtable/horoscope-webhook`
   - Method: POST
   - Body: Include `recordId`, `status`, `horoscope`, `dos`, `donts`, `imageUrl`, etc.

**Webhook Payload Example:**
```json
{
  "recordId": "recXXXXXXXXXXXXXX",
  "status": "Completed",
  "horoscope": "Your generated horoscope text...",
  "dos": ["Do thing 1", "Do thing 2", "Do thing 3"],
  "donts": ["Don't thing 1", "Don't thing 2", "Don't thing 3"],
  "imageUrl": "https://...",
  "characterName": "Optional character name"
}
```

**Benefits of Webhook:**
- ✅ Real-time: App gets notified immediately when generation is done
- ✅ More efficient: No polling needed
- ✅ Faster: No waiting for polling intervals

#### Option C: Third-Party Integration

Use tools like:
- **Make (Integromat)** - Connect Airtable to OpenAI
- **Zapier** - Airtable → OpenAI → Airtable
- **n8n** - Similar workflow automation

### 3. Set Environment Variables

Add these to your Vercel project:

```bash
# Airtable Configuration (choose one approach)

# Option 1: Webhook Trigger (Recommended - No Airtable table needed)
AIRTABLE_WEBHOOK_URL=https://hooks.airtable.com/workflows/...  # Your Airtable webhook URL

# Option 2: Record-Based (Fallback - Requires Airtable table)
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXX  # Your Airtable Personal Access Token
AIRTABLE_AI_BASE_ID=appXXXXXXXXXXXXXXXXXXXX  # Your Airtable Base ID
AIRTABLE_AI_TABLE_NAME=Horoscope Generation  # Optional, defaults to "Horoscope Generation"
```

**Note:** If `AIRTABLE_WEBHOOK_URL` is set, the app will use webhook triggers. Otherwise, it will use the record-based approach.

**To get your Airtable credentials:**
1. **API Key**: Go to https://airtable.com/create/tokens
   - Create a new token
   - Grant scopes: `data.records:read` and `data.records:write`
   - Select your base
   - Copy the token (starts with `pat...`)

2. **Base ID**: 
   - Go to your Airtable base
   - Click "Help" → "API documentation"
   - Find your Base ID (starts with `app...`)

### 4. Test the Integration

1. The app will automatically use Airtable AI if:
   - `AIRTABLE_API_KEY` is set
   - `AIRTABLE_AI_BASE_ID` is set

2. When a horoscope is requested:
   - A record is created in Airtable with `Status = "Pending"`
   - Your Airtable Script/Automation processes it
   - The app polls Airtable every 2 seconds (max 60 attempts = 2 minutes)
   - When `Status = "Completed"`, the app retrieves the results

3. Check the Airtable base to see:
   - New records being created
   - Status changing from "Pending" → "Processing" → "Completed"
   - Generated horoscope text and image URL

## How It Works

1. **User requests horoscope** → App calls `/api/horoscope`
2. **App creates Airtable record** → Record with `Status = "Pending"`
3. **Airtable Script runs** → Generates horoscope & image using AI
4. **Airtable updates record** → Sets `Status = "Completed"` with results
5. **App polls Airtable** → Checks record every 2 seconds
6. **App gets results** → Retrieves horoscope text and image URL
7. **App stores in Supabase** → Saves to `horoscopes` table
8. **App returns to user** → User sees their horoscope

## Troubleshooting

### Records stuck in "Pending"
- Check if your Airtable Script/Automation is running
- Verify the script has proper error handling
- Check Airtable automation logs

### Generation timeout
- Increase `maxAttempts` in `pollAirtableResult()` (default: 60 = 2 minutes)
- Check if Airtable AI is working correctly
- Verify your Airtable Script is updating the Status field

### Missing fields
- Ensure all required fields exist in your Airtable table
- Field names must match exactly (case-sensitive)
- Check that your script is populating all fields

### API errors
- Verify `AIRTABLE_API_KEY` has read/write permissions
- Check that `AIRTABLE_AI_BASE_ID` is correct
- Ensure the table name matches (or set `AIRTABLE_AI_TABLE_NAME`)

## Notes

- **Polling interval**: The app checks Airtable every 2 seconds
- **Timeout**: Maximum 2 minutes (60 attempts × 2 seconds)
- **Field flexibility**: The service tries multiple field name variations
- **Fallback**: If Airtable AI is not configured, it falls back to direct OpenAI calls

