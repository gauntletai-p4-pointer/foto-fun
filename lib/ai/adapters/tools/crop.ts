import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { cropTool } from '@/lib/editor/tools/transform/cropTool'
import { CropCommand } from '@/lib/editor/commands/canvas'
import { useHistoryStore } from '@/store/historyStore'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'

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
  targetingMode: 'selection' | 'all-images'
}

/**
 * Adapter for the crop tool to make it AI-compatible
 * Following AI SDK v5 patterns with intelligent image targeting
 */
export class CropToolAdapter extends BaseToolAdapter<CropInput, CropOutput> {
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
  
  async execute(params: CropInput, context: CanvasContext): Promise<CropOutput> {
    console.log('[CropToolAdapter] Execute called with params:', params)
    console.log('[CropToolAdapter] Targeting mode:', context.targetingMode)
    
    const canvas = context.canvas
    
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    console.log('[CropToolAdapter] Canvas dimensions:', canvas.getWidth(), 'x', canvas.getHeight())
    
    // Use pre-filtered target images from enhanced context
    const images = context.targetImages
    
    console.log('[CropToolAdapter] Target images:', images.length)
    console.log('[CropToolAdapter] Targeting mode:', context.targetingMode)
    
    if (images.length === 0) {
      throw new Error('No images found to crop. Please load an image or select images first.')
    }
    
    // Validate crop bounds
    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()
    
    if (params.x < 0 || params.y < 0 || 
        params.x + params.width > canvasWidth || 
        params.y + params.height > canvasHeight) {
      throw new Error('Crop bounds exceed canvas dimensions')
    }
    
    // Create and execute crop command
    const command = new CropCommand(canvas, {
      left: params.x,
      top: params.y,
      width: params.width,
      height: params.height
    })
    
    // Execute the command through the history store
    await useHistoryStore.getState().executeCommand(command)
    
    // Calculate scale for return value
    const scale = Math.min(canvasWidth / params.width, canvasHeight / params.height)
    
    return {
      success: true,
      newDimensions: {
        width: canvas.getWidth(),
        height: canvas.getHeight()
      },
      scale: scale,
      targetingMode: context.targetingMode
    }
  }
  
  canExecute(canvas: import('fabric').Canvas): boolean {
    // Can only crop if there are objects on the canvas
    const hasObjects = canvas.getObjects().length > 0
    if (!hasObjects) {
      console.warn('Crop tool: No objects on canvas to crop')
    }
    return hasObjects
  }
  
  async generatePreview(params: CropInput, canvas: import('fabric').Canvas): Promise<{ before: string; after: string }> {
    // Save current state
    const before = canvas.toDataURL()
    
    // Clone canvas for preview
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.getWidth()
    tempCanvas.height = canvas.getHeight()
    const ctx = tempCanvas.getContext('2d')!
    
    // Draw current canvas to temp
    const img = new Image()
    img.src = before
    await new Promise(resolve => {
      img.onload = resolve
    })
    ctx.drawImage(img, 0, 0)
    
    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    ctx.clearRect(params.x, params.y, params.width, params.height)
    
    // Draw crop border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(params.x, params.y, params.width, params.height)
    
    const after = tempCanvas.toDataURL()
    
    return { before, after }
  }
} 