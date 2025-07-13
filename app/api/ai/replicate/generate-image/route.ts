import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema
const generateImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  negative_prompt: z.string().optional(),
  width: z.number().min(256).max(2048).optional().default(1024)
    .describe('Width in pixels (will be rounded to nearest multiple of 8)'),
  height: z.number().min(256).max(2048).optional().default(1024)
    .describe('Height in pixels (will be rounded to nearest multiple of 8)'),
  steps: z.number().min(1).max(100).optional().default(50),
  seed: z.number().optional()
})

// Using Stability AI's SDXL model - stable and reliable
const SDXL_MODEL_ID = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'

export async function POST(req: NextRequest) {
  try {
    console.log('[Generate Image API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    const params = generateImageSchema.parse(body)
    
    console.log('[Generate Image API] Validated params:', params)
    
    // Ensure dimensions are divisible by 8 (required by SDXL)
    const width = Math.round(params.width / 8) * 8
    const height = Math.round(params.height / 8) * 8
    
    console.log('[Generate Image API] Adjusted dimensions:', { 
      original: { width: params.width, height: params.height },
      adjusted: { width, height }
    })
    
    // Prepare input for Replicate API
    const replicateInput = {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt || 'blurry, low quality, distorted, deformed',
      width,
      height,
      num_inference_steps: params.steps,
      guidance_scale: 7.5,
      scheduler: 'DPMSolverMultistep',
      ...(params.seed && { seed: params.seed })
    }
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(SDXL_MODEL_ID, {
      input: replicateInput
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Generate Image API] Generation completed in', processingTime, 'ms')
    
    // Handle different output formats from Replicate
    let imageUrl: string
    
    console.log('[Generate Image API] Raw output type:', typeof output)
    console.log('[Generate Image API] Raw output:', output)
    
    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0]
    } else if (typeof output === 'string') {
      imageUrl = output
    } else if (output instanceof Uint8Array) {
      // Handle binary image data - convert to base64 data URL
      console.log('[Generate Image API] Converting binary data to data URL, size:', output.length, 'bytes')
      
      // Convert Uint8Array to base64
      const base64String = Buffer.from(output).toString('base64')
      
      // Create data URL - assume PNG format (most common from image generation)
      imageUrl = `data:image/png;base64,${base64String}`
      
      console.log('[Generate Image API] Converted binary data to data URL, length:', imageUrl.length)
    } else {
      console.error('[Generate Image API] Unexpected output format:', typeof output, output)
      return NextResponse.json(
        { error: 'Unexpected output format from image generation' },
        { status: 500 }
      )
    }
    
    console.log('[Generate Image API] Final imageUrl:', imageUrl)
    
    // Validate that we have a valid URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('[Generate Image API] Invalid imageUrl:', imageUrl)
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
        width, // Use adjusted dimensions
        height, // Use adjusted dimensions
        model: SDXL_MODEL_ID,
        processingTime
      }
    })
    
  } catch (error) {
    console.error('[Generate Image API] Error:', error)
    
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
        error: 'Image generation failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate images.' },
    { status: 405 }
  )
} 