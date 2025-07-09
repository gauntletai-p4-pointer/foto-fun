import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { rotateTool } from '@/lib/editor/tools/transform/rotateTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

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
  targetingMode: 'selection' | 'all-images'
}

// Create adapter class
export class RotateToolAdapter extends BaseToolAdapter<RotateInput, RotateOutput> {
  tool = rotateTool
  aiName = 'rotateImage'
  description = `Rotate existing images on the canvas. You MUST calculate the rotation angle based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be rotated
- If no images are selected, all images on the canvas will be rotated

Common rotation requests:
- "rotate 90 degrees" or "rotate right" → 90
- "rotate left" or "rotate counter-clockwise" → -90
- "rotate 180" or "flip upside down" → 180
- "rotate 45 degrees" → 45
- "slight rotation" → 15-30

NEVER ask for exact angles - interpret the user's intent and calculate appropriate rotation values.
Range: -360 to +360 degrees`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = rotateParameters
  
  async execute(params: RotateInput, context: CanvasContext): Promise<RotateOutput> {
    try {
      console.log('[RotateToolAdapter] Execute called with params:', params)
      console.log('[RotateToolAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[RotateToolAdapter] Target images:', images.length)
      console.log('[RotateToolAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to rotate. Please load an image or select images first.')
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
        message: `Rotated ${images.length} image(s) by ${params.angle}° ${params.angle > 0 ? 'clockwise' : 'counter-clockwise'}`,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        angle: 0,
        message: error instanceof Error ? error.message : 'Failed to rotate image',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const rotateAdapter = new RotateToolAdapter()
export default rotateAdapter 