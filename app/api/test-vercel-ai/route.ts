import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple test endpoint for Vercel AI SDK
 * Tests if the SDK can be imported and used to generate a simple text response
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Vercel AI SDK...')
    
    // Dynamically import Vercel AI SDK
    const { generateText } = await import('ai')
    const { openai } = await import('@ai-sdk/openai')
    
    console.log('✅ Vercel AI SDK modules imported successfully')
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          success: false,
          error: 'OPENAI_API_KEY is not set',
          details: 'Environment variable is missing'
        },
        { status: 500 }
      )
    }
    
    // Create OpenAI provider
    const openaiProvider = openai({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    console.log('✅ OpenAI provider created')
    
    // Test with a very simple prompt
    const testPrompt = 'Say "Hello, Vercel AI SDK is working!" in exactly those words.'
    
    console.log('🔄 Calling generateText...')
    const result = await generateText({
      model: openaiProvider('gpt-4o-mini'),
      prompt: testPrompt,
      maxTokens: 50,
      temperature: 0.7,
    })
    
    console.log('✅ generateText completed successfully')
    console.log('   Response:', result.text)
    
    return NextResponse.json({
      success: true,
      message: 'Vercel AI SDK is working!',
      response: result.text,
      details: {
        model: 'gpt-4o-mini',
        prompt: testPrompt,
        tokensUsed: result.usage?.totalTokens || 'unknown',
      }
    })
  } catch (error: any) {
    console.error('❌ Vercel AI SDK test failed:', error)
    console.error('   Error name:', error.name)
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack?.substring(0, 500))
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Unknown error',
        details: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack?.substring(0, 500),
        }
      },
      { status: 500 }
    )
  }
}




