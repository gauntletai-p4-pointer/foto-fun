import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema
const backgroundRemovalSchema = z.object({
  imageUrl: z.string().url('Must be a valid image URL'),
  modelTier: z.enum(['fast', 'best']).optional().default('best')
})

// Model configurations
const MODELS = {
  fast: 'danielgatis/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
  best: 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Background Removal API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    const params = backgroundRemovalSchema.parse(body)
    
    console.log('[Background Removal API] Validated params:', params)
    
    // Get model based on tier
    const modelId = MODELS[params.modelTier]
    
    // Prepare input for Replicate API
    const replicateInput = {
      image: params.imageUrl
    }
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(modelId, {
      input: replicateInput
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Background Removal API] Processing completed in', processingTime, 'ms')
    
    // Handle different output formats from Replicate
    let imageUrl: string
    
    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0] as string
    } else if (typeof output === 'string') {
      imageUrl = output
    } else {
      console.error('[Background Removal API] Unexpected output format:', typeof output, output)
      return NextResponse.json(
        { error: 'Unexpected output format from background removal' },
        { status: 500 }
      )
    }
    
    // Validate that we have a valid URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('[Background Removal API] Invalid imageUrl:', imageUrl)
      return NextResponse.json(
        { error: 'Failed to extract image URL from response' },
        { status: 500 }
      )
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      imageUrl,
      metadata: {
        model: modelId,
        processingTime
      }
    })
    
  } catch (error) {
    console.error('[Background Removal API] Error:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    // Handle API key errors
    if (error instanceof Error && error.message.includes('REPLICATE_API_KEY')) {
      return NextResponse.json(
        { error: 'Replicate API not configured on server' },
        { status: 503 }
      )
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Background removal failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to remove backgrounds.' },
    { status: 405 }
  )
} 