import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { cropTool } from '@/lib/editor/tools/transform/cropTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

// Input schema following AI SDK v5 patterns
const cropParameters = z.object({
  x: z.number().min(0).describe('X coordinate of crop area in pixels'),
  y: z.number().min(0).describe('Y coordinate of crop area in pixels'),
  width: z.number().min(1).describe('Width of crop area in pixels (must be at least 1)'),
  height: z.number().min(1).describe('Height of crop area in pixels (must be at least 1)')
})

type CropInput = z.infer<typeof cropParameters>

// Output type
interface CropOutput {
  success: boolean
  newDimensions: {
    width: number
    height: number
  }
  scale?: number
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
  message?: string
}

/**
 * Adapter for the crop tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class CropToolAdapter extends CanvasToolAdapter<CropInput, CropOutput> {
  tool = cropTool
  aiName = 'cropImage'
  description = `Crop images to focus on specific areas or change aspect ratios. You MUST calculate exact pixel coordinates.

INTELLIGENT TARGETING:
- If you have images selected, only those images will be cropped
- If no images are selected, all images on the canvas will be cropped

Common crop requests:
- "crop to square" → make width = height, centered
- "crop to focus on [subject]" → estimate subject position and crop around it
- "remove edges" → crop 10-20% from each side
- "crop to 16:9" → calculate 16:9 aspect ratio dimensions
- "crop tighter" → reduce dimensions by 20-30%

NEVER ask for exact coordinates - calculate them based on the current canvas size and user intent.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = cropParameters
  
  protected getActionVerb(): string {
    return 'crop'
  }
  
  async execute(params: CropInput, context: CanvasContext, executionContext?: ExecutionContext): Promise<CropOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images) => {
        console.log('[CropToolAdapter] Execute called with params:', params)
        console.log('[CropToolAdapter] Targeting mode:', context.targetingMode)
        
        const canvas = context.canvas
        
        console.log('[CropToolAdapter] Canvas dimensions:', (canvas.state.documentBounds?.width || 0), 'x', (canvas.state.documentBounds?.height || 0))
        console.log('[CropToolAdapter] Target images:', images.length)
        
        // Validate crop bounds
        const canvasWidth = (canvas.state.documentBounds?.width || 0)
        const canvasHeight = (canvas.state.documentBounds?.height || 0)
        
        if (params.x < 0 || params.y < 0 || 
            params.x + params.width > canvasWidth || 
            params.y + params.height > canvasHeight) {
          throw new Error('Crop bounds exceed canvas dimensions')
        }
        
        // Use CanvasManager's crop method
        await canvas.crop({
          x: params.x,
          y: params.y,
          width: params.width,
          height: params.height
        })
        
        // Calculate scale for return value
        const scale = Math.min(canvasWidth / params.width, canvasHeight / params.height)
        
        // Generate descriptive message
        const originalSize = `${canvasWidth}x${canvasHeight}`
        const newSize = `${params.width}x${params.height}`
        const percentReduction = Math.round((1 - (params.width * params.height) / (canvasWidth * canvasHeight)) * 100)
        
        let message = `Cropped canvas from ${originalSize} to ${newSize}`
        if (percentReduction > 0) {
          message += ` (${percentReduction}% size reduction)`
        }
        
        return {
          newDimensions: {
            width: (canvas.state.documentBounds?.width || 0),
            height: (canvas.state.documentBounds?.height || 0)
          },
          scale: scale,
          message
        }
      },
      executionContext
    )
  }
  
  canExecute(canvas: { state: { layers: Array<{ objects: Array<unknown> }> } }): boolean {
    // Can only crop if there are objects on the canvas
    const hasObjects = canvas.state.layers.some((layer) => layer.objects.length > 0)
    if (!hasObjects) {
      console.warn('Crop tool: No objects on canvas to crop')
    }
    return hasObjects
  }
} 