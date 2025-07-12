import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { blurTool } from '@/lib/editor/tools/filters/blurTool'

// Define parameter schema
const blurParameters = z.object({
  radius: z.number().min(0).max(50)
    .describe('Blur radius in pixels. 0 = no blur, higher values = more blur. Range: 0 to 50')
})

// Define types
type BlurInput = z.infer<typeof blurParameters>

interface BlurOutput {
  success: boolean
  radius: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the blur filter tool
 * Provides AI-compatible interface for applying blur effects
 */
export class BlurToolAdapter extends UnifiedToolAdapter<BlurInput, BlurOutput> {
  toolId = 'blur'
  aiName = 'apply_blur'
  description = `Apply blur effect to images. 
  
  You MUST calculate the blur radius based on user intent:
  - "slight blur" or "soft blur" → 2 to 5 pixels
  - "blur" or "medium blur" → 8 to 15 pixels
  - "heavy blur" or "strong blur" → 20 to 35 pixels
  - "extreme blur" → 40 to 50 pixels
  - "remove blur" or "no blur" → 0 pixels
  
  NEVER ask for exact values - interpret the user's intent.`
  
  inputSchema = blurParameters
  
  async execute(
    params: BlurInput, 
    context: ObjectCanvasContext
  ): Promise<BlurOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        radius: params.radius,
        message: 'No image objects found to blur',
        affectedObjects: []
      }
    }
    
    console.log(`[BlurAdapter] Applying blur: ${params.radius}px to ${imageObjects.length} objects`)
    
    try {
      // Use the underlying blur tool to apply the effect
      await blurTool.applyBlur(params.radius)
      
      // Get affected object IDs
      const affectedObjects = imageObjects.map(obj => obj.id)
      
      const message = params.radius === 0 
        ? `Removed blur effect from ${affectedObjects.length} object(s)`
        : `Applied blur (radius: ${params.radius}px) to ${affectedObjects.length} object(s)`
      
      return {
        success: true,
        radius: params.radius,
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Blur application failed: ${this.formatError(error)}`)
    }
  }
}

// Export singleton instance
const blurAdapter = new BlurToolAdapter()
export default blurAdapter 