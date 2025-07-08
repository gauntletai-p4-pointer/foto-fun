import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { sharpenTool } from '@/lib/editor/tools/filters/sharpenTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const sharpenParameters = z.object({
  amount: z.number().min(0).max(100)
    .describe('Sharpen intensity as a percentage (0-100). 0 = no sharpening, 100 = maximum sharpening')
})

// Define types
type SharpenInput = z.infer<typeof sharpenParameters>

interface SharpenOutput {
  success: boolean
  amount: number
  message: string
}

// Create adapter class
export class SharpenAdapter extends BaseToolAdapter<SharpenInput, SharpenOutput> {
  tool = sharpenTool
  aiName = 'applySharpen'
  description = `Apply sharpening effect to enhance edge definition. Common patterns:
- "slight sharpen" or "subtle sharpen" → amount: 10-20
- "sharpen" or "enhance edges" → amount: 30-40
- "strong sharpen" or "heavy sharpen" → amount: 60-80
- "maximum sharpen" → amount: 100
- "remove sharpen" → amount: 0
NEVER ask for the sharpen amount.`
  inputSchema = sharpenParameters
  
  async execute(params: SharpenInput, context: { canvas: Canvas }): Promise<SharpenOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Activate the sharpen tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get the sharpen tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'sharpen', params.amount)
      
      return {
        success: true,
        amount: params.amount,
        message: params.amount > 0 
          ? `Applied ${params.amount}% sharpening to the image`
          : 'Removed sharpening from the image'
      }
    } catch (error) {
      return {
        success: false,
        amount: 0,
        message: error instanceof Error ? error.message : 'Failed to apply sharpening'
      }
    }
  }
}

// Export singleton instance
const sharpenAdapter = new SharpenAdapter()
export default sharpenAdapter 