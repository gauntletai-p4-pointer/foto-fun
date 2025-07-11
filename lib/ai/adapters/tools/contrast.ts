import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
// import { contrastTool } from '@/lib/editor/tools/adjustments/contrastTool'

// Define parameter schema
const contrastParameters = z.object({
  adjustment: z.number().min(-100).max(100)
    .describe('Contrast adjustment percentage. Negative values reduce contrast, positive values increase contrast. Range: -100 to +100')
})

// Define types
type ContrastInput = z.infer<typeof contrastParameters>

interface ContrastOutput {
  success: boolean
  adjustment: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the contrast adjustment tool
 * Provides AI-compatible interface for adjusting image contrast
 */
export class ContrastToolAdapter extends UnifiedToolAdapter<ContrastInput, ContrastOutput> {
  toolId = 'contrast'
  aiName = 'adjust_contrast'
  description = `Adjust the contrast of images. 
  
  You MUST calculate the adjustment value based on user intent:
  - "more contrast" or "higher contrast" → +20 to +30
  - "much more contrast" → +40 to +60
  - "slightly more contrast" → +10 to +15
  - "less contrast" or "lower contrast" → -20 to -30
  - "much less contrast" → -40 to -60
  - "slightly less contrast" → -10 to -15
  
  NEVER ask for exact values - interpret the user's intent.`
  
  inputSchema = contrastParameters
  
  async execute(
    params: ContrastInput, 
    context: ObjectCanvasContext
  ): Promise<ContrastOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        adjustment: params.adjustment,
        message: 'No image objects found to adjust',
        affectedObjects: []
      }
    }
    
    console.log(`[ContrastAdapter] Applying contrast adjustment: ${params.adjustment}% to ${imageObjects.length} objects`)
    
    // Apply contrast adjustment to each image object
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      // Add contrast to the object's adjustments array
      const adjustments = obj.adjustments || []
      
      // Remove any existing contrast adjustments
      const filteredAdjustments = adjustments.filter(adj => adj.type !== 'contrast')
      
      // Add new contrast adjustment if not zero
      if (params.adjustment !== 0) {
        filteredAdjustments.push({
          id: `contrast-${Date.now()}`,
          type: 'contrast',
          params: { value: params.adjustment },
          enabled: true
        })
      }
      
      // Update the object
      await context.canvas.updateObject(obj.id, {
        adjustments: filteredAdjustments
      })
      
      affectedObjects.push(obj.id)
    }
    
    return {
      success: true,
      adjustment: params.adjustment,
      message: `Contrast adjusted by ${params.adjustment > 0 ? '+' : ''}${params.adjustment}% on ${affectedObjects.length} object(s)`,
      affectedObjects
    }
  }
} 