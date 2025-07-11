import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const invertInputSchema = z.object({
  enabled: z.boolean().describe('Whether to apply invert effect. true = invert colors, false = restore original colors')
})

// Define types
type InvertInput = z.infer<typeof invertInputSchema>

interface InvertOutput {
  success: boolean
  enabled: boolean
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the invert filter tool
 * Provides AI-compatible interface for inverting image colors
 */
export class InvertToolAdapter extends UnifiedToolAdapter<InvertInput, InvertOutput> {
  toolId = 'invert'
  aiName = 'invert_colors'
  description = `Invert the colors of images (create negative effect) or restore original colors.
  
  Common requests:
  - "invert colors" → enabled: true
  - "make negative" → enabled: true
  - "create negative effect" → enabled: true
  - "restore colors" → enabled: false
  - "remove invert" → enabled: false
  
  NEVER ask the user - determine from their intent.`
  
  inputSchema = invertInputSchema
  
  async execute(params: InvertInput, context: ObjectCanvasContext): Promise<InvertOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        enabled: params.enabled,
        message: 'No image objects found to invert',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const filters = obj.filters || []
      
      // Remove existing invert filters
      const filteredFilters = filters.filter(f => f.type !== 'invert')
      
      // Add invert filter if enabled
      if (params.enabled) {
        filteredFilters.push({
          id: `invert-${Date.now()}`,
          type: 'invert',
          params: {}
        })
      }
      
      await context.canvas.updateObject(obj.id, {
        filters: filteredFilters
      })
      
      affectedObjects.push(obj.id)
    }
    
    const message = params.enabled 
      ? `Inverted colors on ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''} (negative effect applied)`
      : `Removed color inversion from ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      enabled: params.enabled,
      message,
      affectedObjects
    }
  }
}

// Export singleton instance
const invertAdapter = new InvertToolAdapter()
export default invertAdapter 