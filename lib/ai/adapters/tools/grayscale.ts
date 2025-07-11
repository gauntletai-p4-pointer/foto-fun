import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const grayscaleInputSchema = z.object({
  enabled: z.boolean().describe('Whether to apply grayscale effect. true = convert to grayscale, false = remove grayscale')
})

// Define types
type GrayscaleInput = z.infer<typeof grayscaleInputSchema>

interface GrayscaleOutput {
  success: boolean
  enabled: boolean
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the grayscale filter tool
 * Provides AI-compatible interface for converting images to grayscale
 */
export class GrayscaleToolAdapter extends UnifiedToolAdapter<GrayscaleInput, GrayscaleOutput> {
  toolId = 'grayscale'
  aiName = 'apply_grayscale'
  description = `Convert images to grayscale (black and white) or remove grayscale effect.
  
  Common requests:
  - "make it black and white" → enabled: true
  - "convert to grayscale" → enabled: true
  - "remove color" → enabled: true
  - "restore color" → enabled: false
  - "remove grayscale" → enabled: false
  
  NEVER ask the user - determine from their intent.`
  
  inputSchema = grayscaleInputSchema
  
  async execute(params: GrayscaleInput, context: ObjectCanvasContext): Promise<GrayscaleOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        enabled: params.enabled,
        message: 'No image objects found to apply grayscale',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const filters = obj.filters || []
      
      // Remove existing grayscale filters
      const filteredFilters = filters.filter(f => f.type !== 'grayscale')
      
      // Add grayscale filter if enabled
      if (params.enabled) {
        filteredFilters.push({
          id: `grayscale-${Date.now()}`,
          type: 'grayscale',
          params: {}
        })
      }
      
      await context.canvas.updateObject(obj.id, {
        filters: filteredFilters
      })
      
      affectedObjects.push(obj.id)
    }
    
    const message = params.enabled 
      ? `Converted ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''} to grayscale`
      : `Removed grayscale effect from ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      enabled: params.enabled,
      message,
      affectedObjects
    }
  }
}

// Export singleton instance
const grayscaleAdapter = new GrayscaleToolAdapter()
export default grayscaleAdapter 