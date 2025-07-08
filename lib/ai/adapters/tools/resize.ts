import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { resizeTool } from '@/lib/editor/tools/transform/resizeTool'
import type { Canvas } from 'fabric'

// Define parameter schema
const resizeParameters = z.object({
  mode: z.enum(['percentage', 'absolute'])
    .describe('Resize mode: percentage (scale) or absolute (specific dimensions)'),
  width: z.number()
    .positive()
    .describe('Width value - either percentage (10-200) or pixels depending on mode'),
  height: z.number()
    .positive()
    .optional()
    .describe('Height value - if not provided, maintains aspect ratio'),
  maintainAspectRatio: z.boolean()
    .describe('Whether to maintain the original aspect ratio')
}).transform((data) => ({
  ...data,
  maintainAspectRatio: data.maintainAspectRatio ?? true
}))

type ResizeInput = z.infer<typeof resizeParameters>

// Define output type
interface ResizeOutput {
  success: boolean
  mode: string
  dimensions: { width: number; height: number }
  message: string
}

// Create adapter class
export class ResizeToolAdapter extends BaseToolAdapter<ResizeInput, ResizeOutput> {
  tool = resizeTool
  aiName = 'resizeImage'
  description = `Resize the image by percentage or to specific dimensions. You MUST calculate the values based on user intent.
Common patterns you should use:
- "resize to 50%" or "half size" → mode: percentage, width: 50
- "make it twice as big" or "200%" → mode: percentage, width: 200
- "resize to 800x600" → mode: absolute, width: 800, height: 600
- "resize to 1920 wide" → mode: absolute, width: 1920 (height auto-calculated)
- "make it smaller" → mode: percentage, width: 75
- "make it larger" → mode: percentage, width: 125
- "thumbnail size" → mode: absolute, width: 150, height: 150
- Default to maintaining aspect ratio unless user specifies otherwise
NEVER ask for exact values - interpret the user's intent and calculate appropriate dimensions.`
  
  inputSchema = resizeParameters
  
  async execute(params: ResizeInput, context: { canvas: Canvas }): Promise<ResizeOutput> {
    try {
      // Verify canvas has content
      const objects = context.canvas.getObjects()
      if (objects.length === 0) {
        throw new Error('No content found on canvas. Please load an image first.')
      }
      
      // Get the resize tool options and update them
      const { useToolOptionsStore } = await import('@/store/toolOptionsStore')
      const store = useToolOptionsStore.getState()
      
      // Set the mode
      store.updateOption(this.tool.id, 'mode', params.mode)
      store.updateOption(this.tool.id, 'maintainAspectRatio', params.maintainAspectRatio)
      
      if (params.mode === 'percentage') {
        store.updateOption(this.tool.id, 'percentage', params.width)
      } else {
        // For absolute mode, update width and height
        const currentWidth = context.canvas.getWidth()
        const currentHeight = context.canvas.getHeight()
        const aspectRatio = currentWidth / currentHeight
        
        store.updateOption(this.tool.id, 'width', params.width)
        
        if (params.height !== undefined) {
          store.updateOption(this.tool.id, 'height', params.height)
        } else if (params.maintainAspectRatio) {
          // Calculate height based on aspect ratio
          const calculatedHeight = Math.round(params.width / aspectRatio)
          store.updateOption(this.tool.id, 'height', calculatedHeight)
        }
      }
      
      const finalDimensions = params.mode === 'percentage' 
        ? { width: params.width, height: params.width }
        : { width: params.width, height: params.height || Math.round(params.width / (context.canvas.getWidth() / context.canvas.getHeight())) }
      
      return {
        success: true,
        mode: params.mode,
        dimensions: finalDimensions,
        message: params.mode === 'percentage' 
          ? `Resized image to ${params.width}%`
          : `Resized image to ${finalDimensions.width}x${finalDimensions.height} pixels`
      }
    } catch (error) {
      return {
        success: false,
        mode: '',
        dimensions: { width: 0, height: 0 },
        message: error instanceof Error ? error.message : 'Failed to resize image'
      }
    }
  }
}

// Export singleton instance
const resizeAdapter = new ResizeToolAdapter()
export default resizeAdapter 