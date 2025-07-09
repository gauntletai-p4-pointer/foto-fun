import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { resizeTool } from '@/lib/editor/tools/transform/resizeTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

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
  targetingMode: 'selection' | 'all-images'
}

// Create adapter class
export class ResizeToolAdapter extends BaseToolAdapter<ResizeInput, ResizeOutput> {
  tool = resizeTool
  aiName = 'resizeImage'
  description = `Resize existing images to different dimensions. You MUST calculate dimensions based on user intent.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be resized
- If no images are selected, all images on the canvas will be resized

Common resize requests:
- "resize to 50%" → mode: "percentage", width: 50, maintainAspectRatio: true
- "make it smaller" → mode: "percentage", width: 75, maintainAspectRatio: true
- "make it larger" → mode: "percentage", width: 150, maintainAspectRatio: true
- "resize to 1920x1080" → mode: "absolute", width: 1920, height: 1080
- "resize width to 800" → mode: "absolute", width: 800, maintainAspectRatio: true

NEVER ask for exact dimensions - interpret the user's intent.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = resizeParameters
  
  async execute(params: ResizeInput, context: CanvasContext): Promise<ResizeOutput> {
    try {
      console.log('[ResizeToolAdapter] Execute called with params:', params)
      console.log('[ResizeToolAdapter] Targeting mode:', context.targetingMode)
      
      // Use pre-filtered target images from enhanced context
      const images = context.targetImages
      
      console.log('[ResizeToolAdapter] Target images:', images.length)
      console.log('[ResizeToolAdapter] Targeting mode:', context.targetingMode)
      
      if (images.length === 0) {
        throw new Error('No images found to resize. Please load an image or select images first.')
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
          ? `Resized ${images.length} image(s) to ${params.width}%`
          : `Resized ${images.length} image(s) to ${finalDimensions.width}x${finalDimensions.height} pixels`,
        targetingMode: context.targetingMode
      }
    } catch (error) {
      return {
        success: false,
        mode: '',
        dimensions: { width: 0, height: 0 },
        message: error instanceof Error ? error.message : 'Failed to resize image',
        targetingMode: context.targetingMode
      }
    }
  }
}

// Export singleton instance
const resizeAdapter = new ResizeToolAdapter()
export default resizeAdapter 