import { Expand } from 'lucide-react'
import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import Konva from 'konva'

/**
 * Outpainting Tool - AI-powered image extension
 * Uses AI to intelligently extend images beyond their boundaries
 */
export class OutpaintingTool extends ObjectTool {
  // Tool identification
  id = 'outpainting'
  name = 'AI Outpainting'
  icon = Expand
  cursor = 'crosshair'
  
  // Service and state
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  private previewRect: Konva.Rect | null = null
  private expandDirection: 'top' | 'right' | 'bottom' | 'left' | 'all' = 'all'
  
  protected setupTool(): void {
    // Initialize Replicate service
    const apiKey = process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN
    if (apiKey) {
      this.replicateService = new ReplicateService(apiKey)
    } else {
      console.error('[OutpaintingTool] No Replicate API key found')
    }
    
    // Set default options
    this.setOption('prompt', '') // Description of what to generate
    this.setOption('expandSize', 256) // Pixels to expand
    this.setOption('direction', 'all') // Direction to expand
    this.setOption('seamlessBlend', true) // Blend edges seamlessly
  }
  
  protected cleanupTool(): void {
    this.cleanupPreview()
    this.replicateService = null
    this.isProcessing = false
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (!this.replicateService || this.isProcessing) return
    
    const canvas = this.getCanvas()
    const point = event.point
    
    // Find which object was clicked
    const clickedObject = await this.getObjectAtPoint(point)
    
    if (!clickedObject || clickedObject.type !== 'image') {
      console.warn('[OutpaintingTool] Click on an image to extend it')
      return
    }
    
    // Select the object if not already selected
    if (!canvas.state.selectedObjectIds.has(clickedObject.id)) {
      canvas.selectObject(clickedObject.id)
    }
    
    // Determine direction based on click position
    this.expandDirection = this.getExpansionDirection(clickedObject, point)
    this.setOption('direction', this.expandDirection)
    
    // Show preview
    this.showExpansionPreview(clickedObject)
    
    // Apply outpainting
    await this.applyOutpainting(clickedObject)
  }
  
  /**
   * Determine expansion direction based on click position
   */
  private getExpansionDirection(
    object: CanvasObject, 
    clickPoint: { x: number; y: number }
  ): 'top' | 'right' | 'bottom' | 'left' | 'all' {
    const relX = clickPoint.x - object.x
    const relY = clickPoint.y - object.y
    const centerX = object.width / 2
    const centerY = object.height / 2
    
    // If clicked near center, expand all directions
    const threshold = Math.min(object.width, object.height) * 0.3
    if (Math.abs(relX - centerX) < threshold && Math.abs(relY - centerY) < threshold) {
      return 'all'
    }
    
    // Determine primary direction
    const xDist = Math.abs(relX - centerX)
    const yDist = Math.abs(relY - centerY)
    
    if (xDist > yDist) {
      return relX < centerX ? 'left' : 'right'
    } else {
      return relY < centerY ? 'top' : 'bottom'
    }
  }
  
  /**
   * Show preview of expansion area
   */
  private showExpansionPreview(object: CanvasObject): void {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const overlayLayer = stage.children[2] as Konva.Layer
    
    const expandSize = this.getOption('expandSize') as number
    let x = object.x
    let y = object.y
    let width = object.width
    let height = object.height
    
    // Calculate preview bounds based on direction
    switch (this.expandDirection) {
      case 'top':
        y -= expandSize
        height += expandSize
        break
      case 'right':
        width += expandSize
        break
      case 'bottom':
        height += expandSize
        break
      case 'left':
        x -= expandSize
        width += expandSize
        break
      case 'all':
        x -= expandSize
        y -= expandSize
        width += expandSize * 2
        height += expandSize * 2
        break
    }
    
    // Create preview rectangle
    this.previewRect = new Konva.Rect({
      x, y, width, height,
      stroke: '#00ff00',
      strokeWidth: 2,
      dash: [10, 5],
      fill: 'rgba(0, 255, 0, 0.1)'
    })
    
    overlayLayer.add(this.previewRect)
    overlayLayer.batchDraw()
  }
  
  /**
   * Apply outpainting to object
   */
  private async applyOutpainting(object: CanvasObject): Promise<void> {
    if (!this.replicateService || object.type !== 'image') return
    
    const prompt = this.getOption('prompt') as string
    const expandSize = this.getOption('expandSize') as number
    
    this.isProcessing = true
    const canvas = this.getCanvas()
    
    try {
      // Update object to show processing state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: true,
          processingType: 'outpainting'
        }
      })
      
      // Create expanded canvas
      const expandedCanvas = await this.createExpandedCanvas(object, expandSize)
      
      // Create mask for inpainting the new areas
      const maskCanvas = await this.createExpansionMask(object, expandSize)
      
      // Convert to Replicate format
      const imageData: import('@/lib/ai/services/replicate').ImageData = {
        element: expandedCanvas,
        naturalWidth: expandedCanvas.width,
        naturalHeight: expandedCanvas.height
      }
      
      const maskData: import('@/lib/ai/services/replicate').ImageData = {
        element: maskCanvas,
        naturalWidth: maskCanvas.width,
        naturalHeight: maskCanvas.height
      }
      
      // Use inpainting to fill the expanded areas
      const result = await this.replicateService.inpaint(
        imageData,
        maskData,
        prompt || 'seamlessly extend the image, maintaining style and continuity'
      )
      
      // Calculate new position based on expansion direction
      let newX = object.x
      let newY = object.y
      
      if (this.expandDirection === 'left' || this.expandDirection === 'all') {
        newX -= expandSize
      }
      if (this.expandDirection === 'top' || this.expandDirection === 'all') {
        newY -= expandSize
      }
      
      // Update object with expanded image
      await canvas.updateObject(object.id, {
        x: newX,
        y: newY,
        width: expandedCanvas.width,
        height: expandedCanvas.height,
        data: {
          element: result.element,
          naturalWidth: result.naturalWidth,
          naturalHeight: result.naturalHeight
        } as import('@/lib/editor/objects/types').ImageData,
        metadata: {
          ...object.metadata,
          isProcessing: false,
          lastOutpainting: new Date().toISOString(),
          outpaintingDirection: this.expandDirection,
          outpaintingSize: expandSize
        }
      })
      
      // Emit success event
      if (this.executionContext) {
        await this.executionContext.emit({
          type: 'ai.outpainting.completed',
          objectId: object.id,
          direction: this.expandDirection,
          expandSize
        } as any)
      }
      
    } catch (error) {
      console.error('[OutpaintingTool] Outpainting failed:', error)
      
      // Update object to remove processing state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: false,
          lastError: error instanceof Error ? error.message : 'Outpainting failed'
        }
      })
      
    } finally {
      this.isProcessing = false
      this.cleanupPreview()
    }
  }
  
  /**
   * Create expanded canvas with original image
   */
  private async createExpandedCanvas(
    object: CanvasObject, 
    expandSize: number
  ): Promise<HTMLCanvasElement> {
    const imageData = object.data as unknown as import('@/lib/editor/objects/types').ImageData
    const originalImage = imageData.element
    
    // Calculate new dimensions
    let newWidth = object.width
    let newHeight = object.height
    let offsetX = 0
    let offsetY = 0
    
    switch (this.expandDirection) {
      case 'top':
        newHeight += expandSize
        offsetY = expandSize
        break
      case 'right':
        newWidth += expandSize
        break
      case 'bottom':
        newHeight += expandSize
        break
      case 'left':
        newWidth += expandSize
        offsetX = expandSize
        break
      case 'all':
        newWidth += expandSize * 2
        newHeight += expandSize * 2
        offsetX = expandSize
        offsetY = expandSize
        break
    }
    
    // Create expanded canvas
    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    const ctx = canvas.getContext('2d')!
    
    // Fill with neutral color
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, newWidth, newHeight)
    
    // Draw original image
    ctx.drawImage(originalImage, offsetX, offsetY, object.width, object.height)
    
    return canvas
  }
  
  /**
   * Create mask for expansion areas
   */
  private async createExpansionMask(
    object: CanvasObject, 
    expandSize: number
  ): Promise<HTMLCanvasElement> {
    // Calculate dimensions (same as expanded canvas)
    let newWidth = object.width
    let newHeight = object.height
    let offsetX = 0
    let offsetY = 0
    
    switch (this.expandDirection) {
      case 'top':
        newHeight += expandSize
        offsetY = expandSize
        break
      case 'right':
        newWidth += expandSize
        break
      case 'bottom':
        newHeight += expandSize
        break
      case 'left':
        newWidth += expandSize
        offsetX = expandSize
        break
      case 'all':
        newWidth += expandSize * 2
        newHeight += expandSize * 2
        offsetX = expandSize
        offsetY = expandSize
        break
    }
    
    // Create mask canvas
    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    const ctx = canvas.getContext('2d')!
    
    // Fill entire canvas with white (areas to inpaint)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, newWidth, newHeight)
    
    // Draw black rectangle where original image is (areas to keep)
    ctx.fillStyle = 'black'
    ctx.fillRect(offsetX, offsetY, object.width, object.height)
    
    return canvas
  }
  
  /**
   * Get object at a specific point
   */
  private async getObjectAtPoint(point: { x: number; y: number }): Promise<CanvasObject | null> {
    const canvas = this.getCanvas()
    const objects = canvas.getAllObjects()
    
    // Check objects in reverse order (top to bottom)
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      if (!obj.visible || obj.locked) continue
      
      // Check if point is within object bounds
      if (point.x >= obj.x && point.x <= obj.x + obj.width &&
          point.y >= obj.y && point.y <= obj.y + obj.height) {
        return obj
      }
    }
    
    return null
  }
  
  /**
   * Clean up preview
   */
  private cleanupPreview(): void {
    if (this.previewRect) {
      this.previewRect.destroy()
      this.previewRect = null
      
      const canvas = this.getCanvas()
      const stage = canvas.konvaStage
      const overlayLayer = stage.children[2] as Konva.Layer
      overlayLayer.batchDraw()
    }
  }
  
  /**
   * Apply outpainting for AI operations
   */
  async applyWithContext(
    direction: 'top' | 'right' | 'bottom' | 'left' | 'all',
    expandSize: number,
    prompt?: string,
    targetObject?: CanvasObject
  ): Promise<void> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    // Set options
    this.expandDirection = direction
    this.setOption('direction', direction)
    this.setOption('expandSize', expandSize)
    if (prompt) {
      this.setOption('prompt', prompt)
    }
    
    // Get target object
    const target = targetObject || this.getTargetObject()
    if (!target || target.type !== 'image') {
      throw new Error('Outpainting requires an image object')
    }
    
    // Apply outpainting
    await this.applyOutpainting(target)
  }
}

// Export singleton instance
export const outpaintingTool = new OutpaintingTool() 