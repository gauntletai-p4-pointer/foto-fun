import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { sepiaTool } from '@/lib/editor/tools/filters/sepiaTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const sepiaParameters = z.object({
  intensity: z.number().min(0).max(100)
    .describe('Sepia effect intensity as a percentage (0-100). 0 = no sepia, 100 = full sepia')
})

// Define types
type SepiaInput = z.infer<typeof sepiaParameters>

interface SepiaOutput {
  success: boolean
  intensity: number
  message: string
}

// Create adapter class
export class SepiaAdapter extends BaseToolAdapter<SepiaInput, SepiaOutput> {
  tool = sepiaTool
  aiName = 'applySepia'
  description = `Apply vintage sepia tone effect to the image. Common patterns:
- "slight sepia" or "subtle vintage" → intensity: 20-30
- "sepia" or "vintage effect" → intensity: 50-60
- "strong sepia" or "old photo" → intensity: 80-90
- "full sepia" → intensity: 100
- "remove sepia" → intensity: 0
NEVER ask for the sepia intensity.`
  inputSchema = sepiaParameters
  
  async execute(params: SepiaInput, context: { canvas: Canvas }): Promise<SepiaOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Activate the sepia tool first
      const { useToolStore } = await import('@/store/toolStore')
      useToolStore.getState().setActiveTool(this.tool.id)
      
      // Small delay to ensure tool is activated and subscribed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get the sepia tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      useToolOptionsStore.getState().updateOption(this.tool.id, 'intensity', params.intensity)
      
      return {
        success: true,
        intensity: params.intensity,
        message: params.intensity > 0 
          ? `Applied ${params.intensity}% sepia effect to the image`
          : 'Removed sepia effect from the image'
      }
    } catch (error) {
      return {
        success: false,
        intensity: 0,
        message: error instanceof Error ? error.message : 'Failed to apply sepia effect'
      }
    }
  }
}

// Export singleton instance
const sepiaAdapter = new SepiaAdapter()
export default sepiaAdapter 