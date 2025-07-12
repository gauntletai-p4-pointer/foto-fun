import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema
const faceEnhancementSchema = z.object({
  imageUrl: z.string().url('Must be a valid image URL'),
  scale: z.number().int().min(1).max(4).optional().default(2),
  version: z.enum(['v1.4', 'v1.3']).optional().default('v1.4')
})

// Face enhancement model
const MODEL_ID = 'tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c'

export async function POST(req: NextRequest) {
  try {
    console.log('[Face Enhancement API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    const params = faceEnhancementSchema.parse(body)
    
    console.log('[Face Enhancement API] Validated params:', params)
    
    // Prepare input for Replicate API
    const replicateInput = {
      img: params.imageUrl,
      scale: params.scale,
      version: params.version
    }
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(MODEL_ID, {
      input: replicateInput
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Face Enhancement API] Processing completed in', processingTime, 'ms')
    
    // Handle different output formats from Replicate
    let imageUrl: string
    
    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0] as string
    } else if (typeof output === 'string') {
      imageUrl = output
    } else {
      console.error('[Face Enhancement API] Unexpected output format:', typeof output, output)
      return NextResponse.json(
        { error: 'Unexpected output format from face enhancement' },
        { status: 500 }
      )
    }
    
    // Validate that we have a valid URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('[Face Enhancement API] Invalid imageUrl:', imageUrl)
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
        model: MODEL_ID,
        scale: params.scale,
        version: params.version,
        processingTime
      }
    })
    
  } catch (error) {
    console.error('[Face Enhancement API] Error:', error)
    
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
        error: 'Face enhancement failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to enhance faces.' },
    { status: 405 }
  )
} 