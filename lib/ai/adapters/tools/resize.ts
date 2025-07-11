import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Define parameter schema
const resizeInputSchema = z.object({
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

type ResizeInput = z.infer<typeof resizeInputSchema>

// Define output type
interface ResizeOutput {
  success: boolean
  mode: string
  dimensions: { width: number; height: number }
  message: string
  affectedObjects: string[]
}

/**
 * Adapter for the resize tool
 * Provides AI-compatible interface for resizing objects
 */
export class ResizeToolAdapter extends UnifiedToolAdapter<ResizeInput, ResizeOutput> {
  toolId = 'resize'
  aiName = 'resizeObjects'
  description = `Resize objects to different dimensions. You MUST calculate dimensions based on user intent.

INTELLIGENT TARGETING:
- If you have objects selected, only those objects will be resized
- If no objects are selected, all objects on the canvas will be resized

Common resize requests:
- "resize to 50%" → mode: "percentage", width: 50, maintainAspectRatio: true
- "make it smaller" → mode: "percentage", width: 75, maintainAspectRatio: true
- "make it larger" → mode: "percentage", width: 150, maintainAspectRatio: true
- "resize to 1920x1080" → mode: "absolute", width: 1920, height: 1080
- "resize width to 800" → mode: "absolute", width: 800, maintainAspectRatio: true

NEVER ask for exact dimensions - interpret the user's intent.`

  inputSchema = resizeInputSchema
  
  async execute(params: ResizeInput, context: ObjectCanvasContext): Promise<ResizeOutput> {
    const targets = this.getTargets(context)
    
    if (targets.length === 0) {
      return {
        success: false,
        mode: params.mode,
        dimensions: { width: 0, height: 0 },
        message: 'No objects found to resize',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    // Apply resize to all target objects
    for (const obj of targets) {
      if (params.mode === 'percentage') {
        // Scale mode
        const scale = params.width / 100
        const currentScaleX = obj.scaleX || 1
        const currentScaleY = obj.scaleY || 1
        
        await context.canvas.updateObject(obj.id, {
          scaleX: currentScaleX * scale,
          scaleY: params.maintainAspectRatio ? currentScaleY * scale : currentScaleY
        })
      } else {
        // Absolute mode
        const currentWidth = obj.width * (obj.scaleX || 1)
        const currentHeight = obj.height * (obj.scaleY || 1)
        const aspectRatio = currentWidth / currentHeight
        
        const newWidth = params.width
        let newHeight = params.height
        
        if (!newHeight && params.maintainAspectRatio) {
          newHeight = Math.round(newWidth / aspectRatio)
        } else if (!newHeight) {
          newHeight = currentHeight
        }
        
        const newScaleX = newWidth / obj.width
        const newScaleY = newHeight / obj.height
        
        await context.canvas.updateObject(obj.id, {
          scaleX: newScaleX,
          scaleY: newScaleY
        })
      }
      
      affectedObjects.push(obj.id)
    }
    
    // Calculate final dimensions for message
    let finalDimensions: { width: number; height: number }
    
    if (params.mode === 'percentage') {
      finalDimensions = { width: params.width, height: params.width }
    } else {
      const firstObj = targets[0]
      const currentWidth = firstObj.width * (firstObj.scaleX || 1)
      const currentHeight = firstObj.height * (firstObj.scaleY || 1)
      const aspectRatio = currentWidth / currentHeight
      
      finalDimensions = {
        width: params.width,
        height: params.height || Math.round(params.width / aspectRatio)
      }
    }
    
    // Generate descriptive message
    let description = ''
    
    if (params.mode === 'percentage') {
      const scale = params.width
      if (scale === 100) {
        description = 'No size change'
      } else if (scale > 100) {
        description = `Enlarged to ${scale}% of original size`
      } else {
        description = `Reduced to ${scale}% of original size`
      }
    } else {
      // Pixels mode
      const aspectRatio = finalDimensions.width / finalDimensions.height
      let aspectDescription = ''
      
      if (Math.abs(aspectRatio - 1) < 0.01) {
        aspectDescription = 'square'
      } else if (aspectRatio > 1.77 && aspectRatio < 1.78) {
        aspectDescription = '16:9'
      } else if (aspectRatio > 1.33 && aspectRatio < 1.34) {
        aspectDescription = '4:3'
      } else if (aspectRatio > 1) {
        aspectDescription = 'landscape'
      } else {
        aspectDescription = 'portrait'
      }
      
      description = `Resized to ${finalDimensions.width}×${finalDimensions.height}px (${aspectDescription})`
    }
    
    const message = `${description} for ${affectedObjects.length} object${affectedObjects.length !== 1 ? 's' : ''}`
    
    return {
      success: true,
      mode: params.mode,
      dimensions: finalDimensions,
      message,
      affectedObjects
    }
  }
} 