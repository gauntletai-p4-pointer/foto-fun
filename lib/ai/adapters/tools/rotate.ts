import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { rotateTool } from '@/lib/editor/tools/transform/rotateTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const rotateParameters = z.object({
  angle: z.number()
    .min(-180)
    .max(180)
    .describe('Rotation angle in degrees from -180 to 180 (positive = clockwise, negative = counter-clockwise)')
})

type RotateInput = z.infer<typeof rotateParameters>

// Define output type
interface RotateOutput {
  success: boolean
  angle: number
  message: string
}

// Create adapter class
export class RotateToolAdapter extends BaseToolAdapter<RotateInput, RotateOutput> {
  tool = rotateTool
  aiName = 'rotateImage'
  description = `Rotate the image by a specified angle. You MUST calculate the angle based on user intent.
Common patterns you should use:
- "rotate right" or "rotate clockwise" → +90
- "rotate left" or "rotate counter-clockwise" → -90
- "flip upside down" or "rotate 180" → 180 or -180
- "slight rotation" or "tilt a bit" → +5 to +15
- "straighten" (if image appears tilted) → small adjustment -5 to +5
- "rotate by X degrees" → use X directly
- "quarter turn right" → +90
- "quarter turn left" → -90
- "half turn" → 180
NEVER ask for exact values - always interpret the user's intent and choose an appropriate angle.`
  
  inputSchema = rotateParameters
  
  async execute(params: RotateInput, context: { canvas: Canvas }): Promise<RotateOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Activate the rotate tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // For AI calls, we want each rotation to be additive, not absolute
      // Reset the tool's lastAngle to 0 so the new angle is applied as a relative rotation
      if ('resetForAICall' in this.tool && typeof this.tool.resetForAICall === 'function') {
        this.tool.resetForAICall()
      }
      
      // Get the rotate tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'angle', params.angle)
      
      return {
        success: true,
        angle: params.angle,
        message: `Rotated image by ${params.angle}° ${params.angle > 0 ? 'clockwise' : 'counter-clockwise'}`
      }
    } catch (error) {
      return {
        success: false,
        angle: 0,
        message: error instanceof Error ? error.message : 'Failed to rotate image'
      }
    }
  }
}

// Export singleton instance
const rotateAdapter = new RotateToolAdapter()
export default rotateAdapter 