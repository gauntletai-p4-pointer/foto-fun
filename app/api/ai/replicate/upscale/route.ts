import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema
const upscaleSchema = z.object({
  imageUrl: z.string().url('Must be a valid image URL'),
  scale: z.number().int().min(2).max(4).optional().default(2),
  faceEnhance: z.boolean().optional().default(false),
  modelTier: z.enum(['fast', 'best']).optional().default('best')
})

// Model configurations
const MODELS = {
  fast: 'tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c',
  best: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b'
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Upscale API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    const params = upscaleSchema.parse(body)
    
    console.log('[Upscale API] Validated params:', params)
    
    // Get model based on tier
    const modelId = MODELS[params.modelTier]
    
    // Prepare input for Replicate API
    const replicateInput = {
      image: params.imageUrl,
      scale: params.scale,
      face_enhance: params.faceEnhance
    }
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(modelId, {
      input: replicateInput
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Upscale API] Processing completed in', processingTime, 'ms')
    
    // Handle different output formats from Replicate
    let imageUrl: string
    
    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0] as string
    } else if (typeof output === 'string') {
      imageUrl = output
    } else {
      console.error('[Upscale API] Unexpected output format:', typeof output, output)
      return NextResponse.json(
        { error: 'Unexpected output format from upscaling' },
        { status: 500 }
      )
    }
    
    // Validate that we have a valid URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('[Upscale API] Invalid imageUrl:', imageUrl)
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
        scale: params.scale,
        faceEnhance: params.faceEnhance,
        processingTime
      }
    })
    
  } catch (error) {
    console.error('[Upscale API] Error:', error)
    
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
        error: 'Image upscaling failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upscale images.' },
    { status: 405 }
  )
} 