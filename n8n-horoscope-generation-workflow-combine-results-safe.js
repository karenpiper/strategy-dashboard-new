// This node receives merged data from both Parse Text Result and OpenAI Image Generation
// The Merge node combines them, so we get both in $input.all()
// IMPORTANT: We avoid using $() to reference nodes directly to prevent "Referenced node doesn't exist" errors

// Get all input items from the merge (should be 2: one from text path, one from image path)
const inputItems = $input.all();

// Find text result (from Parse Text Result node)
let textResult = null;
let imageOutput = null;

for (const item of inputItems) {
  const data = item.json;
  // Text result has horoscope, dos, donts properties
  if (data.horoscope && data.dos && data.donts) {
    textResult = data;
  }
  // Image output - could be file object (mimeType, fileType) or API response
  else if (data.mimeType || data.fileType || data.data || data.url || data.response || (data.choices === undefined && !data.horoscope)) {
    imageOutput = data;
  }
}

if (!textResult) {
  throw new Error('Failed to get text result. Make sure Parse Text Result node completed successfully.');
}

if (!imageOutput) {
  throw new Error('Failed to get image output. Make sure OpenAI Image Generation node completed successfully.');
}

// Extract image URL from the merged data
// Even with "Return URL" enabled, n8n may still download the image as a file object
// The file object (with mimeType, fileType, etc.) doesn't contain the URL
let imageUrl = null;

// First, check if the merged imageOutput has the URL in standard OpenAI response format
if (imageOutput.data && Array.isArray(imageOutput.data) && imageOutput.data[0] && imageOutput.data[0].url) {
  imageUrl = imageOutput.data[0].url;
  console.log('✅ Found image URL in merged output data array');
}
// Check for direct url property
else if (imageOutput.url) {
  imageUrl = imageOutput.url;
  console.log('✅ Found image URL in merged output url property');
}
// Check if there's a response property
else if (imageOutput.response && imageOutput.response.data && Array.isArray(imageOutput.response.data) && imageOutput.response.data[0] && imageOutput.response.data[0].url) {
  imageUrl = imageOutput.response.data[0].url;
  console.log('✅ Found image URL in merged output response.data');
}
// If it's a file object (has mimeType, fileType, etc.), check binary data for URL
else if (imageOutput.mimeType || imageOutput.fileType) {
  console.error('❌ Image was downloaded as file object. Checking binary data for URL...');
  
  // Check if we can get the URL from the binary data metadata
  const imageItem = inputItems.find(item => item.json.mimeType || item.json.fileType || (!item.json.horoscope && !item.json.dos));
  if (imageItem && imageItem.binary) {
    const binaryKeys = Object.keys(imageItem.binary);
    if (binaryKeys.length > 0) {
      const binaryData = imageItem.binary[binaryKeys[0]];
      // Check various possible locations for URL in binary metadata
      if (binaryData && binaryData.meta && binaryData.meta.url) {
        imageUrl = binaryData.meta.url;
        console.log('✅ Found image URL in binary metadata');
      } else if (binaryData && binaryData.data && binaryData.data.url) {
        imageUrl = binaryData.data.url;
        console.log('✅ Found image URL in binary data');
      }
    }
  }
  
  if (!imageUrl) {
    console.error('File object structure:', JSON.stringify(imageOutput, null, 2));
    if (imageItem) {
      console.error('Full image item keys:', Object.keys(imageItem));
      if (imageItem.binary) {
        console.error('Binary keys:', Object.keys(imageItem.binary));
      }
    }
  }
}

if (!imageUrl) {
  // Log the actual structure for debugging
  console.error('❌ Failed to extract image URL');
  console.error('imageOutput structure:', Object.keys(imageOutput || {}));
  console.error('imageOutput full:', JSON.stringify(imageOutput, null, 2));
  
  throw new Error('Failed to extract image URL from OpenAI response. The image was downloaded as a file object without URL metadata. Please ensure "Return URL" is enabled in the OpenAI Image Generation node settings, or add a Code node after the OpenAI Image Generation node to extract the URL before it gets converted to a file.');
}

// Get original webhook data for slots and reasoning from the text result
// (The text result should have this data passed through from Parse Text Result node)
const webhookData = {
  imagePrompt: textResult.imagePrompt,
  slots: textResult.slots,
  reasoning: textResult.reasoning
};

// Combine all results
return {
  json: {
    horoscope: textResult.horoscope,
    dos: textResult.dos,
    donts: textResult.donts,
    imageUrl: imageUrl,
    prompt: webhookData.imagePrompt,
    slots: webhookData.slots,
    reasoning: webhookData.reasoning
  }
};

