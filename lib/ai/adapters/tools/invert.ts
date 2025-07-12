import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { invertTool } from '@/lib/editor/tools/filters/invertTool'

// Define parameter schema
const invertParameters = z.object({
  enabled: z.boolean().describe('Whether to apply invert effect. true = invert colors, false = restore original colors')
})

// Define types
type InvertInput = z.infer<typeof invertParameters>

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
  
  inputSchema = invertParameters
  
  async execute(
    params: InvertInput, 
    context: ObjectCanvasContext
  ): Promise<InvertOutput> {
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
    
    console.log(`[InvertAdapter] ${params.enabled ? 'Applying' : 'Removing'} color inversion to ${imageObjects.length} objects`)
    
    try {
      // Use the underlying invert tool to apply the effect
      if (params.enabled) {
        await invertTool.applyInvert(100)
      } else {
        await invertTool.applyInvert(0)
      }
      
      // Get affected object IDs
      const affectedObjects = imageObjects.map(obj => obj.id)
      
      const message = params.enabled 
        ? `Inverted colors on ${affectedObjects.length} object(s) (negative effect applied)`
        : `Removed color inversion from ${affectedObjects.length} object(s)`
      
      return {
        success: true,
        enabled: params.enabled,
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Color inversion failed: ${this.formatError(error)}`)
    }
  }
}

// Export singleton instance
const invertAdapter = new InvertToolAdapter()
export default invertAdapter 