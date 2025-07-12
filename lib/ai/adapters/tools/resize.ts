import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { resizeTool } from '@/lib/editor/tools/transform/resizeTool'

// Define parameter schema
const resizeParameters = z.object({
  percentage: z.number().positive().min(10).max(500)
    .describe('Resize percentage (10-500). 100 = no change, 50 = half size, 200 = double size'),
  maintainAspectRatio: z.boolean().default(true)
    .describe('Whether to maintain the original aspect ratio')
})

type ResizeInput = z.infer<typeof resizeParameters>

// Define output type
interface ResizeOutput {
  success: boolean
  percentage: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the resize tool
 * Provides AI-compatible interface for resizing objects
 */
export class ResizeToolAdapter extends UnifiedToolAdapter<ResizeInput, ResizeOutput> {
  toolId = 'resize'
  aiName = 'resize_objects'
  description = `Resize objects by percentage. You MUST calculate percentage based on user intent.

Common resize requests:
- "resize to 50%" or "make it half size" → percentage: 50
- "make it smaller" → percentage: 75
- "make it larger" or "make it bigger" → percentage: 150
- "double the size" → percentage: 200
- "triple the size" → percentage: 300
- "shrink it" → percentage: 80
- "tiny" → percentage: 25
- "huge" → percentage: 250

NEVER ask for exact percentages - interpret the user's intent.`

  inputSchema = resizeParameters
  
  async execute(
    params: ResizeInput, 
    context: ObjectCanvasContext
  ): Promise<ResizeOutput> {
    const targets = this.getTargets(context)
    
    if (targets.length === 0) {
      return {
        success: false,
        percentage: params.percentage,
        message: 'No objects found to resize',
        affectedObjects: []
      }
    }
    
    console.log(`[ResizeAdapter] Resizing ${targets.length} objects to ${params.percentage}%`)
    
    try {
      // Use the underlying resize tool to apply the resize
      await resizeTool.applyWithContext(params.percentage, params.maintainAspectRatio)
      
      // Get affected object IDs
      const affectedObjects = targets.map(obj => obj.id)
      
      // Generate descriptive message
      let description = ''
      const scale = params.percentage
      if (scale === 100) {
        description = 'No size change'
      } else if (scale > 100) {
        description = `Enlarged to ${scale}% of original size`
      } else {
        description = `Reduced to ${scale}% of original size`
      }
      
      const message = `${description} for ${affectedObjects.length} object(s)`
      
      return {
        success: true,
        percentage: params.percentage,
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Resize operation failed: ${this.formatError(error)}`)
    }
  }
} 