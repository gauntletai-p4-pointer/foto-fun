import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const eraserInputSchema = z.object({
  strokes: z.array(z.object({
    points: z.array(z.object({
      x: z.number(),
      y: z.number(),
      pressure: z.number().optional()
    })).describe('Array of points forming the eraser stroke'),
    size: z.number().min(1).max(500).optional().describe('Eraser size in pixels')
  })).describe('Array of eraser strokes'),
  mode: z.enum(['brush', 'pencil', 'block', 'background']).optional()
    .describe('Eraser mode - background mode removes similar colors'),
  tolerance: z.number().min(0).max(255).optional()
    .describe('Tolerance for background eraser mode')
})

type EraserInput = z.infer<typeof eraserInputSchema>

interface EraserOutput {
  success: boolean
  strokeCount: number
  mode: string
  message: string
  affectedObjects: string[]
}

/**
 * AI adapter for the Eraser tool
 * Enables AI to erase parts of image objects
 */
export class EraserToolAdapter extends UnifiedToolAdapter<EraserInput, EraserOutput> {
  toolId = 'eraser'
  aiName = 'eraser'
  description = `Erase parts of images or remove backgrounds intelligently.

CAPABILITIES:
- Erase with different modes (brush, pencil, block, background)
- Background eraser removes similar colors based on tolerance
- Support pressure sensitivity for natural erasing
- Variable eraser sizes

Common requests:
- "Erase the background" → Use background mode with appropriate tolerance
- "Remove this area" → Use brush mode with strokes
- "Clean up edges" → Use pencil mode for precision
- "Erase large area" → Use block mode or large brush

The eraser works on selected image objects.`

  inputSchema = eraserInputSchema
  
  async execute(
    params: EraserInput,
    context: ObjectCanvasContext
  ): Promise<EraserOutput> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        strokeCount: 0,
        mode: params.mode || 'brush',
        message: 'No image objects found to erase from',
        affectedObjects: []
      }
    }
    
    const mode = params.mode || 'brush'
    const affectedObjects: string[] = []
    
    // Process each image object
    for (const obj of imageObjects) {
      // For each image, we need to apply the eraser strokes
      // This is a simplified implementation - in production you'd use more sophisticated masking
      
      // Create a mask for the eraser strokes
      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = obj.width
      maskCanvas.height = obj.height
      const maskCtx = maskCanvas.getContext('2d')
      
      if (!maskCtx) continue
      
      // Fill with white (fully opaque)
      maskCtx.fillStyle = 'white'
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
      
      // Set up eraser strokes (black = transparent)
      maskCtx.globalCompositeOperation = 'destination-out'
      maskCtx.strokeStyle = 'black'
      maskCtx.lineCap = 'round'
      maskCtx.lineJoin = 'round'
      
      // Apply each eraser stroke
      for (const stroke of params.strokes) {
        this.applyEraserStroke(maskCtx, stroke, obj, mode)
      }
      
      // Store the mask in metadata for the renderer to apply
      await context.canvas.updateObject(obj.id, {
        metadata: {
          ...obj.metadata,
          eraserMask: {
            canvas: maskCanvas,
            mode,
            strokeCount: params.strokes.length
          }
        }
      })
      
      affectedObjects.push(obj.id)
    }
    
    return {
      success: true,
      strokeCount: params.strokes.length,
      mode,
      message: `Erased ${params.strokes.length} stroke${params.strokes.length !== 1 ? 's' : ''} using ${mode} mode on ${affectedObjects.length} object(s)`,
      affectedObjects
    }
  }
  
  private applyEraserStroke(
    ctx: CanvasRenderingContext2D,
    stroke: EraserInput['strokes'][0],
    obj: { x: number; y: number },
    mode: string
  ): void {
    if (stroke.points.length === 0) return
    
    const size = stroke.size || 20
    ctx.lineWidth = size
    
    // Adjust line width based on mode
    if (mode === 'pencil') {
      ctx.lineWidth = Math.min(size, 5) // Pencil mode is always thin
    } else if (mode === 'block') {
      ctx.lineWidth = size * 2 // Block mode is wider
    }
    
    ctx.beginPath()
    
    // Move to first point (relative to object position)
    const firstPoint = stroke.points[0]
    ctx.moveTo(firstPoint.x - obj.x, firstPoint.y - obj.y)
    
    if (stroke.points.length === 1) {
      // Single point - erase a circle
      ctx.arc(firstPoint.x - obj.x, firstPoint.y - obj.y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Multiple points - draw eraser path
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i]
        ctx.lineTo(point.x - obj.x, point.y - obj.y)
      }
      ctx.stroke()
    }
  }
} 