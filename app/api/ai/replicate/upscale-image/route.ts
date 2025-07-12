import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema - Real-ESRGAN parameters
const upscaleImageSchema = z.object({
  image: z.string().url('Valid image URL is required'),
  scale: z.number().min(1).max(4).optional().default(2),
  face_enhance: z.boolean().optional().default(false)
})

// Using Real-ESRGAN model
const UPSCALING_MODEL_ID = 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa'

export async function POST(req: NextRequest) {
  try {
    console.log('[Upscale Image API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    
    // Convert old parameters to new format for backward compatibility
    let params = { ...body }
    
    // Map old upscale_factor to new scale parameter
    if (params.upscale_factor) {
      if (params.upscale_factor === 'x2') {
        params.scale = 2
      } else if (params.upscale_factor === 'x4') {
        params.scale = 4
      }
      delete params.upscale_factor
    }
    
    // Remove compression_quality as it's not used by Real-ESRGAN
    delete params.compression_quality
    
    const validatedParams = upscaleImageSchema.parse(params)
    
    console.log('[Upscale Image API] Validated params:', validatedParams)
    
    // Prepare input for Replicate API with Real-ESRGAN parameters
    const replicateInput = {
      image: validatedParams.image,
      scale: validatedParams.scale,
      face_enhance: validatedParams.face_enhance
    }
    
    console.log('[Upscale Image API] Sending to Real-ESRGAN:', replicateInput)
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(UPSCALING_MODEL_ID, {
      input: replicateInput
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Upscale Image API] Upscaling completed in', processingTime, 'ms')
    console.log('[Upscale Image API] Raw output type:', typeof output)
    console.log('[Upscale Image API] Raw output constructor:', output?.constructor?.name)
    
    // Handle output from Real-ESRGAN (usually returns a URL)
    let imageUrl: string
    
    if (typeof output === 'string') {
      imageUrl = output
      console.log('[Upscale Image API] Output is string:', imageUrl)
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0]
      console.log('[Upscale Image API] Output is array, using first element:', imageUrl)
    } else if (output instanceof ReadableStream) {
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
      originalImageUrl: validatedParams.image,
      metadata: {
        model: UPSCALING_MODEL_ID,
        processingTime,
        parameters: {
          scale: validatedParams.scale,
          face_enhance: validatedParams.face_enhance
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