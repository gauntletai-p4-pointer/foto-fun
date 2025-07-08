import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { flipTool } from '@/lib/editor/tools/transform/flipTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const flipParameters = z.object({
  horizontal: z.boolean().optional(),
  vertical: z.boolean().optional()
})

type FlipInput = z.infer<typeof flipParameters>

// Define output type
interface FlipOutput {
  success: boolean
  horizontal: boolean
  vertical: boolean
  message: string
}

// Create adapter class
export class FlipAdapter extends BaseToolAdapter<FlipInput, FlipOutput> {
  tool = flipTool
  aiName = 'flipImage'
  description = `Flip an image horizontally (mirror) or vertically (upside down). Common patterns:
- "flip horizontally" or "mirror" → horizontal: true
- "flip vertically" or "upside down" → vertical: true  
- "flip both ways" → horizontal: true, vertical: true
NEVER ask which direction to flip.`
  inputSchema = flipParameters
  
  async execute(params: FlipInput, context: { canvas: Canvas }): Promise<FlipOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Activate the flip tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get the flip tool options and trigger the flip action
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      
      if (params.horizontal) {
        useToolOptionsStore.getState().updateOption(this.tool.id, 'flipAction', 'horizontal')
      }
      
      if (params.vertical) {
        // Small delay between flips if both are requested
        if (params.horizontal) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        useToolOptionsStore.getState().updateOption(this.tool.id, 'flipAction', 'vertical')
      }
      
      const flips = []
      if (params.horizontal) flips.push('horizontally')
      if (params.vertical) flips.push('vertically')
      
      return {
        success: true,
        horizontal: params.horizontal || false,
        vertical: params.vertical || false,
        message: flips.length > 0 
          ? `Flipped image ${flips.join(' and ')}`
          : 'No flip applied'
      }
    } catch (error) {
      return {
        success: false,
        horizontal: false,
        vertical: false,
        message: error instanceof Error ? error.message : 'Failed to flip image'
      }
    }
  }
}

// Export singleton instance
const flipAdapter = new FlipAdapter()
export default flipAdapter 