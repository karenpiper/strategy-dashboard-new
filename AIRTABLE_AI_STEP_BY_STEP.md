# Airtable AI Horoscope Generation - Step-by-Step Guide (Option B1)

This guide walks you through setting up an Airtable Automation that:
1. **Fetches** the Cafe Astrology horoscope text from the website
2. **Builds** the image prompt from user profile data
3. **Generates** both the horoscope text and image using Airtable AI
4. **Sends** results back to your app

## Overview

Your automation will:
1. **Receive webhook** from your app with user profile data
2. **Fetch Cafe Astrology text** from the website (for the star sign)
3. **Build image prompt** using AI based on user profile
4. **Generate horoscope text** (structured data) using Airtable AI
5. **Generate image** using Airtable AI
6. **Combine results** and send webhook back to your app

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

**Note:** The app will fetch the Cafe Astrology text and pass it in the webhook. If you prefer Airtable to fetch it, you can use the table approach below.

---

## Step 3: Get Cafe Astrology Text

**Simplest Approach:** The app already fetches the Cafe Astrology text and passes it in the webhook. You can use it directly!

1. Click **"Add action"** after the webhook trigger
2. The Cafe Astrology text is already in `{{trigger.body.cafeAstrologyText}}`
3. You can skip to Step 4 (Build Image Prompt) and use the text directly in Step 5

**Alternative: If you want Airtable to fetch it (using a table with URLs)**

If you prefer Airtable to fetch the text itself, create a table with URLs:

### Step 3a: Create the URLs Table (Optional)

1. In your Airtable base, create a new table called **"Cafe Astrology URLs"**
2. Add these fields:
   - **Star Sign** (Single select or Single line text) - The zodiac sign name
   - **URL** (URL or Single line text) - The Cafe Astrology URL for that sign
3. Add records for each star sign:

| Star Sign | URL |
|-----------|-----|
| Aries | https://cafeastrology.com/ariesdailyhoroscope.html |
| Taurus | https://cafeastrology.com/taurusdailyhoroscope.html |
| Gemini | https://cafeastrology.com/geminidailyhoroscope.html |
| Cancer | https://cafeastrology.com/cancerdailyhoroscope.html |
| Leo | https://cafeastrology.com/leodailyhoroscope.html |
| Virgo | https://cafeastrology.com/virgodailyhoroscope.html |
| Libra | https://cafeastrology.com/libradailyhoroscope.html |
| Scorpio | https://cafeastrology.com/scorpiodailyhoroscope.html |
| Sagittarius | https://cafeastrology.com/sagittariusdailyhoroscope.html |
| Capricorn | https://cafeastrology.com/capricorndailyhoroscope.html |
| Aquarius | https://cafeastrology.com/aquariusdailyhoroscope.html |
| Pisces | https://cafeastrology.com/piscesdailyhoroscope.html |

4. **Save the table**

**Note:** Since Airtable doesn't have a direct HTTP request action, and the app already fetches the text, we recommend using the text from the webhook (`{{trigger.body.cafeAstrologyText}}`) directly. This is simpler and more reliable.

1. Click **"Add action"** after "Fetch Cafe Astrology HTML"
2. Select **"Run a script"**

**Script:**
```javascript
// IMPORTANT: input.config() can only be called ONCE in Airtable scripts
// Store it in a variable first
const config = input.config();

// Get the HTML response from the HTTP request
// Adjust field names based on your Airtable setup
const html = config.htmlResponse || config.response || config.body || '';

// Get star sign from webhook (passed through)
const triggerBody = config.triggerBody || {};
const starSign = config.starSign || triggerBody.starSign || '';

if (!html) {
  throw new Error('No HTML response received from Cafe Astrology');
}

// Parse the HTML to extract the daily horoscope text
let horoscopeText = '';

// Method 1: Look for the date pattern and extract text after it
const datePattern = /(November|December|January|February|March|April|May|June|July|August|September|October)\s+\d{1,2},\s+\d{4}/;
const dateMatch = html.match(datePattern);

if (dateMatch) {
  const dateIndex = html.indexOf(dateMatch[0]);
  const afterDate = html.substring(dateIndex + dateMatch[0].length);
  
  // Extract text until we hit another section
  const nextSection = afterDate.match(/<(h[1-6]|div class|section|nav|footer|Creativity:)/i);
  const endIndex = nextSection ? afterDate.indexOf(nextSection[0]) : Math.min(afterDate.length, 2000);
  
  let extracted = afterDate.substring(0, endIndex);
  // Remove HTML tags
  extracted = extracted.replace(/<[^>]*>/g, ' ');
  // Remove script and style content
  extracted = extracted.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  extracted = extracted.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  // Clean up whitespace
  extracted = extracted.replace(/\s+/g, ' ').trim();
  
  // Find the actual horoscope text (usually the longest paragraph)
  const sentences = extracted.split(/[.!?]\s+/).filter(function(s) { return s.length > 50; });
  if (sentences.length > 0) {
    horoscopeText = sentences.slice(0, 5).join('. ').trim();
    if (horoscopeText && !horoscopeText.endsWith('.')) {
      horoscopeText += '.';
    }
  }
}

// Method 2: Look for paragraph tags with substantial content
if (!horoscopeText || horoscopeText.length < 200) {
  const allText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
  
  if (dateMatch) {
    const dateText = dateMatch[0];
    const dateIndex = allText.indexOf(dateText);
    if (dateIndex !== -1) {
      const afterDate = allText.substring(dateIndex + dateText.length);
      const endMarkers = ['Creativity:', 'Love:', 'Business:', 'Yesterday', 'Tomorrow', 'Choose Another Sign'];
      let endIndex = afterDate.length;
      for (let i = 0; i < endMarkers.length; i++) {
        const marker = endMarkers[i];
        const markerIndex = afterDate.indexOf(marker);
        if (markerIndex !== -1 && markerIndex < endIndex) {
          endIndex = markerIndex;
        }
      }
      
      const extracted = afterDate.substring(0, endIndex).trim();
      if (extracted.length > 200) {
        horoscopeText = extracted;
      }
    }
  }
}

// Check if we have valid horoscope text
const textLength = horoscopeText ? horoscopeText.length : 0;
if (!horoscopeText || horoscopeText.length < 100) {
  throw new Error('Could not extract horoscope text from Cafe Astrology page. Found text length: ' + textLength);
}

// Return the extracted text and star sign
return {
  cafeAstrologyText: horoscopeText,
  starSign: starSign
};
```

**Note:** In Airtable scripts, you access input data using `input.config()`. The exact field names depend on how Airtable passes data between actions. You may need to adjust:
- `input.config().htmlResponse` - might be `input.config().response` or `input.config().body`
- `input.config().starSign` - might come from the trigger body

3. **Name this action:** "Parse Cafe Astrology Text"
4. **Save the action**

// Parse the HTML to extract the daily horoscope text
let horoscopeText = '';

// Method 1: Look for the date pattern and extract text after it
const datePattern = /(November|December|January|February|March|April|May|June|July|August|September|October)\s+\d{1,2},\s+\d{4}/;
const dateMatch = html.match(datePattern);

if (dateMatch) {
  const dateIndex = html.indexOf(dateMatch[0]);
  const afterDate = html.substring(dateIndex + dateMatch[0].length);
  
  // Extract text until we hit another section
  const nextSection = afterDate.match(/<(h[1-6]|div class|section|nav|footer|Creativity:)/i);
  const endIndex = nextSection ? afterDate.indexOf(nextSection[0]) : Math.min(afterDate.length, 2000);
  
  let extracted = afterDate.substring(0, endIndex);
  // Remove HTML tags
  extracted = extracted.replace(/<[^>]*>/g, ' ');
  // Remove script and style content
  extracted = extracted.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  extracted = extracted.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  // Clean up whitespace
  extracted = extracted.replace(/\s+/g, ' ').trim();
  
  // Find the actual horoscope text (usually the longest paragraph)
  const sentences = extracted.split(/[.!?]\s+/).filter(s => s.length > 50);
  if (sentences.length > 0) {
    horoscopeText = sentences.slice(0, 5).join('. ').trim();
    if (horoscopeText && !horoscopeText.endsWith('.')) {
      horoscopeText += '.';
    }
  }
}

// Method 2: Look for paragraph tags with substantial content
if (!horoscopeText || horoscopeText.length < 200) {
  const allText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
  
  if (dateMatch) {
    const dateText = dateMatch[0];
    const dateIndex = allText.indexOf(dateText);
    if (dateIndex !== -1) {
      const afterDate = allText.substring(dateIndex + dateText.length);
      const endMarkers = ['Creativity:', 'Love:', 'Business:', 'Yesterday', 'Tomorrow', 'Choose Another Sign'];
      let endIndex = afterDate.length;
      for (const marker of endMarkers) {
        const markerIndex = afterDate.indexOf(marker);
        if (markerIndex !== -1 && markerIndex < endIndex) {
          endIndex = markerIndex;
        }
      }
      
      const extracted = afterDate.substring(0, endIndex).trim();
      if (extracted.length > 200) {
        horoscopeText = extracted;
      }
    }
  }
}

if (!horoscopeText || horoscopeText.length < 100) {
  throw new Error(`Could not extract horoscope text from Cafe Astrology page. Found text length: ${horoscopeText?.length || 0}`);
}

return {
  cafeAstrologyText: horoscopeText,
  starSign: starSign
};
```

3. **Name this action:** "Fetch Cafe Astrology Text"
4. **Save the action**

---

## Step 4: Build Image Prompt Using AI

1. Click **"Add action"** after "Fetch Cafe Astrology Text"
2. Select **"Generate text with AI"** or **"Generate structured data with AI"**
3. Configure the AI generation:

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
- Model: Use the best available (GPT-4 or similar)
- Temperature: 0.8 (for creativity)
- Max tokens: 300

4. **Name this action:** "Build Image Prompt"
5. **Save the action**

---

## Step 5: Generate Horoscope Text (Structured Data)

1. Click **"Add action"** after "Build Image Prompt"
2. Select **"Generate structured data with AI"** (or "Generate text with AI" if structured data isn't available)
3. Configure the AI generation:

### If Using "Generate structured data with AI":

**Input Data:**
- Access Cafe Astrology text: `{{trigger.body.cafeAstrologyText}}` (from webhook)
- Access star sign: `{{trigger.body.starSign}}`

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

## Step 6: Generate Image (Parallel to Text Generation)

**Important:** This can run in parallel with text generation for speed, but Airtable may require sequential execution.

1. Click **"Add action"** after "Build Image Prompt"
2. Select **"Generate image with AI"** (or "Generate image")
3. Configure the image generation:

**Image Prompt:**
```
{{action_2.output}} 
```
(Replace `action_2` with your "Build Image Prompt" action name/number)

**Settings:**
- Model: DALL-E 3 (or best available)
- Size: 1024x1024 (or your preferred size)
- Quality: Standard or HD (depending on your Airtable plan)
- Style: Natural (or your preference)

4. **Name this action:** "Generate Horoscope Image"
5. **Save the action**

**Note:** If Airtable doesn't support parallel execution, run image generation after text generation.

---

## Step 7: Parse Text Result (If Needed)

If you used "Generate text with AI" instead of structured data, add a parsing step:

1. Click **"Add action"** after "Generate Horoscope Text"
2. Select **"Run a script"** or **"Code"**
3. Add this code to parse the JSON:

```javascript
// Get the AI text generation result
const textResult = {{action_3.output}}; // Replace action_3 with your actual action name

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

## Step 8: Combine Results

1. Click **"Add action"** after both text and image generation
2. Select **"Run a script"** or use a **"Merge"** action if available
3. Combine the results:

**If using script:**
```javascript
// Get text result (from structured data or parsed)
const textData = {{action_4.output}}; // Your text generation action
// OR if you parsed it:
// const textData = {{action_5.output}}; // Your parse action

// Get image result
const imageData = {{action_3.output}}; // Your image generation action

// Extract image URL
let imageUrl = imageData.url || imageData.imageUrl || imageData.output?.url;
if (!imageUrl && imageData.content) {
  imageUrl = imageData.content;
}

// Get original webhook data
const userId = {{trigger.body.userId}};
const date = {{trigger.body.date}};

// Combine everything
return {
  userId: userId,
  date: date,
  horoscope: textData.horoscope || textData.output?.horoscope,
  dos: textData.dos || textData.output?.dos || [],
  donts: textData.donts || textData.output?.donts || [],
  imageUrl: imageUrl,
  status: "Completed"
};
```

**Note:** Replace action numbers with your actual action names/numbers:
- `action_1` = Fetch Cafe Astrology Text
- `action_2` = Build Image Prompt
- `action_3` = Generate Image
- `action_4` = Generate Horoscope Text (or `action_5` = Parse Horoscope Text)

4. **Name this action:** "Combine Results"
5. **Save the action**

---

## Step 9: Send Webhook Back to Your App

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
  "userId": "{{action_6.output.userId}}",
  "date": "{{action_6.output.date}}",
  "status": "Completed",
  "horoscope": "{{action_6.output.horoscope}}",
  "dos": {{action_6.output.dos}},
  "donts": {{action_6.output.donts}},
  "imageUrl": "{{action_6.output.imageUrl}}"
}
```

**Note:** Replace `action_6` with your actual "Combine Results" action name/number.

4. **Name this action:** "Send Results to App"
5. **Save the action**

---

## Step 10: Add Error Handling (Optional but Recommended)

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

## Step 11: Test the Automation

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
  "userProfile": {
    "name": "Test User",
    "role": "Designer",
    "hobbies": ["photography"],
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

## Step 12: Set Environment Variable

In your Vercel project:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - **Name:** `AIRTABLE_WEBHOOK_URL`
   - **Value:** The webhook URL you copied in Step 2
3. **Save** and redeploy

---

## Troubleshooting

### Cafe Astrology fetch fails
- Check that the star sign mapping is correct
- Verify the URL format matches Cafe Astrology's structure
- Check if Cafe Astrology blocks automated requests (may need different headers)

### Image prompt generation fails
- Ensure all user profile fields are passed correctly
- Check that the AI model has access to generate text
- Try a simpler prompt first

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
Webhook Trigger (receives user profile)
    ↓
Fetch Cafe Astrology Text (from website)
    ↓
Build Image Prompt (using AI + user profile)
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
Fetch Cafe Astrology Text
    ↓
Build Image Prompt
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
