import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { invertTool } from '@/lib/editor/tools/filters/invertTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const invertParameters = z.object({
  enable: z.boolean()
    .describe('Whether to enable color inversion (true) or disable it (false)')
})

// Define types
type InvertInput = z.infer<typeof invertParameters>

interface InvertOutput {
  success: boolean
  enabled: boolean
  message: string
}

// Create adapter class
export class InvertAdapter extends BaseToolAdapter<InvertInput, InvertOutput> {
  tool = invertTool
  aiName = 'applyInvert'
  description = `Invert image colors (negative effect). Common patterns:
- "invert colors" or "negative" → enable: true
- "invert the image" → enable: true
- "create negative" → enable: true
- "remove invert" or "restore colors" → enable: false
- "normal colors" → enable: false
NEVER ask whether to enable or disable.`
  inputSchema = invertParameters
  
  async execute(params: InvertInput, context: { canvas: Canvas }): Promise<InvertOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Activate the invert tool first
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
          ? 'Inverted image colors'
          : 'Restored normal colors'
      }
    } catch (error) {
      return {
        success: false,
        enabled: false,
        message: error instanceof Error ? error.message : 'Failed to invert colors'
      }
    }
  }
}

// Export singleton instance
const invertAdapter = new InvertAdapter()
export default invertAdapter 