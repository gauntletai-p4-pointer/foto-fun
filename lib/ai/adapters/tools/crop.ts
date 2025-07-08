import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { cropTool } from '@/lib/tools/cropTool'
import { Rect, type FabricObject } from 'fabric'
import { CropParameterResolver } from '../resolvers/crop'

// Input/Output schemas
const CropInputSchema = z.object({
  x: z.number().min(0).describe('X coordinate of crop area'),
  y: z.number().min(0).describe('Y coordinate of crop area'),
  width: z.number().min(1).describe('Width of crop area'),
  height: z.number().min(1).describe('Height of crop area')
})

const CropOutputSchema = z.object({
  success: z.boolean(),
  newDimensions: z.object({
    width: z.number(),
    height: z.number()
  }),
  scale: z.number().optional()
})

type CropInput = z.infer<typeof CropInputSchema>
type CropOutput = z.infer<typeof CropOutputSchema>

/**
 * Adapter for the crop tool to make it AI-compatible
 */
export class CropToolAdapter extends BaseToolAdapter<CropInput, CropOutput> {
  tool = cropTool
  aiName = 'cropImage'
  aiDescription = 'Crop the image. You can specify exact coordinates or use natural language like "crop 10% from edges", "crop to 16:9", "crop the left half".'
  
  inputSchema = CropInputSchema
  outputSchema = CropOutputSchema
  
  // Add parameter resolver for natural language support
  parameterResolver = new CropParameterResolver()
  
  async execute(params: CropInput, canvas: NonNullable<import('../../tools/base').ToolExecutionContext['canvas']>): Promise<CropOutput> {
    // Get all objects on canvas
    const objects = canvas.getObjects()
    
    if (objects.length === 0) {
      throw new Error('No objects to crop')
    }
    
    // Validate crop bounds
    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()
    
    if (params.x < 0 || params.y < 0 || 
        params.x + params.width > canvasWidth || 
        params.y + params.height > canvasHeight) {
      throw new Error('Crop bounds exceed canvas dimensions')
    }
    
    // Apply clipPath to each object (same logic as the actual crop tool)
    objects.forEach((obj) => {
      // Create a clip rectangle
      const clipRect = new Rect({
        left: params.x,
        top: params.y,
        width: params.width,
        height: params.height,
        absolutePositioned: true
      })
      
      // Set clipPath property - direct assignment like in the actual crop tool
      ;(obj as unknown as FabricObject).clipPath = clipRect
    })
    
    // Calculate scale factor to fit canvas
    const scaleX = canvasWidth / params.width
    const scaleY = canvasHeight / params.height
    const scale = Math.min(scaleX, scaleY)
    
    // Apply transformation to fit the cropped area to canvas
    objects.forEach((obj) => {
      // Scale the object
      obj.scale((obj.scaleX || 1) * scale)
      
      // Reposition the object
      obj.set({
        left: ((obj.left || 0) - params.x) * scale,
        top: ((obj.top || 0) - params.y) * scale
      })
      
      obj.setCoords()
    })
    
    // Optionally resize canvas to maintain aspect ratio
    if (scaleX !== scaleY) {
      canvas.setDimensions({
        width: params.width * scale,
        height: params.height * scale
      })
    }
    
    canvas.renderAll()
    
    return {
      success: true,
      newDimensions: {
        width: canvas.getWidth(),
        height: canvas.getHeight()
      },
      scale: scale
    }
  }
  
  canExecute(canvas: NonNullable<import('../../tools/base').ToolExecutionContext['canvas']>): boolean {
    // Can only crop if there are objects on the canvas
    const hasObjects = canvas.getObjects().length > 0
    if (!hasObjects) {
      console.warn('Crop tool: No objects on canvas to crop')
    }
    return hasObjects
  }
  
  async generatePreview(params: CropInput, canvas: NonNullable<import('../../tools/base').ToolExecutionContext['canvas']>): Promise<{ before: string; after: string }> {
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