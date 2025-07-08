import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { blurTool } from '@/lib/editor/tools/filters/blurTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const blurParameters = z.object({
  amount: z.number().min(0).max(100)
    .describe('Blur intensity as a percentage (0-100). 0 = no blur, 100 = maximum blur')
})

// Define types
type BlurInput = z.infer<typeof blurParameters>

interface BlurOutput {
  success: boolean
  amount: number
  message: string
}

// Create adapter class
export class BlurAdapter extends BaseToolAdapter<BlurInput, BlurOutput> {
  tool = blurTool
  aiName = 'applyBlur'
  description = `Apply gaussian blur effect to the image. Common patterns:
- "slight blur" or "subtle blur" → amount: 10-20
- "blur" or "add blur" → amount: 30-40
- "heavy blur" or "strong blur" → amount: 60-80
- "maximum blur" → amount: 100
- "remove blur" or "no blur" → amount: 0
NEVER ask for the blur amount.`
  inputSchema = blurParameters
  
  async execute(params: BlurInput, context: { canvas: Canvas }): Promise<BlurOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Activate the blur tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get the blur tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'blur', params.amount)
      
      return {
        success: true,
        amount: params.amount,
        message: params.amount > 0 
          ? `Applied ${params.amount}% blur to the image`
          : 'Removed blur from the image'
      }
    } catch (error) {
      return {
        success: false,
        amount: 0,
        message: error instanceof Error ? error.message : 'Failed to apply blur'
      }
    }
  }
}

// Export singleton instance
const blurAdapter = new BlurAdapter()
export default blurAdapter 