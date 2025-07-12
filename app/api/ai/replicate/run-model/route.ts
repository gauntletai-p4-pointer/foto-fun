import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'

// Input validation schema
const runModelSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required'),
  input: z.record(z.unknown()).optional().default({})
})

export async function POST(req: NextRequest) {
  try {
    console.log('[Run Model API] Processing request...')
    
    // Parse and validate request body
    const body = await req.json()
    const params = runModelSchema.parse(body)
    
    console.log('[Run Model API] Validated params:', {
      modelId: params.modelId,
      inputKeys: Object.keys(params.input)
    })
    
    // Call Replicate API through server client
    const startTime = Date.now()
    const output = await serverReplicateClient.run(params.modelId, {
      input: params.input
    })
    const processingTime = Date.now() - startTime
    
    console.log('[Run Model API] Processing completed in', processingTime, 'ms')
    console.log('[Run Model API] Output type:', typeof output)
    
    // Return the raw output - let the client handle the format
    return NextResponse.json({
      success: true,
      output,
      metadata: {
        model: params.modelId,
        processingTime
      }
    })
    
  } catch (error) {
    console.error('[Run Model API] Error:', error)
    
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
        error: 'Model execution failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to run models.' },
    { status: 405 }
  )
} 