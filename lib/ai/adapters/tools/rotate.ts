import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const rotateInputSchema = z.object({
  angle: z.number().min(-360).max(360)
    .describe('Rotation angle in degrees. Positive values rotate clockwise, negative values rotate counter-clockwise')
})

// Define types
type RotateInput = z.infer<typeof rotateInputSchema>

interface RotateOutput {
  success: boolean
  angle: number
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the rotate tool
 * Provides AI-compatible interface for rotating objects
 */
export class RotateToolAdapter extends UnifiedToolAdapter<RotateInput, RotateOutput> {
  toolId = 'rotate'
  aiName = 'rotate_objects'
  description = `Rotate objects by a specific angle.

  You MUST calculate the rotation angle based on user intent:
  - "rotate 90 degrees" → 90
  - "rotate clockwise" → 90
  - "rotate counter-clockwise" → -90
  - "rotate 180 degrees" or "turn upside down" → 180
  - "rotate 45 degrees" → 45
  - "slight rotation" → 15 to 30
  - "quarter turn" → 90
  - "half turn" → 180
  
  NEVER ask for exact angles - interpret the user's intent.`
  
  inputSchema = rotateInputSchema
  
  async execute(
    params: RotateInput, 
    context: ObjectCanvasContext
  ): Promise<RotateOutput> {
    const targets = this.getTargets(context)
    
    if (targets.length === 0) {
      return {
        success: false,
        angle: params.angle,
        message: 'No objects selected to rotate',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    // Apply rotation to all target objects
    for (const obj of targets) {
      const currentRotation = obj.rotation || 0
      const newRotation = currentRotation + params.angle
      
      await context.canvas.updateObject(obj.id, {
        rotation: newRotation
      })
      
      affectedObjects.push(obj.id)
    }
    
    const directionText = params.angle > 0 ? 'clockwise' : 'counter-clockwise'
    const message = `Rotated ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''} by ${Math.abs(params.angle)}° ${directionText}`
    
    return {
      success: true,
      angle: params.angle,
      message,
      affectedObjects
    }
  }
} 