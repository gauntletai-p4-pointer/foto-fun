import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema - Google upscaler parameters
const upscaleImageSchema = z.object({
  image: z.string().url('Valid image URL is required'),
  upscale_factor: z.enum(['x2', 'x4']).optional().default('x4'),
  compression_quality: z.number().min(1).max(100).optional().default(80)
})

// Using Google upscaler model
const UPSCALING_MODEL_ID = 'google/upscaler'

export async function POST(req: NextRequest) {
  try {
    console.log('[Upscale Image API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    const params = upscaleImageSchema.parse(body)
    
    console.log('[Upscale Image API] Validated params:', params)
    
    // Prepare input for Replicate API with Google upscaler parameters
    const replicateInput = {
      image: params.image,
      upscale_factor: params.upscale_factor,
      compression_quality: params.compression_quality
    }
    
    console.log('[Upscale Image API] Sending to Google upscaler:', replicateInput)
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(UPSCALING_MODEL_ID, {
      input: replicateInput
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Upscale Image API] Upscaling completed in', processingTime, 'ms')
    console.log('[Upscale Image API] Raw output type:', typeof output)
    console.log('[Upscale Image API] Raw output constructor:', output?.constructor?.name)
    
    // Handle ReadableStream output from Google upscaler
    let imageUrl: string
    
    if (output instanceof ReadableStream) {
      console.log('[Upscale Image API] Output is ReadableStream, converting to data URL...')
      
      // Convert ReadableStream to Buffer
      const reader = output.getReader()
      const chunks: Uint8Array[] = []
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      // Combine chunks into single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const buffer = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        buffer.set(chunk, offset)
        offset += chunk.length
      }
      
      // Convert to base64 data URL
      const base64 = Buffer.from(buffer).toString('base64')
      imageUrl = `data:image/png;base64,${base64}`
      
      console.log('[Upscale Image API] Converted to data URL, length:', imageUrl.length)
      
    } else if (typeof output === 'string') {
      imageUrl = output
      console.log('[Upscale Image API] Output is string:', imageUrl)
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0]
      console.log('[Upscale Image API] Output is array, using first element:', imageUrl)
    } else {
      console.error('[Upscale Image API] Unexpected output format:', typeof output, output)
      return NextResponse.json(
        { error: 'Unexpected output format from image upscaling', debug: { type: typeof output, constructor: output?.constructor?.name } },
        { status: 500 }
      )
    }
    
    console.log('[Upscale Image API] Final imageUrl type:', typeof imageUrl)
    console.log('[Upscale Image API] Final imageUrl length:', imageUrl?.length)
    
    // Validate that we have a valid URL or data URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('[Upscale Image API] Invalid imageUrl:', typeof imageUrl)
      return NextResponse.json(
        { error: 'Failed to extract image URL from response' },
        { status: 500 }
      )
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      imageUrl,
      originalImageUrl: params.image,
      metadata: {
        model: UPSCALING_MODEL_ID,
        processingTime,
        parameters: {
          upscale_factor: params.upscale_factor,
          compression_quality: params.compression_quality
        }
      }
    })
    
  } catch (error) {
    console.error('[Upscale Image API] Error:', error)
    
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