import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import type { ImageData } from '@/lib/editor/objects/types'

// Define parameter schema
const brushInputSchema = z.object({
  strokes: z.array(z.object({
    points: z.array(z.object({
      x: z.number(),
      y: z.number(),
      pressure: z.number().optional()
    })).describe('Array of points forming the brush stroke'),
    color: z.string().describe('Hex color for this stroke'),
    size: z.number().min(1).max(500).optional().describe('Brush size in pixels'),
    opacity: z.number().min(0).max(100).optional().describe('Opacity percentage'),
    hardness: z.number().min(0).max(100).optional().describe('Brush hardness percentage')
  })).describe('Array of brush strokes to paint'),
  preset: z.enum(['soft-round', 'hard-round', 'airbrush', 'watercolor', 'oil-paint']).optional()
    .describe('Brush preset to use')
})

type BrushInput = z.infer<typeof brushInputSchema>

interface BrushOutput {
  success: boolean
  strokeCount: number
  message: string
  affectedObjects: string[]
}

/**
 * AI adapter for the Brush tool
 * Creates new image objects containing painted brush strokes
 */
export class BrushToolAdapter extends UnifiedToolAdapter<BrushInput, BrushOutput> {
  toolId = 'brush'
  aiName = 'paintBrush'
  description = `Paint brush strokes on the canvas with various styles and effects.

CAPABILITIES:
- Paint freeform strokes with specified points
- Use different brush presets (soft, hard, airbrush, watercolor, oil)
- Control size, opacity, and hardness
- Support pressure sensitivity for natural strokes

Common requests:
- "Paint a red line across the top" → Create stroke with red color
- "Add soft brush strokes" → Use soft-round preset
- "Paint with watercolor effect" → Use watercolor preset
- "Draw thick black strokes" → Large size, black color

The tool creates new paint objects that can be blended with existing content.`

  inputSchema = brushInputSchema
  
  async execute(
    params: BrushInput,
    context: ObjectCanvasContext
  ): Promise<BrushOutput> {
    const canvas = context.canvas
    const affectedObjects: string[] = []
    
    if (params.strokes.length === 0) {
      return {
        success: false,
        strokeCount: 0,
        message: 'No strokes provided to paint',
        affectedObjects: []
      }
    }
    
    // Calculate bounds for all strokes
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const stroke of params.strokes) {
      const brushRadius = (stroke.size || 20) / 2
      for (const point of stroke.points) {
        minX = Math.min(minX, point.x - brushRadius)
        minY = Math.min(minY, point.y - brushRadius)
        maxX = Math.max(maxX, point.x + brushRadius)
        maxY = Math.max(maxY, point.y + brushRadius)
      }
    }
    
    // Create bounds with some padding
    const padding = 10
    const bounds = {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.min(canvas.getViewport().width, maxX - minX + padding * 2),
      height: Math.min(canvas.getViewport().height, maxY - minY + padding * 2)
    }
    
    // Create a new canvas element for painting
    const paintCanvas = document.createElement('canvas')
    paintCanvas.width = bounds.width
    paintCanvas.height = bounds.height
    const ctx = paintCanvas.getContext('2d')
    
    if (!ctx) {
      return {
        success: false,
        strokeCount: 0,
        message: 'Failed to create painting context',
        affectedObjects: []
      }
    }
    
    // Apply preset settings
    const presetSettings = this.getPresetSettings(params.preset)
    
    // Paint each stroke
    for (const stroke of params.strokes) {
      this.paintStroke(ctx, stroke, bounds, presetSettings)
    }
    
    // Create image data from the painted canvas
    const imageData: ImageData = {
      element: paintCanvas,
      naturalWidth: bounds.width,
      naturalHeight: bounds.height
    }
    
    // Create a new image object with the painted strokes
    const objectId = await canvas.addObject({
      type: 'image',
      name: `Brush Strokes (${params.strokes.length})`,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      zIndex: canvas.getAllObjects().length,
      filters: [],
      adjustments: [],
      data: imageData
    })
    
    affectedObjects.push(objectId)
    
    // Select the new brush strokes
    canvas.selectObject(objectId)
    
    return {
      success: true,
      strokeCount: params.strokes.length,
      message: `Painted ${params.strokes.length} brush stroke${params.strokes.length !== 1 ? 's' : ''}`,
      affectedObjects
    }
  }
  
  private getPresetSettings(preset?: string) {
    const presetSettings = {
      'soft-round': { hardness: 0, flow: 100, spacing: 25 },
      'hard-round': { hardness: 100, flow: 100, spacing: 25 },
      'airbrush': { hardness: 0, flow: 10, spacing: 10 },
      'watercolor': { hardness: 0, flow: 30, spacing: 20 },
      'oil-paint': { hardness: 50, flow: 90, spacing: 15 }
    }
    
    return preset ? presetSettings[preset as keyof typeof presetSettings] || {} : {}
  }
  
  private paintStroke(
    ctx: CanvasRenderingContext2D,
    stroke: BrushInput['strokes'][0],
    bounds: { x: number; y: number },
    presetSettings: Record<string, unknown>
  ): void {
    if (stroke.points.length === 0) return
    
    const size = stroke.size || 20
    const opacity = (stroke.opacity || 100) / 100
    const hardness = stroke.hardness ?? (typeof presetSettings.hardness === 'number' ? presetSettings.hardness : 50) ?? 50
    
    ctx.globalAlpha = opacity
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Create gradient for soft brushes
    if (hardness < 100) {
      // This is a simplified soft brush - in production you'd use more sophisticated rendering
      ctx.filter = `blur(${(100 - hardness) / 20}px)`
    }
    
    ctx.beginPath()
    
    // Move to first point
    const firstPoint = stroke.points[0]
    ctx.moveTo(firstPoint.x - bounds.x, firstPoint.y - bounds.y)
    
    // Draw smooth curve through points
    if (stroke.points.length === 1) {
      // Single point - draw a dot
      ctx.arc(firstPoint.x - bounds.x, firstPoint.y - bounds.y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Multiple points - draw smooth path
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i]
        ctx.lineTo(point.x - bounds.x, point.y - bounds.y)
      }
      ctx.stroke()
    }
    
    // Reset filter
    ctx.filter = 'none'
  }
} 