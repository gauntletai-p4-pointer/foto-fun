import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { cropTool } from '@/lib/tools/cropTool'
import { Rect, type FabricObject } from 'fabric'

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
}

/**
 * Adapter for the crop tool to make it AI-compatible
 * Following AI SDK v5 patterns
 */
export class CropToolAdapter extends BaseToolAdapter<CropInput, CropOutput> {
  tool = cropTool
  aiName = 'cropImage'
  description = 'Crop the image to specified pixel coordinates. Parameters must be in pixels (integers), not fractions or percentages. For example, to crop the left half of a 1000x800 image, use width:500, not width:0.5. The x,y coordinates specify the top-left corner of the crop area.'
  
  parameters = cropParameters
  
  async execute(params: CropInput, context: { canvas: import('fabric').Canvas }): Promise<CropOutput> {
    const canvas = context.canvas
    
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