import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const blurInputSchema = z.object({
  radius: z.number().min(0).max(50)
    .describe('Blur radius in pixels. 0 = no blur, higher values = more blur. Range: 0 to 50')
})

// Define types
type BlurInput = z.infer<typeof blurInputSchema>

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
  
  inputSchema = blurInputSchema
  
  async execute(params: BlurInput, context: ObjectCanvasContext): Promise<BlurOutput> {
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
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const filters = obj.filters || []
      
      // Remove existing blur filters
      const filteredFilters = filters.filter(f => f.type !== 'blur')
      
      // Add new blur filter if radius > 0
      if (params.radius > 0) {
        filteredFilters.push({
          id: `blur-${Date.now()}`,
          type: 'blur',
          params: { radius: params.radius }
        })
      }
      
      await context.canvas.updateObject(obj.id, {
        filters: filteredFilters
      })
      
      affectedObjects.push(obj.id)
    }
    
    const message = params.radius === 0 
      ? `Removed blur effect from ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
      : `Applied blur (radius: ${params.radius}px) to ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      radius: params.radius,
      message,
      affectedObjects
    }
  }
}

// Export singleton instance
const blurAdapter = new BlurToolAdapter()
export default blurAdapter 