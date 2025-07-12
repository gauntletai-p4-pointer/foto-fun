import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { rotateTool } from '@/lib/editor/tools/transform/rotateTool'

// Define parameter schema
const rotateParameters = z.object({
  angle: z.number().min(-360).max(360)
    .describe('Rotation angle in degrees. Positive values rotate clockwise, negative values rotate counter-clockwise')
})

// Define types
type RotateInput = z.infer<typeof rotateParameters>

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
  
  inputSchema = rotateParameters
  
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
    
    console.log(`[RotateAdapter] Rotating ${targets.length} objects by ${params.angle}°`)
    
    try {
      // Use the underlying rotate tool to apply the rotation
      await rotateTool.applyRotation(params.angle, true)
      
      // Get affected object IDs
      const affectedObjects = targets.map(obj => obj.id)
      
      const directionText = params.angle > 0 ? 'clockwise' : 'counter-clockwise'
      const message = `Rotated ${affectedObjects.length} object(s) by ${Math.abs(params.angle)}° ${directionText}`
      
      return {
        success: true,
        angle: params.angle,
        message,
        affectedObjects
      }
    } catch (error) {
      throw new Error(`Rotation failed: ${this.formatError(error)}`)
    }
  }
} 