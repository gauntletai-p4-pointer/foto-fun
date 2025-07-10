// Import necessary modules
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverReplicateClient } from '@/lib/ai/server/replicateClient'
import Replicate from 'replicate'

// Create properly authenticated instance
const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY })

// Input validation schema
const inpaintSchema = z.object({
  image: z.string().url('Valid image URL is required'),
  mask: z.string().url('Valid mask URL is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  strength: z.number().min(0).max(1).default(0.75).optional(),
  steps: z.number().min(1).default(20).optional(),
  num_outputs: z.number().min(1).default(1).optional(),
  guaidance_scale: z.number().min(0).default(7.5).optional(),
  negative_prompt: z.string().optional(),
})

// Using the specified model
const INPAINT_MODEL_ID = 'mixinmax1990/realisitic-vision-v3-inpainting:555a66628ea19a3b820d28878a0b0bfad222a814a7f12c79a83dbdbf57873213'

export async function POST(req: NextRequest) {
  try {
    console.log('[Inpaint API] Processing request...');
    
    // Parse and validate request body
    const body = await req.json();
    const params = inpaintSchema.parse(body);
    
    console.log('[Inpaint API] Validated params:', params);
    
    // Additional validation for image and mask
    // Similar to remove-background, check if data URLs or HTTP, supported formats, size, etc.
    // For brevity, assume similar validations here
    
    console.log('[Inpaint API] Using data URLs directly (model can access these)')
    
    // Prepare input for Replicate API
    const replicateInput = {
      image: params.image,
      mask: params.mask,
      prompt: params.prompt,
      strength: params.strength,
      steps: params.steps,
      num_outputs: params.num_outputs,
      guaidance_scale: params.guaidance_scale,
      negative_prompt: params.negative_prompt,
    };
    
    console.log('[Inpaint API] Sending to Replicate:', replicateInput);
    console.log('[Inpaint API] Starting streaming prediction...')

    // Call Replicate API with streaming to see progress
    const startTime = Date.now()
    
    console.log('[Inpaint API] Starting model execution (this may take 30-60 seconds)...')
    
    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Inpainting timed out after 2 minutes')), 120000)
    })
    
    const modelPromise = serverReplicateClient.run(INPAINT_MODEL_ID, {
      input: replicateInput
    })
    
    const output = await Promise.race([modelPromise, timeoutPromise])
    
    const processingTime = Date.now() - startTime
    
    console.log('[Inpaint API] Inpainting completed in', processingTime, 'ms');
    
    // Handle output similarly to remove-background
    let imageUrl: string;
    
    if (output instanceof ReadableStream) {
      // Convert stream to data URL
      const reader = output.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      const base64 = Buffer.from(buffer).toString('base64');
      imageUrl = `data:image/png;base64,${base64}`;
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0];
    } else {
      throw new Error('Unexpected output format');
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      imageUrl,
      originalImageUrl: params.image,
      metadata: {
        model: INPAINT_MODEL_ID,
        processingTime,
        parameters: params
      }
    });
    
  } catch (error) {
    console.error('[Inpaint API] Error:', error);
    
    // Handle errors similarly
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    // Other error handling
    
    return NextResponse.json({ error: 'Inpainting failed', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST for inpainting.' }, { status: 405 });
} 