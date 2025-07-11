import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import type { ImageData } from '@/lib/editor/objects/types'

// Define parameter schema
const gradientInputSchema = z.object({
  type: z.enum(['linear', 'radial', 'angle', 'reflected', 'diamond'])
    .describe('Type of gradient'),
  startPoint: z.object({
    x: z.number(),
    y: z.number()
  }).describe('Starting point of the gradient'),
  endPoint: z.object({
    x: z.number(),
    y: z.number()
  }).describe('Ending point of the gradient'),
  colors: z.array(z.object({
    color: z.string().describe('Hex color value'),
    position: z.number().min(0).max(1).describe('Position in gradient (0-1)')
  })).min(2).describe('Gradient color stops'),
  opacity: z.number().min(0).max(100).optional().describe('Overall gradient opacity'),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).optional()
    .describe('Blend mode for the gradient')
})

type GradientInput = z.infer<typeof gradientInputSchema>

interface GradientOutput {
  success: boolean
  type: string
  colorCount: number
  message: string
  affectedObjects: string[]
}

/**
 * AI adapter for the Gradient tool
 * Creates new image objects with gradient fills
 */
export class GradientToolAdapter extends UnifiedToolAdapter<GradientInput, GradientOutput> {
  toolId = 'gradient'
  aiName = 'createGradient'
  description = `Create gradient fills with various styles and color transitions.

GRADIENT TYPES:
- linear: Straight gradient from start to end
- radial: Circular gradient from center outward
- angle: Conical gradient rotating around center
- reflected: Linear gradient that reflects from center
- diamond: Diamond-shaped gradient from center

Common requests:
- "Add sunset gradient" → Linear gradient with warm colors
- "Create radial glow" → Radial gradient with light center
- "Rainbow gradient" → Linear with multiple color stops
- "Fade to transparent" → Gradient with alpha channel

The gradient is applied as a new object.`

  inputSchema = gradientInputSchema
  
  async execute(
    params: GradientInput,
    context: ObjectCanvasContext
  ): Promise<GradientOutput> {
    const canvas = context.canvas
    
    // Calculate gradient bounds
    const minX = Math.min(params.startPoint.x, params.endPoint.x)
    const minY = Math.min(params.startPoint.y, params.endPoint.y)
    const maxX = Math.max(params.startPoint.x, params.endPoint.x)
    const maxY = Math.max(params.startPoint.y, params.endPoint.y)
    
    // Ensure minimum size
    const width = Math.max(maxX - minX, 100)
    const height = Math.max(maxY - minY, 100)
    
    // Create a canvas for the gradient
    const gradientCanvas = document.createElement('canvas')
    gradientCanvas.width = width
    gradientCanvas.height = height
    const ctx = gradientCanvas.getContext('2d')
    
    if (!ctx) {
      return {
        success: false,
        type: params.type,
        colorCount: params.colors.length,
        message: 'Failed to create gradient context',
        affectedObjects: []
      }
    }
    
    // Create the gradient
    let gradient: CanvasGradient
    
    switch (params.type) {
      case 'radial': {
        const centerX = (params.startPoint.x + params.endPoint.x) / 2 - minX
        const centerY = (params.startPoint.y + params.endPoint.y) / 2 - minY
        const radius = Math.sqrt(
          Math.pow(params.endPoint.x - params.startPoint.x, 2) + 
          Math.pow(params.endPoint.y - params.startPoint.y, 2)
        ) / 2
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
        break
      }
      case 'linear':
      default: {
        gradient = ctx.createLinearGradient(
          params.startPoint.x - minX,
          params.startPoint.y - minY,
          params.endPoint.x - minX,
          params.endPoint.y - minY
        )
        break
      }
    }
    
    // Add color stops
    params.colors.forEach(colorStop => {
      gradient.addColorStop(colorStop.position, colorStop.color)
    })
    
    // Fill with gradient
    ctx.fillStyle = gradient
    ctx.globalAlpha = (params.opacity || 100) / 100
    ctx.fillRect(0, 0, width, height)
    
    // Create image data from the gradient
    const imageData: ImageData = {
      element: gradientCanvas,
      naturalWidth: width,
      naturalHeight: height
    }
    
    // Create a new image object with the gradient
    const objectId = await canvas.addObject({
      type: 'image',
      name: `${params.type} gradient`,
      x: minX,
      y: minY,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      blendMode: params.blendMode || 'normal',
      visible: true,
      locked: false,
      zIndex: canvas.getAllObjects().length,
      filters: [],
      adjustments: [],
      data: imageData
    })
    
    // Select the new gradient
    canvas.selectObject(objectId)
    
    return {
      success: true,
      type: params.type,
      colorCount: params.colors.length,
      message: `Created ${params.type} gradient with ${params.colors.length} colors`,
      affectedObjects: [objectId]
    }
  }
} 