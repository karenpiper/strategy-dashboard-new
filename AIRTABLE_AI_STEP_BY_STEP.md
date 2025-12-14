# Airtable AI Horoscope Generation - Step-by-Step Guide (Option B1)

This guide walks you through setting up an Airtable Automation that generates both horoscope text and images using Airtable AI.

## Overview

Your automation will:
1. **Receive webhook** from your app with horoscope request
2. **Generate horoscope text** (structured data) using Airtable AI
3. **Generate image** using Airtable AI
4. **Combine results** and send webhook back to your app

---

## Step 1: Create the Automation

1. Go to your Airtable base
2. Click **"Automations"** in the top menu
3. Click **"Create a new automation"**
4. Name it: **"Horoscope Generation"**

---

## Step 2: Set Up Webhook Trigger

1. Click **"Add trigger"**
2. Select **"When webhook is received"**
3. Click **"Copy webhook URL"** - This is your `AIRTABLE_WEBHOOK_URL`
   - It will look like: `https://hooks.airtable.com/workflows/v1/...`
4. **Save this URL** - You'll need to add it to your Vercel environment variables as `AIRTABLE_WEBHOOK_URL`

**Expected Webhook Payload** (from your app):
```json
{
  "userId": "user-uuid-here",
  "date": "2024-12-12",
  "starSign": "Aries",
  "cafeAstrologyText": "Original horoscope text from Cafe Astrology...",
  "imagePrompt": "A detailed image prompt for DALL-E...",
  "callbackUrl": "https://your-app.vercel.app/api/airtable/horoscope-webhook",
  "slots": { ... },
  "reasoning": { ... }
}
```

---

## Step 3: Generate Horoscope Text (Structured Data)

1. Click **"Add action"** after the webhook trigger
2. Select **"Generate structured data with AI"** (or "Generate text with AI" if structured data isn't available)
3. Configure the AI generation:

### If Using "Generate structured data with AI":

**Input Data:**
- Access webhook data using: `{{trigger.body.cafeAstrologyText}}` and `{{trigger.body.starSign}}`

**Prompt:**
```
Transform this horoscope from Cafe Astrology into the irreverent, silly style of Co-Star. Make it witty, slightly sarcastic, and fun. Keep the core meaning but make it more casual and entertaining.

Original horoscope for {{trigger.body.starSign}}:
{{trigger.body.cafeAstrologyText}}

Return a JSON object with this exact structure:
{
  "horoscope": "An irreverent, expanded version of the horoscope in Co-Star's style. Make it approximately 150 words. Keep it witty, casual, and entertaining while expanding on the themes from the original. Break it into multiple paragraphs for readability.",
  "dos": ["Do thing 1", "Do thing 2", "Do thing 3"],
  "donts": ["Don't thing 1", "Don't thing 2", "Don't thing 3"]
}

Make the do's and don'ts silly, specific, and related to the horoscope content. They should be funny and slightly absurd but still relevant.
```

**Output Schema** (if using structured data):
```json
{
  "type": "object",
  "properties": {
    "horoscope": {
      "type": "string",
      "description": "The transformed horoscope text in Co-Star style"
    },
    "dos": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of 3 'do' suggestions"
    },
    "donts": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of 3 'don't' suggestions"
    }
  },
  "required": ["horoscope", "dos", "donts"]
}
```

**Settings:**
- Model: Use the best available (GPT-4 or similar)
- Temperature: 0.9 (for creativity)
- Max tokens: 600

### If Using "Generate text with AI" (Fallback):

**Prompt:** (Same as above)

**Response Format:** JSON Object

**Post-processing:** You'll need to parse the JSON response in a later step.

4. **Name this action:** "Generate Horoscope Text"
5. **Save the action**

---

## Step 4: Generate Image (Parallel to Text Generation)

**Important:** This should run in parallel with text generation for speed.

1. Click **"Add action"** after the webhook trigger (not after the text generation)
2. Select **"Generate image with AI"** (or "Generate image")
3. Configure the image generation:

**Image Prompt:**
```
{{trigger.body.imagePrompt}}
```

**Settings:**
- Model: DALL-E 3 (or best available)
- Size: 1024x1024 (or your preferred size)
- Quality: Standard or HD (depending on your Airtable plan)
- Style: Natural (or your preference)

4. **Name this action:** "Generate Horoscope Image"
5. **Save the action**

**Note:** Airtable may not support parallel execution directly. If not, run image generation after text generation.

---

## Step 5: Parse Text Result (If Needed)

If you used "Generate text with AI" instead of structured data, add a parsing step:

1. Click **"Add action"** after "Generate Horoscope Text"
2. Select **"Run a script"** or **"Code"**
3. Add this code to parse the JSON:

```javascript
// Get the AI text generation result
const textResult = {{action_1.output}}; // Replace action_1 with your actual action name

// Extract the JSON content
let jsonString = textResult;
if (typeof textResult === 'object' && textResult.content) {
  jsonString = textResult.content;
}

// Parse JSON
let parsed;
try {
  parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
} catch (e) {
  // Try to extract JSON from text if wrapped
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('Could not parse horoscope JSON');
  }
}

// Validate structure
if (!parsed.horoscope || !Array.isArray(parsed.dos) || !Array.isArray(parsed.donts)) {
  throw new Error('Invalid horoscope structure');
}

// Return parsed data
return {
  horoscope: parsed.horoscope,
  dos: parsed.dos,
  donts: parsed.donts
};
```

4. **Name this action:** "Parse Horoscope Text"
5. **Save the action**

---

## Step 6: Combine Results

1. Click **"Add action"** after both text and image generation
2. Select **"Run a script"** or use a **"Merge"** action if available
3. Combine the results:

**If using script:**
```javascript
// Get text result (from structured data or parsed)
const textData = {{action_2.output}}; // Your text generation action
// OR if you parsed it:
// const textData = {{action_3.output}}; // Your parse action

// Get image result
const imageData = {{action_2.output}}; // Your image generation action

// Extract image URL
let imageUrl = imageData.url || imageData.imageUrl || imageData.output?.url;
if (!imageUrl && imageData.content) {
  imageUrl = imageData.content;
}

// Combine everything
return {
  userId: {{trigger.body.userId}},
  date: {{trigger.body.date}},
  horoscope: textData.horoscope || textData.output?.horoscope,
  dos: textData.dos || textData.output?.dos || [],
  donts: textData.donts || textData.output?.donts || [],
  imageUrl: imageUrl,
  status: "Completed"
};
```

4. **Name this action:** "Combine Results"
5. **Save the action**

---

## Step 7: Send Webhook Back to Your App

1. Click **"Add action"** after "Combine Results"
2. Select **"Send webhook"** or **"Make HTTP request"**
3. Configure the webhook:

**URL:**
```
{{trigger.body.callbackUrl}}
```
OR hardcode:
```
https://your-app.vercel.app/api/airtable/horoscope-webhook
```

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "{{action_4.output.userId}}",
  "date": "{{action_4.output.date}}",
  "status": "Completed",
  "horoscope": "{{action_4.output.horoscope}}",
  "dos": {{action_4.output.dos}},
  "donts": {{action_4.output.donts}},
  "imageUrl": "{{action_4.output.imageUrl}}"
}
```

**Note:** Replace `action_4` with your actual "Combine Results" action name/number.

4. **Name this action:** "Send Results to App"
5. **Save the action**

---

## Step 8: Add Error Handling (Optional but Recommended)

1. Add error handling to each AI generation action:
   - Most Airtable actions have an "On error" option
   - Set it to send a webhook with error status

2. Create an error webhook action:

**URL:** Same as success webhook
**Method:** POST
**Body:**
```json
{
  "userId": "{{trigger.body.userId}}",
  "date": "{{trigger.body.date}}",
  "status": "Failed",
  "errorMessage": "{{error.message}}"
}
```

---

## Step 9: Test the Automation

1. **Turn on the automation** (toggle switch at top)
2. **Test with a sample webhook** from your app or use Airtable's test feature
3. **Check the logs** to see if each step completes
4. **Verify the webhook** is received by your app

**Test Payload:**
```json
{
  "userId": "test-user-123",
  "date": "2024-12-12",
  "starSign": "Aries",
  "cafeAstrologyText": "Today is a good day for Aries to take action...",
  "imagePrompt": "A mystical scene with stars and cosmic energy, vibrant colors, fantasy style",
  "callbackUrl": "https://your-app.vercel.app/api/airtable/horoscope-webhook"
}
```

---

## Step 10: Set Environment Variable

In your Vercel project:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - **Name:** `AIRTABLE_WEBHOOK_URL`
   - **Value:** The webhook URL you copied in Step 2
3. **Save** and redeploy

---

## Troubleshooting

### Text generation returns invalid JSON
- Check that you're using "Generate structured data" if available
- If using text generation, ensure the prompt explicitly asks for JSON
- Add a parsing step to extract JSON from text

### Image generation fails
- Check that the image prompt is being passed correctly
- Verify your Airtable plan supports image generation
- Try a simpler prompt first

### Webhook not received by app
- Check the callback URL is correct
- Verify the webhook body matches the expected format
- Check Vercel logs for errors

### Results not combining correctly
- Use Airtable's variable inspector to see what each action outputs
- Adjust the script to match your actual action output structure
- Test each action individually

---

## Complete Automation Flow Diagram

```
Webhook Trigger
    ↓
    ├─→ Generate Horoscope Text (Structured Data)
    │       ↓
    │   Parse Text (if needed)
    │       ↓
    │
    └─→ Generate Image
            ↓
    Combine Results
            ↓
    Send Webhook to App
```

---

## Alternative: Sequential Flow (If Parallel Not Supported)

If Airtable doesn't support parallel execution:

```
Webhook Trigger
    ↓
Generate Horoscope Text
    ↓
Generate Image
    ↓
Combine Results
    ↓
Send Webhook to App
```

This will be slower but will work the same way.

---

## Next Steps

1. Set up the automation following these steps
2. Test with a sample request
3. Add the `AIRTABLE_WEBHOOK_URL` to Vercel
4. Test from your app - the horoscope generation should now use Airtable AI!

