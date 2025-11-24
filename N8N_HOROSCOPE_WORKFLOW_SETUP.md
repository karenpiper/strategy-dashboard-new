# n8n Horoscope Generation Workflow - Manual Setup Guide

This guide walks you through setting up the horoscope generation workflow in n8n step-by-step.

## Workflow Overview

```
Webhook → [Parallel Path 1: Create Horoscope → Parse Text Result]
        → [Parallel Path 2: Validate Image Prompt → Log Prompt Before OpenAI → OpenAI Image Generation → Extract Image URL]
        → Merge Results → Combine Results → Webhook Response
```

## Step-by-Step Node Setup

### 1. Webhook Trigger

**Node Type**: Webhook

**Settings**:
- HTTP Method: `POST`
- Path: `horoscope-generation`
- Response Mode: `Respond to Webhook`
- Response Code: `200`

**Expected Input**:
```json
{
  "cafeAstrologyText": "...",
  "starSign": "Aries",
  "imagePrompt": "...",
  "slots": {...},
  "reasoning": {...},
  "userId": "...",
  "date": "2024-01-15"
}
```

**Connections**: 
- Main output → Connect to both "Create Horoscope" AND "Validate Image Prompt"

---

### 2. Create Horoscope (Parallel Path 1)

**Node Type**: OpenAI (Chat Model)

**Settings**:
- Resource: `Chat`
- Operation: `Complete`
- Model: `gpt-4o-mini`
- Temperature: `0.9`
- Max Tokens: `600`
- Response Format: `JSON Object`

**Messages**:
- **System Message**:
  ```
  You are a witty horoscope transformer. You take traditional horoscopes and make them irreverent and fun in the style of Co-Star. You always return valid JSON.
  ```

- **User Message**:
  ```
  Transform this horoscope from Cafe Astrology into the irreverent, silly style of Co-Star. Make it witty, slightly sarcastic, and fun. Keep the core meaning but make it more casual and entertaining.

  Original horoscope for {{ $json.starSign }}:
  {{ $json.cafeAstrologyText }}

  Return a JSON object with this exact structure:
  {
    "horoscope": "An irreverent, expanded version of the horoscope in Co-Star's style. Make it approximately 150 words. Keep it witty, casual, and entertaining while expanding on the themes from the original. Break it into multiple paragraphs for readability.",
    "dos": ["Do thing 1", "Do thing 2", "Do thing 3"],
    "donts": ["Don't thing 1", "Don't thing 2", "Don't thing 3"]
  }

  Make the do's and don'ts silly, specific, and related to the horoscope content. They should be funny and slightly absurd but still relevant.
  ```

**Credentials**: Connect your OpenAI API credentials

**Connections**:
- Main output → "Parse Text Result"
- Error output → "Webhook Response"

---

### 3. Parse Text Result

**Node Type**: Code

**Code**:
```javascript
// Parse OpenAI response - extract JSON from choices[0].message.content
const openAiOutput = $input.item.json;
let textResult = openAiOutput;

// Extract content from OpenAI response structure
if (openAiOutput.choices && openAiOutput.choices[0] && openAiOutput.choices[0].message) {
  textResult = openAiOutput.choices[0].message.content;
}

// Parse JSON if it's a string
let parsedText = textResult;
if (typeof textResult === 'string') {
  try {
    parsedText = JSON.parse(textResult);
  } catch (e) {
    // If parsing fails, try to extract JSON from text
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedText = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse text transformation response as JSON');
    }
  }
}

// Validate structure
if (!parsedText.horoscope || !Array.isArray(parsedText.dos) || !Array.isArray(parsedText.donts)) {
  throw new Error('Invalid response format from OpenAI text transformation');
}

// Store text result and pass through webhook data
// Get webhook data from input (passed through from Create Horoscope node)
const inputData = $input.item.json;

// Ensure slots and reasoning are preserved as objects (not strings or flattened)
let slots = inputData.slots || null;
let reasoning = inputData.reasoning || null;

// If slots/reasoning are strings, parse them as JSON
if (slots && typeof slots === 'string') {
  try {
    slots = JSON.parse(slots);
  } catch (e) {
    console.error('Failed to parse slots as JSON:', e);
    slots = null;
  }
}

if (reasoning && typeof reasoning === 'string') {
  try {
    reasoning = JSON.parse(reasoning);
  } catch (e) {
    console.error('Failed to parse reasoning as JSON:', e);
    reasoning = null;
  }
}

// Ensure they are objects (not arrays or other types)
if (slots && (typeof slots !== 'object' || Array.isArray(slots))) {
  slots = null;
}
if (reasoning && (typeof reasoning !== 'object' || Array.isArray(reasoning))) {
  reasoning = null;
}

// If slots/reasoning are not objects, try to reconstruct from flattened keys
if (!slots && inputData) {
  if (inputData.style_medium_id || inputData.style_reference_id) {
    slots = {
      style_medium_id: inputData.style_medium_id,
      style_reference_id: inputData.style_reference_id,
      subject_role_id: inputData.subject_role_id,
      subject_twist_id: inputData.subject_twist_id,
      setting_place_id: inputData.setting_place_id,
      setting_time_id: inputData.setting_time_id,
      activity_id: inputData.activity_id,
      mood_vibe_id: inputData.mood_vibe_id,
      color_palette_id: inputData.color_palette_id,
      camera_frame_id: inputData.camera_frame_id,
      lighting_style_id: inputData.lighting_style_id,
      constraints_ids: inputData.constraints_ids || (inputData['constraints_ids[0]'] ? [
        inputData['constraints_ids[0]'],
        inputData['constraints_ids[1]'],
        inputData['constraints_ids[2]'],
        inputData['constraints_ids[3]']
      ].filter(Boolean) : [])
    };
  }
}

if (!reasoning && inputData) {
  if (inputData['reasoning.style_reference'] || inputData.style_reference) {
    reasoning = {
      style_reference: inputData['reasoning.style_reference'] || inputData.style_reference,
      style_medium: inputData['reasoning.style_medium'] || inputData.style_medium,
      subject_role: inputData['reasoning.subject_role'] || inputData.subject_role,
      subject_twist: inputData['reasoning.subject_twist'] || inputData.subject_twist,
      setting_place: inputData['reasoning.setting_place'] || inputData.setting_place,
      setting_time: inputData['reasoning.setting_time'] || inputData.setting_time,
      activity: inputData['reasoning.activity'] || inputData.activity,
      mood_vibe: inputData['reasoning.mood_vibe'] || inputData.mood_vibe,
      color_palette: inputData['reasoning.color_palette'] || inputData.color_palette,
      camera_frame: inputData['reasoning.camera_frame'] || inputData.camera_frame,
      lighting_style: inputData['reasoning.lighting_style'] || inputData.lighting_style,
      constraints: inputData['reasoning.constraints'] || inputData.constraints
    };
  }
}

return [{
  json: {
    horoscope: parsedText.horoscope,
    dos: parsedText.dos,
    donts: parsedText.donts,
    imagePrompt: inputData.imagePrompt || null,
    slots: slots,
    reasoning: reasoning
  }
}];
```

**Connections**:
- Main output → "Merge Results"

---

### 4. Validate Image Prompt (Parallel Path 2)

**Node Type**: Code

**Code**:
```javascript
// Validate and log image prompt before sending to OpenAI
const inputData = $input.item.json;

console.log('📝 Image prompt validation:');
console.log('Input data keys:', Object.keys(inputData || {}));

// Try multiple possible locations for webhook data
let webhookData = inputData;

// Check if data is nested in body
if (inputData.body && typeof inputData.body === 'object') {
  console.log('Found data in body property');
  webhookData = inputData.body;
}
// Check if data is nested in query
else if (inputData.query && typeof inputData.query === 'object') {
  console.log('Found data in query property');
  webhookData = inputData.query;
}
// Check if it's a string that needs parsing
else if (inputData.body && typeof inputData.body === 'string') {
  try {
    webhookData = JSON.parse(inputData.body);
    console.log('Parsed body string to JSON');
  } catch (e) {
    console.warn('Could not parse body as JSON, using inputData directly');
  }
}

console.log('Has imagePrompt:', !!webhookData.imagePrompt);
console.log('imagePrompt length:', webhookData.imagePrompt?.length || 0);

// Validate prompt exists and is not empty
if (!webhookData.imagePrompt || typeof webhookData.imagePrompt !== 'string' || webhookData.imagePrompt.trim() === '') {
  console.error('❌ ERROR: imagePrompt is missing or empty!');
  throw new Error('imagePrompt is missing or empty. Cannot generate image without a valid prompt.');
}

// Ensure prompt is a string and has minimum length
const prompt = String(webhookData.imagePrompt).trim();
if (prompt.length < 10) {
  throw new Error('imagePrompt is too short (less than 10 characters).');
}

console.log('✅ Image prompt validated successfully');

// Pass through all webhook data with validated prompt
return [{
  json: {
    ...webhookData,
    imagePrompt: prompt
  }
}];
```

**Connections**:
- Main output → "Log Prompt Before OpenAI"
- Error output → "Webhook Response"

---

### 5. Log Prompt Before OpenAI

**Node Type**: Code

**Code**:
```javascript
// Log what prompt is being sent to OpenAI Image Generation
const inputData = $input.item.json;

console.log('🎨 Preparing to send prompt to OpenAI Image Generation:');
console.log('imagePrompt:', inputData.imagePrompt);
console.log('imagePrompt length:', inputData.imagePrompt?.length || 0);

// Validate prompt exists
if (!inputData.imagePrompt || typeof inputData.imagePrompt !== 'string' || inputData.imagePrompt.trim() === '') {
  console.error('❌ CRITICAL: imagePrompt is missing or empty!');
  throw new Error('imagePrompt is missing when reaching OpenAI Image Generation node.');
}

const prompt = String(inputData.imagePrompt).trim();
console.log('✅ Prompt validated - sending to OpenAI:');
console.log('Full prompt:', prompt);

// Pass through all data with validated prompt
return [{
  json: {
    ...inputData,
    imagePrompt: prompt
  }
}];
```

**Connections**:
- Main output → "OpenAI Image Generation"

---

### 6. OpenAI Image Generation

**Node Type**: OpenAI (Image Generation)

**Settings**:
- Resource: `Image`
- Operation: `Create`
- Model: `dall-e-3`
- Prompt: `={{ $json.imagePrompt }}`
- Size: `1024x1024`
- Quality: `standard`
- N: `1`

**Credentials**: Connect your OpenAI API credentials

**Connections**:
- Main output → "Extract Image URL"
- Error output → "Webhook Response"

---

### 7. Extract Image URL

**Node Type**: Code

**Code**:
```javascript
// Extract image URL from OpenAI response before n8n converts it to a file object
const openAiResponse = $input.item.json;

// Get the input data that was sent to OpenAI
let inputData = {};
try {
  inputData = $input.item.json;
  
  // Try to get original prompt from previous node
  if (!inputData.imagePrompt) {
    try {
      const logNodeData = $('Log Prompt Before OpenAI');
      if (logNodeData && logNodeData.item && logNodeData.item.json) {
        inputData.imagePrompt = logNodeData.item.json.imagePrompt;
      }
    } catch (e) {
      console.warn('Could not get prompt from Log Prompt Before OpenAI node');
    }
  }
} catch (e) {
  console.warn('Could not get input data');
}

console.log('🔍 OpenAI Image Generation Response Analysis:');
console.log('📤 Original prompt sent:', inputData.imagePrompt || 'NOT FOUND');

// Log the revised prompt that DALL-E 3 returned
if (openAiResponse.revised_prompt) {
  console.log('📥 DALL-E 3 revised prompt:', openAiResponse.revised_prompt);
  console.log('⚠️ WARNING: DALL-E 3 rewrote the prompt!');
} else if (openAiResponse.data && openAiResponse.data[0] && openAiResponse.data[0].revised_prompt) {
  console.log('📥 DALL-E 3 revised prompt:', openAiResponse.data[0].revised_prompt);
}

let imageUrl = null;

// Check for Create Avatar output format: { url, revised_prompt }
if (openAiResponse.url && openAiResponse.revised_prompt) {
  imageUrl = openAiResponse.url;
  console.log('✅ Found image URL from Create Avatar node');
}
// OpenAI API returns: { data: [{ url: '...' }] }
else if (openAiResponse.data && Array.isArray(openAiResponse.data) && openAiResponse.data[0] && openAiResponse.data[0].url) {
  imageUrl = openAiResponse.data[0].url;
  console.log('✅ Found image URL in data array');
}
// Check if URL is in the json directly
else if (openAiResponse.url) {
  imageUrl = openAiResponse.url;
  console.log('✅ Found image URL in json.url');
}
else {
  console.error('❌ Could not find URL in OpenAI response');
  throw new Error('Failed to extract image URL from OpenAI Image Generation response.');
}

// Get original webhook data
let slots = inputData.slots || null;
let reasoning = inputData.reasoning || null;

// Parse if strings
if (slots && typeof slots === 'string') {
  try {
    slots = JSON.parse(slots);
  } catch (e) {
    slots = null;
  }
}

if (reasoning && typeof reasoning === 'string') {
  try {
    reasoning = JSON.parse(reasoning);
  } catch (e) {
    reasoning = null;
  }
}

// Return the image URL along with webhook data
return [{
  json: {
    imageUrl: imageUrl,
    imagePrompt: inputData.imagePrompt || openAiResponse.revised_prompt || null,
    slots: slots,
    reasoning: reasoning
  }
}];
```

**Connections**:
- Main output → "Merge Results"

---

### 8. Merge Results

**Node Type**: Merge

**Settings**:
- Mode: `Append`
- Merge: `Merge All Inputs`

**Purpose**: Combines outputs from both parallel paths (text and image)

**Connections**:
- Main output → "Combine Results"

---

### 9. Combine Results

**Node Type**: Code

**Code**:
```javascript
// This node receives merged data from both Parse Text Result and Extract Image URL
const inputItems = $input.all();

console.log('Number of input items:', inputItems.length);

// Find text result (from Parse Text Result node)
let textResult = null;
let imageOutput = null;
let imageItem = null;

for (const item of inputItems) {
  const data = item.json;
  // Text result has horoscope, dos, donts properties
  if (data.horoscope && data.dos && data.donts) {
    textResult = data;
    console.log('✅ Found text result');
  }
  // Image output - check for imageUrl from Extract Image URL node
  else if (data.imageUrl) {
    imageOutput = data;
    imageItem = item;
    console.log('✅ Found image output');
  }
}

if (!textResult) {
  throw new Error('Failed to get text result. Make sure Parse Text Result node completed successfully.');
}

if (!imageOutput) {
  throw new Error('Failed to get image output. Make sure OpenAI Image Generation node completed successfully.');
}

// Extract image URL
let imageUrl = imageOutput.imageUrl;

if (!imageUrl) {
  throw new Error('Failed to extract image URL from OpenAI response.');
}

// Get original webhook data (imagePrompt, slots, reasoning)
const webhookData = {
  imagePrompt: textResult?.imagePrompt || imageItem?.json?.imagePrompt || null,
  slots: textResult?.slots || imageItem?.json?.slots || null,
  reasoning: textResult?.reasoning || imageItem?.json?.reasoning || null
};

// Combine all results
return [{
  json: {
    horoscope: textResult.horoscope,
    dos: textResult.dos,
    donts: textResult.donts,
    imageUrl: imageUrl,
    prompt: webhookData.imagePrompt,
    slots: webhookData.slots,
    reasoning: webhookData.reasoning
  }
}];
```

**Connections**:
- Main output → "Webhook Response"

---

### 10. Webhook Response

**Node Type**: Respond to Webhook

**Settings**:
- Response Code: `200`
- Response Body: `={{ $json }}`

**Purpose**: Returns the combined results to Next.js

---

## Connection Summary

1. **Webhook** → **Create Horoscope** (main)
2. **Webhook** → **Validate Image Prompt** (main)
3. **Create Horoscope** → **Parse Text Result** (main)
4. **Create Horoscope** → **Webhook Response** (error)
5. **Parse Text Result** → **Merge Results** (main)
6. **Validate Image Prompt** → **Log Prompt Before OpenAI** (main)
7. **Validate Image Prompt** → **Webhook Response** (error)
8. **Log Prompt Before OpenAI** → **OpenAI Image Generation** (main)
9. **OpenAI Image Generation** → **Extract Image URL** (main)
10. **OpenAI Image Generation** → **Webhook Response** (error)
11. **Extract Image URL** → **Merge Results** (main)
12. **Merge Results** → **Combine Results** (main)
13. **Combine Results** → **Webhook Response** (main)

## Testing

After setting up, test the workflow by sending a POST request to your webhook URL with:

```json
{
  "cafeAstrologyText": "Today is a good day for Aries...",
  "starSign": "Aries",
  "imagePrompt": "Anime style. Portrait of John (Aries), a developer, as warrior. They are in cozy library during a stormy afternoon. sci fi high tech mood, warm oranges and reds palette, soft natural lighting. sharp focus on the face, avatar friendly portrait ratio.",
  "slots": {...},
  "reasoning": {...},
  "userId": "test-user",
  "date": "2024-01-15"
}
```

## Notes

- Make sure all Code nodes return arrays: `return [{ json: {...} }]`
- The Merge node should be set to "Append" mode, not "Combine"
- All OpenAI nodes need valid credentials configured
- The webhook should be activated in n8n for it to receive requests

