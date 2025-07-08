import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { grayscaleTool } from '@/lib/editor/tools/filters/grayscaleTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const grayscaleParameters = z.object({
  enable: z.boolean()
    .describe('Whether to enable grayscale (true) or disable it (false)')
})

// Define types
type GrayscaleInput = z.infer<typeof grayscaleParameters>

interface GrayscaleOutput {
  success: boolean
  enabled: boolean
  message: string
}

// Create adapter class
export class GrayscaleAdapter extends BaseToolAdapter<GrayscaleInput, GrayscaleOutput> {
  tool = grayscaleTool
  aiName = 'applyGrayscale'
  description = `Convert image to grayscale (black and white) or restore color. Common patterns:
- "convert to black and white" or "make grayscale" → enable: true
- "convert to grayscale" or "remove color" → enable: true
- "restore color" or "remove grayscale" → enable: false
- "black and white" → enable: true
NEVER ask whether to enable or disable.`
  inputSchema = grayscaleParameters
  
  async execute(params: GrayscaleInput, context: { canvas: Canvas }): Promise<GrayscaleOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Activate the grayscale tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Trigger the toggle action
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'action', 'toggle')
      
      return {
        success: true,
        enabled: params.enable,
        message: params.enable 
          ? 'Converted image to grayscale'
          : 'Restored color to image'
      }
    } catch (error) {
      return {
        success: false,
        enabled: false,
        message: error instanceof Error ? error.message : 'Failed to apply grayscale'
      }
    }
  }
}

// Export singleton instance
const grayscaleAdapter = new GrayscaleAdapter()
export default grayscaleAdapter 