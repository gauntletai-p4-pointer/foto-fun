import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { flipTool } from '@/lib/editor/tools/transform/flipTool'

// Define parameter schema
const flipParameters = z.object({
  direction: z.enum(['horizontal', 'vertical'])
    .describe('Direction to flip: horizontal (left-right) or vertical (up-down)')
})

// Define types
type FlipInput = z.infer<typeof flipParameters>

interface FlipOutput {
  success: boolean
  direction: 'horizontal' | 'vertical'
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the flip tool
 * Provides AI-compatible interface for flipping objects
 */
export class FlipToolAdapter extends UnifiedToolAdapter<FlipInput, FlipOutput> {
  toolId = 'flip'
  aiName = 'flip_objects'
  description = `Flip objects horizontally or vertically.

  You MUST determine the flip direction based on user intent:
  - "flip horizontally" or "mirror" → horizontal
  - "flip vertically" or "upside down" → vertical
  - "flip left to right" → horizontal
  - "flip top to bottom" → vertical
  
  NEVER ask for the direction - interpret the user's intent.`
  
  inputSchema = flipParameters
  
  async execute(
    params: FlipInput, 
    context: ObjectCanvasContext
  ): Promise<FlipOutput> {
    const targets = this.getTargets(context)
    
    if (targets.length === 0) {
      return {
        success: false,
        direction: params.direction,
        message: 'No objects selected to flip',
        affectedObjects: []
      }
    }
    
    console.log(`[FlipAdapter] Flipping ${targets.length} objects ${params.direction}`)
    
    try {
      // Use the underlying flip tool to apply the flip
      await flipTool.applyFlip(params.direction)
      
      // Get affected object IDs
      const affectedObjects = targets.map(obj => obj.id)
      
      const directionText = params.direction === 'horizontal' ? 'horizontally' : 'vertically'
      const message = `Flipped ${affectedObjects.length} object(s) ${directionText}`
      
      return {
        success: true,
        direction: params.direction,
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Flip operation failed: ${this.formatError(error)}`)
    }
  }
} 