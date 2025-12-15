# Airtable Automation - Detailed Step-by-Step Guide

This guide walks you through creating an Airtable Automation that generates horoscope text and images using Airtable AI.

## Prerequisites

- An Airtable base
- Airtable AI access (check your plan)
- Your app's webhook callback URL: `https://your-app.vercel.app/api/airtable/horoscope-webhook`

---

## Step 1: Create the Automation

1. Open your Airtable base
2. Click **"Automations"** in the top menu bar
3. Click **"Create a new automation"** (or the **"+"** button)
4. Name it: **"Horoscope Generation"**
5. Click **"Save"**

---

## Step 2: Set Up Webhook Trigger

1. In the automation editor, click **"Add trigger"**
2. Select **"When webhook is received"**
3. You'll see a webhook URL appear (looks like: `https://hooks.airtable.com/workflows/v1/...`)
4. **Copy this webhook URL** - This is your `AIRTABLE_WEBHOOK_URL`
   - You'll need to add this to your Vercel environment variables later
5. Click **"Save"**

**What the webhook receives from your app:**
```json
{
  "userId": "user-uuid-here",
  "date": "2024-12-12",
  "starSign": "Aries",
  "cafeAstrologyText": "Today's horoscope text from Cafe Astrology...",
  "userProfile": {
    "name": "John Doe",
    "role": "Designer",
    "hobbies": ["photography", "reading"],
    "likes_fantasy": true,
    "likes_scifi": false,
    "likes_cute": true,
    "likes_minimal": false,
    "hates_clowns": true
  },
  "weekday": "Thursday",
  "season": "Winter",
  "callbackUrl": "https://your-app.vercel.app/api/airtable/horoscope-webhook"
}
```

---

## Step 3: Build Image Prompt (Generate Text with AI)

1. Click **"Add action"** (after the webhook trigger)
2. Select **"Generate text with AI"** (or "Generate structured data with AI" if available)
3. Configure the action:

**Action Name:** `Build Image Prompt`

**Prompt:**
```
You are an expert at creating detailed, vivid image prompts for AI image generation (like DALL-E 3).

Create a detailed image prompt based on this user profile:
- Name: {{trigger.body.userProfile.name}}
- Role: {{trigger.body.userProfile.role}}
- Hobbies: {{trigger.body.userProfile.hobbies}}
- Likes fantasy: {{trigger.body.userProfile.likes_fantasy}}
- Likes sci-fi: {{trigger.body.userProfile.likes_scifi}}
- Likes cute things: {{trigger.body.userProfile.likes_cute}}
- Likes minimal design: {{trigger.body.userProfile.likes_minimal}}
- Hates clowns: {{trigger.body.userProfile.hates_clowns}}
- Star Sign: {{trigger.body.starSign}}
- Day of week: {{trigger.body.weekday}}
- Season: {{trigger.body.season}}

The image should be a hero image for a horoscope dashboard. It should be:
- Visually striking and engaging
- Related to the user's interests and preferences
- Appropriate for the star sign, day, and season
- Professional but fun
- Suitable for a dashboard background

Return ONLY the image prompt text, nothing else. Make it detailed and specific (approximately 100-150 words). Include style, mood, colors, composition, and any relevant details.
```

**Settings:**
- **Model:** Use the best available (GPT-4 or similar)
- **Temperature:** 0.8
- **Max tokens:** 300

4. Click **"Save"**

---

## Step 4: Generate Horoscope Text (Generate Structured Data with AI)

1. Click **"Add action"** (after "Build Image Prompt")
2. Select **"Generate structured data with AI"** (preferred) or **"Generate text with AI"** (fallback)
3. Configure the action:

**Action Name:** `Generate Horoscope Text`

### If Using "Generate structured data with AI":

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

**Output Schema:**

In Airtable, you'll define the schema using their interface. Create an object with these properties:

**Root Type:** `object`

**Properties:**
1. **horoscope**
   - Type: `string`
   - Description: "The transformed horoscope text in Co-Star style"

2. **dos**
   - Type: `array`
   - Items Type: `string`
   - Description: "Array of 3 'do' suggestions"

3. **donts**
   - Type: `array`
   - Items Type: `string`
   - Description: "Array of 3 'don't' suggestions"

**Required Fields:** Check all three fields (horoscope, dos, donts) as required

**Settings:**
- **Model:** Use the best available (GPT-4 or similar)
- **Temperature:** 0.9
- **Max tokens:** 600

### If Using "Generate text with AI" (Fallback):

Use the same prompt as above, but set **Response Format** to **"JSON Object"**.

You'll need to add a parsing step after this (see Step 4b below).

4. Click **"Save"**

### Step 4b: Parse Text Result (Only if using "Generate text with AI")

1. Click **"Add action"** (after "Generate Horoscope Text")
2. Select **"Run a script"**
3. **Action Name:** `Parse Horoscope Text`

**Script:**
```javascript
const config = input.config();
const textResult = config.output || config.text || config.content || '';

let parsed;
try {
  parsed = typeof textResult === 'string' ? JSON.parse(textResult) : textResult;
} catch (e) {
  const jsonMatch = textResult.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('Could not parse horoscope JSON');
  }
}

if (!parsed.horoscope || !Array.isArray(parsed.dos) || !Array.isArray(parsed.donts)) {
  throw new Error('Invalid horoscope structure');
}

return {
  horoscope: parsed.horoscope,
  dos: parsed.dos,
  donts: parsed.donts
};
```

4. Click **"Save"**

---

## Step 5: Set Up Image Storage Table (Required)

Since Airtable requires a Record ID and Attachment Field, you need a table to store the images.

1. In your Airtable base, create a new table called **"Horoscope Images"** (or use an existing table)
2. Add these fields:
   - **Image** (Attachment field) - This is where the generated image will be stored
   - **User ID** (Single line text) - Optional, for tracking
   - **Date** (Date) - Optional, for tracking
   - **Image URL** (URL or Single line text) - Optional, to store the URL
3. **Save the table**

---

## Step 6a: Create Record for Image Storage

**⚠️ IMPORTANT:** You need to add this step BEFORE "Generate Image" because Record ID is required.

1. Click **"Add action"** (after "Generate Horoscope Text" and BEFORE "Generate Image")
   - Or click the **"+ Add advanced logic or action"** button below your actions
2. Select **"Create record"**
3. Configure the action:

**Action Name:** `Create Image Record`

**Table:** Select your "Horoscope Images" table

**Fields to set:**
- **User ID:** `{{trigger.body.userId}}`
- **Date:** `{{trigger.body.date}}`
- (Leave Image field empty - it will be filled by the image generation action)

4. Click **"Save"**

**Important:** 
- After saving, note the action name/number (e.g., "Action 3" or "Create Image Record")
- You'll need this Record ID in the "Generate Image" step
- Make sure this action comes BEFORE "Generate Image" in your workflow

---

## Step 6b: Generate Image (Generate Image with AI)

1. Click **"Add action"** (after "Create Image Record")
2. Select **"Generate image with AI"** (or "Generate image")
3. Configure the action:

**Action Name:** `Generate Horoscope Image`

**Image Prompt:**
```
{{action_1.output}}
```
*(Replace `action_1` with the actual name/number of your "Build Image Prompt" action - use Airtable's variable picker to select it)*

**Record ID (Required):**
- Click the field and use Airtable's variable picker
- Select: `{{Create Image Record.id}}` or `{{Action 2.id}}` 
- (Use the exact name/number of your "Create Image Record" action)
- This references the record ID from the record you just created in Step 6a

**Output Attachment Field (Required):**
- Click the dropdown
- Select: **"Image"** (the attachment field from your "Horoscope Images" table)
- This is where Airtable will save the generated image file

**Settings:**
- **Model:** DALL-E 3 (or best available)
- **Size:** 1024x1024 (or your preference)
- **Quality:** Standard or HD
- **Style:** Natural (or your preference)

**Alternative Approach (If you can't create record first):**

If creating a record is complex, you can:
1. Create a record in "Horoscope Images" table before this action
2. Use that record's ID in the "Record ID" field
3. The image will be saved to that record's "Image" field
4. Then extract the image URL from the record in the "Combine Results" step

4. Click **"Save"**

**Note:** After the image is generated, you can access the image URL from the record's attachment field in the next step.

---

## Step 7: Combine Results (Run a Script)

1. Click **"Add action"** (after both "Generate Horoscope Text" and "Generate Image")
2. Select **"Run a script"**
3. **Action Name:** `Combine Results`

**Script:**
```javascript
const config = input.config();

// Get text result (adjust action names/numbers to match your setup)
// Use Airtable's variable inspector to see the exact field names
// Common names: output, result, text, horoscope, etc.
const textData = config.output || config.result || config.text || {};

// Get the image record that was created and updated
// The image is stored in the attachment field of the record
const imageRecord = config.record || config.output || {};

// Extract image URL from attachment field
// Attachments in Airtable are arrays with objects containing 'url' property
let imageUrl = '';
if (imageRecord.Image && Array.isArray(imageRecord.Image) && imageRecord.Image.length > 0) {
  // Get the first attachment's URL
  const attachment = imageRecord.Image[0];
  imageUrl = attachment.url || attachment.thumbnails?.large?.url || attachment.thumbnails?.full?.url || '';
}

// Fallback: try other common field names from action output
if (!imageUrl) {
  const imageData = config.output || config.result || {};
  imageUrl = imageData.url || imageData.imageUrl || imageData.output || imageData.attachmentUrl || '';
  if (!imageUrl && imageData.content) {
    imageUrl = imageData.content;
  }
  if (!imageUrl && typeof imageData === 'string') {
    imageUrl = imageData;
  }
}

// Get original webhook data
const triggerBody = config.triggerBody || {};
const userId = triggerBody.userId || config.userId || '';
const date = triggerBody.date || config.date || '';

// Combine everything
return {
  userId: userId,
  date: date,
  horoscope: textData.horoscope || textData.output?.horoscope || '',
  dos: textData.dos || textData.output?.dos || [],
  donts: textData.donts || textData.output?.donts || [],
  imageUrl: imageUrl,
  status: "Completed"
};
```

**Important:** You'll need to adjust the action references (`action_2_output`, etc.) based on your actual action names/numbers. Use Airtable's variable inspector to see what's available.

4. Click **"Save"**

---

## Step 8: Send Webhook Back to Your App

If Airtable doesn't have "Send webhook" or "Make HTTP request" actions, you have a few options:

### Option 1: Use "Run a script" with HTTP Request (If Available)

1. Click **"Add action"** (after "Combine Results")
2. Select **"Run a script"**
3. **Action Name:** `Send Results to App`

**Script:**
```javascript
const config = input.config();
const combinedResults = config.output || config.result || {};

// Get callback URL from webhook trigger
const triggerBody = config.triggerBody || {};
const callbackUrl = triggerBody.callbackUrl || 'https://your-app.vercel.app/api/airtable/horoscope-webhook';

// Prepare webhook payload
const payload = {
  userId: combinedResults.userId || triggerBody.userId || '',
  date: combinedResults.date || triggerBody.date || '',
  status: "Completed",
  horoscope: combinedResults.horoscope || '',
  dos: combinedResults.dos || [],
  donts: combinedResults.donts || [],
  imageUrl: combinedResults.imageUrl || ''
};

// Send HTTP request (if Airtable scripts support fetch/HTTP)
// Note: This may not be available in all Airtable plans
try {
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error('Webhook failed: ' + response.statusText);
  }
  
  return { success: true, status: response.status };
} catch (error) {
  throw new Error('Failed to send webhook: ' + error.message);
}
```

### Option 2: Store Results in Airtable Table (App Polls Instead)

If HTTP requests aren't available, store the results in an Airtable table and have your app poll for them:

1. Click **"Add action"** (after "Combine Results")
2. Select **"Update record"** or **"Create record"**
3. **Action Name:** `Store Results`

**Table:** Create a "Horoscope Results" table with fields:
- User ID (Single line text)
- Date (Date)
- Status (Single select: Completed, Failed)
- Horoscope Text (Long text)
- Dos (Multiple select or JSON)
- Donts (Multiple select or JSON)
- Image URL (URL)

**Fields to set:**
- **User ID:** `{{Combine Results.output.userId}}`
- **Date:** `{{Combine Results.output.date}}`
- **Status:** `Completed`
- **Horoscope Text:** `{{Combine Results.output.horoscope}}`
- **Dos:** `{{Combine Results.output.dos}}`
- **Donts:** `{{Combine Results.output.donts}}`
- **Image URL:** `{{Combine Results.output.imageUrl}}`

4. Click **"Save"**

**Then update your app** to poll this Airtable table instead of waiting for a webhook callback.

### Option 3: Use Airtable Extension (If Available)

Some Airtable extensions (like "Data Fetcher" or "HTTP Request") might be available in your plan. Check the Extensions marketplace.

4. Click **"Save"**

---

## Step 9: Add Error Handling (Optional but Recommended)

1. For each AI generation action, set up error handling:
   - Click on the action
   - Look for **"On error"** or **"Error handling"** option
   - Set it to send an error webhook

2. Create an error webhook action:

**Action Name:** `Send Error to App`

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

## Step 10: Test the Automation

1. **Turn on the automation** (toggle switch at the top of the automation editor)
2. **Test it:**
   - Use Airtable's test feature, OR
   - Send a test webhook from your app
3. **Check the logs:**
   - Click on each action to see if it completed successfully
   - Check for any errors
4. **Verify the webhook:**
   - Check your app's logs to see if the webhook was received
   - Verify the data format matches what your app expects

---

## Step 11: Set Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Add:
   - **Name:** `AIRTABLE_WEBHOOK_URL`
   - **Value:** The webhook URL you copied in Step 2
   - **Environment:** Production (and Preview if you want)
5. Click **"Save"**
6. **Redeploy** your app for the change to take effect

---

## Troubleshooting

### Action references not working
- Use Airtable's variable inspector (click the variable icon) to see available fields
- Adjust action names/numbers in scripts to match your actual setup

### AI generation fails
- Check that you have AI credits/tokens available
- Verify your Airtable plan includes AI features
- Check the prompts for syntax errors

### Webhook not received by app
- Verify the callback URL is correct
- Check Vercel logs for errors
- Ensure the webhook body format matches what your app expects

### Results not combining correctly
- Check each action's output using the variable inspector
- Adjust the script to match your actual action output structure
- Test each action individually

---

## Complete Automation Flow

```
Webhook Trigger
    ↓
Build Image Prompt (Generate text with AI)
    ↓
    ├─→ Generate Horoscope Text (Generate structured data with AI)
    │       ↓
    │   (Parse if needed)
    │       ↓
    │
    └─→ Create Image Record (Create record)
            ↓
        Generate Image (Generate image with AI)
            ↓
    Combine Results (Run a script)
            ↓
    Send Webhook to App
```

**Your Current Workflow (from screenshot):**
1. ✅ When webhook received (TRIGGER)
2. ✅ Generate text - "Build Image Prompt"
3. ✅ Generate structured data - "Generate Horoscope Text"
4. ⚠️ **MISSING:** Create Image Record (needed before Generate Image)
5. ⚠️ Generate image - "Generate Horoscope Image" (needs Record ID)
6. ⚠️ **MISSING:** Combine Results (Run a script)
7. ⚠️ **MISSING:** Send Webhook to App

---

## Next Steps

1. Follow each step above to set up your automation
2. Test with a sample webhook
3. Add the `AIRTABLE_WEBHOOK_URL` to Vercel
4. Test from your app - horoscope generation should now use Airtable AI!

