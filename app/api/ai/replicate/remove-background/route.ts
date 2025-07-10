import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema - Bria remove-background parameters
const removeBackgroundSchema = z.object({
  image: z.string().url('Valid image URL is required')
})

// Using Bria remove-background model
const REMOVE_BACKGROUND_MODEL_ID = 'bria/remove-background'

export async function POST(req: NextRequest) {
  try {
    console.log('[Remove Background API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    const params = removeBackgroundSchema.parse(body)
    
    console.log('[Remove Background API] Validated params:', {
      imageUrlType: typeof params.image,
      imageUrlLength: params.image?.length,
      imageUrlPrefix: params.image?.substring(0, 50) + '...'
    })
    
    // Additional validation for image format
    if (!params.image.startsWith('data:image/') && !params.image.startsWith('http')) {
      console.error('[Remove Background API] Invalid image format - not a data URL or HTTP URL')
      return NextResponse.json(
        { error: 'Invalid image format. Expected data URL or HTTP URL.' },
        { status: 400 }
      )
    }
    
    // Check if it's a data URL and validate format
    if (params.image.startsWith('data:image/')) {
      const supportedFormats = ['data:image/png', 'data:image/jpeg', 'data:image/jpg']
      const isSupported = supportedFormats.some(format => params.image.startsWith(format))
      
      if (!isSupported) {
        console.error('[Remove Background API] Unsupported image format:', params.image.substring(0, 30))
        return NextResponse.json(
          { error: 'Unsupported image format. Please use PNG or JPEG for best compatibility.' },
          { status: 400 }
        )
      }
      
      // Check if the data URL has valid base64 content
      const base64Index = params.image.indexOf(';base64,')
      if (base64Index === -1) {
        console.error('[Remove Background API] Invalid data URL - missing base64 header')
        return NextResponse.json(
          { error: 'Invalid data URL format.' },
          { status: 400 }
        )
      }
      
      const base64Data = params.image.substring(base64Index + 8)
      if (!base64Data || base64Data.length < 100) {
        console.error('[Remove Background API] Invalid data URL - insufficient data')
        return NextResponse.json(
          { error: 'Invalid or corrupted image data.' },
          { status: 400 }
        )
      }
      
      // Check if image is too large (> 8MB base64)
      if (base64Data.length > 8_000_000) {
        console.error('[Remove Background API] Image too large:', base64Data.length)
        return NextResponse.json(
          { error: 'Image is too large. Please use a smaller image (under 8MB).' },
          { status: 400 }
        )
      }
      
      // Additional validation - test base64 decoding
      try {
        atob(base64Data.substring(0, 100)) // Test first 100 chars
      } catch (base64Error) {
        console.error('[Remove Background API] Invalid base64 data:', base64Error)
        return NextResponse.json(
          { error: 'Invalid base64 image data.' },
          { status: 400 }
        )
      }
      
      console.log('[Remove Background API] Image format validation passed')
    }
    
    // Prepare input for Replicate API with Bria remove-background parameters
    const replicateInput = {
      image: params.image
    }
    
    console.log('[Remove Background API] Sending to Bria remove-background:', {
      model: REMOVE_BACKGROUND_MODEL_ID,
      imageType: params.image.startsWith('data:') ? 'data_url' : 'url',
      imageSize: params.image.length
    })
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(REMOVE_BACKGROUND_MODEL_ID, {
      input: replicateInput
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Remove Background API] Background removal completed in', processingTime, 'ms')
    console.log('[Remove Background API] Raw output type:', typeof output)
    console.log('[Remove Background API] Raw output constructor:', output?.constructor?.name)
    
    // Handle output from Bria remove-background model
    let imageUrl: string
    
    if (output instanceof ReadableStream) {
      console.log('[Remove Background API] Output is ReadableStream, converting to data URL...')
      
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
      
      console.log('[Remove Background API] Converted to data URL, length:', imageUrl.length)
      
    } else if (typeof output === 'string') {
      imageUrl = output
      console.log('[Remove Background API] Output is string:', imageUrl)
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0]
      console.log('[Remove Background API] Output is array, using first element:', imageUrl)
    } else {
      console.error('[Remove Background API] Unexpected output format:', typeof output, output)
      return NextResponse.json(
        { error: 'Unexpected output format from background removal', debug: { type: typeof output, constructor: output?.constructor?.name } },
        { status: 500 }
      )
    }
    
    console.log('[Remove Background API] Final imageUrl type:', typeof imageUrl)
    console.log('[Remove Background API] Final imageUrl length:', imageUrl?.length)
    
    // Validate that we have a valid URL or data URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('[Remove Background API] Invalid imageUrl:', typeof imageUrl)
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
        model: REMOVE_BACKGROUND_MODEL_ID,
        processingTime,
        parameters: {
          // No additional parameters for this model
        }
      }
    })
    
  } catch (error) {
    console.error('[Remove Background API] Error:', error)
    
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
    
    // Handle specific Replicate errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('cannot identify image file')) {
        return NextResponse.json(
          { 
            error: 'Invalid image format or corrupted image data. Please try with a different image or re-upload the image.',
            details: 'The AI model could not process the image format.'
          },
          { status: 400 }
        )
      }
      
      if (errorMessage.includes('image too large')) {
        return NextResponse.json(
          { 
            error: 'Image is too large. Please use a smaller image.',
            details: 'Maximum image size exceeded.'
          },
          { status: 400 }
        )
      }
      
      if (errorMessage.includes('replicate_api_key')) {
        return NextResponse.json(
          { error: 'Replicate API not configured on server' },
          { status: 503 }
        )
      }
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