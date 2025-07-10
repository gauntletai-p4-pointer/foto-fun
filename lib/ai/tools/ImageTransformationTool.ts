import { BaseAITool, GenerationInput, ImageOutput, AIServiceError } from './base'

/**
 * Image Transformation Tool - AI-Native Tool
 * Transforms existing images using text descriptions with Stable Diffusion XL
 * 
 * This tool works differently on server vs client:
 * - Server: Uses serverReplicateClient directly or calls internal API
 * - Client: Never instantiated (adapter handles API calls)
 */
export class ImageTransformationTool implements BaseAITool<GenerationInput, ImageOutput> {
  name = 'Image Transformation'
  description = 'Transform existing images using text descriptions with Stable Diffusion XL'
  
  // UI Support
  supportsUIActivation = true
  uiActivationType: 'dialog' | 'panel' | 'immediate' = 'dialog'
  
  // Using Stability AI's SDXL model - stable and reliable
  private readonly modelId = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
  
  // Server-side only: Get the server Replicate client
  private async getServerReplicateClient() {
    if (typeof window !== 'undefined') {
      throw new Error('Server Replicate client should not be used on client side')
    }
    const { serverReplicateClient } = await import('../server/replicateClient')
    return serverReplicateClient
  }
  
  async execute(params: GenerationInput): Promise<ImageOutput> {
    try {
      console.log('[ImageTransformationTool] Transforming image with params:', params)
      
      // Prepare input for Replicate API
      const input = {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || 'blurry, low quality, distorted, deformed',
        width: params.width || 1024,
        height: params.height || 1024,
        num_inference_steps: params.steps || 50,
        guidance_scale: 7.5,
        scheduler: 'DPMSolverMultistep',
        ...(params.seed && { seed: params.seed })
      }
      
      // Call Replicate API (server-side only)
      const startTime = Date.now()
      const client = await this.getServerReplicateClient()
      const output = await client.run(this.modelId, { input })
      const processingTime = Date.now() - startTime
      
      console.log('[ImageTransformationTool] Transformation completed in', processingTime, 'ms')
      
      // Handle different output formats from Replicate
      let imageUrl: string
      if (Array.isArray(output) && output.length > 0) {
        imageUrl = output[0]
      } else if (typeof output === 'string') {
        imageUrl = output
      } else {
        throw new AIServiceError(
          'Unexpected output format from image transformation',
          'replicate',
          'INVALID_OUTPUT'
        )
      }
      
      return {
        image: imageUrl,
        format: 'url',
        metadata: {
          width: input.width,
          height: input.height,
          model: this.modelId,
          processingTime
        }
      }
      
    } catch (error) {
      console.error('[ImageTransformationTool] Error:', error)
      
      if (error instanceof AIServiceError) {
        throw error
      }
      
      throw new AIServiceError(
        `Image transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'replicate',
        'TRANSFORMATION_FAILED',
        error
      )
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Only available on server-side
      if (typeof window !== 'undefined') {
        return false // Not available on client
      }
      const client = await this.getServerReplicateClient()
      return await client.isConfigured()
    } catch (error) {
      console.error('[ImageTransformationTool] Availability check failed:', error)
      return false
    }
  }
  
  async estimateCost(params: GenerationInput): Promise<{ dollars: number }> {
    // SDXL typically costs about $0.002 per image
    // This is a rough estimate - actual costs may vary
    const baseCost = 0.002
    const steps = params.steps || 50
    
    // More steps = slightly higher cost
    const stepMultiplier = Math.max(1, steps / 50)
    
    return {
      dollars: baseCost * stepMultiplier
    }
  }
} 