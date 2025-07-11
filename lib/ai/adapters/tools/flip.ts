import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const flipInputSchema = z.object({
  direction: z.enum(['horizontal', 'vertical'])
    .describe('Direction to flip: horizontal (left-right) or vertical (up-down)')
})

// Define types
type FlipInput = z.infer<typeof flipInputSchema>

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
  
  inputSchema = flipInputSchema
  
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
    
    const affectedObjects: string[] = []
    
    // Apply flip to all target objects
    for (const obj of targets) {
      const currentScaleX = obj.scaleX || 1
      const currentScaleY = obj.scaleY || 1
      
      if (params.direction === 'horizontal') {
        await context.canvas.updateObject(obj.id, {
          scaleX: -currentScaleX
        })
      } else {
        await context.canvas.updateObject(obj.id, {
          scaleY: -currentScaleY
        })
      }
      
      affectedObjects.push(obj.id)
    }
    
    const directionText = params.direction === 'horizontal' ? 'horizontally' : 'vertically'
    const message = `Flipped ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''} ${directionText}`
    
    return {
      success: true,
      direction: params.direction,
      message,
      affectedObjects
    }
  }
} 