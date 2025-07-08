import { Crop } from 'lucide-react'
import { TOOL_IDS, ASPECT_RATIOS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { Rect } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import type { Point } from '../utils/constraints'

// Crop tool state
type CropToolState = {
  isDrawing: boolean
  startPoint: Point | null
  cropRect: Rect | null
  disabled: boolean
}

/**
 * Crop Tool - Allows cropping the canvas content
 * Extends BaseTool for consistent tool behavior
 */
class CropTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.CROP
  name = 'Crop Tool'
  icon = Crop
  cursor = 'crosshair'
  shortcut = 'C'
  
  // Encapsulated state
  private state = createToolState<CropToolState>({
    isDrawing: false,
    startPoint: null,
    cropRect: null,
    disabled: false
  })
  
  /**
   * Get aspect ratio from options
   */
  private get aspectRatio(): string {
    return this.toolOptionsStore.getOptionValue<string>(this.id, 'aspectRatio') ?? 'free'
  }
  
  /**
   * Tool setup
   */
  protected setupTool(canvas: Canvas): void {
    // Set cursor
    canvas.defaultCursor = 'crosshair'
    
    // Reset disabled state
    this.state.set('disabled', false)
    
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      const event = e as { e: MouseEvent; scenePoint: Point }
      this.handleMouseDown(event)
    })
    
    this.addCanvasEvent('mouse:move', (e: unknown) => {
      const event = e as { e: MouseEvent; scenePoint: Point }
      this.handleMouseMove(event)
    })
    
    this.addCanvasEvent('mouse:up', () => this.handleMouseUp())
    
    // Add keyboard listeners for Enter/Escape
    this.addEventListener(window, 'keydown', this.handleKeyDown.bind(this))
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up crop rect
    const cropRect = this.state.get('cropRect')
    if (cropRect && canvas.contains(cropRect)) {
      canvas.remove(cropRect)
    }
    
    // Reset state
    this.state.reset()
    
    // Reset cursor
    canvas.defaultCursor = 'default'
    canvas.renderAll()
  }
  
  /**
   * Handle mouse down - start crop
   */
  private handleMouseDown(e: { e: MouseEvent; scenePoint: Point }): void {
    if (!this.canvas || this.state.get('disabled')) return
    
    this.track('startCrop', () => {
      let cropRect = this.state.get('cropRect')
      
      if (!cropRect) {
        // Create crop rectangle if it doesn't exist
        cropRect = new Rect({
          fill: 'rgba(0,0,0,0.3)',
          stroke: '#ffffff',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          visible: false,
          hasRotatingPoint: false,
          transparentCorners: false,
          cornerColor: 'white',
          cornerStrokeColor: 'black',
          borderColor: 'white',
          borderDashArray: [5, 5],
          lockRotation: true
        })
        this.canvas!.add(cropRect)
        this.state.set('cropRect', cropRect)
      }
      
      const point = { x: e.scenePoint.x, y: e.scenePoint.y }
      
      cropRect.set({
        width: 2,
        height: 2,
        left: point.x,
        top: point.y,
        visible: true
      })
      
      this.state.set('startPoint', point)
      this.state.set('isDrawing', true)
      
      this.canvas!.setActiveObject(cropRect)
      this.canvas!.renderAll()
    })
  }
  
  /**
   * Handle mouse move - update crop
   */
  private handleMouseMove(e: { e: MouseEvent; scenePoint: Point }): void {
    if (!this.canvas || !this.state.get('isDrawing')) return
    
    const cropRect = this.state.get('cropRect')
    const startPoint = this.state.get('startPoint')
    
    if (!cropRect || !startPoint || this.state.get('disabled')) return
    
    this.track('updateCrop', () => {
      const point = { x: e.scenePoint.x, y: e.scenePoint.y }
      
      let width = point.x - startPoint.x
      let height = point.y - startPoint.y
      
      // Handle negative dimensions (dragging left/up)
      let left = startPoint.x
      let top = startPoint.y
      
      if (width < 0) {
        left = point.x
        width = Math.abs(width)
      }
      
      if (height < 0) {
        top = point.y
        height = Math.abs(height)
      }
      
      // Handle aspect ratio if shift is held
      const aspectRatioValue = this.aspectRatio
      const ratio = aspectRatioValue && aspectRatioValue !== 'free' 
        ? ASPECT_RATIOS[aspectRatioValue as keyof typeof ASPECT_RATIOS] 
        : null
      
      if (ratio && e.e.shiftKey) {
        if (width > height) {
          height = width / ratio
        } else {
          width = height * ratio
        }
      }
      
      cropRect.set({
        left: left,
        top: top,
        width: width,
        height: height
      })
      
      this.canvas!.renderAll()
    })
  }
  
  /**
   * Handle mouse up - end drawing
   */
  private handleMouseUp(): void {
    this.state.set('isDrawing', false)
    this.state.set('startPoint', null)
  }
  
  /**
   * Handle keyboard events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const cropRect = this.state.get('cropRect')
    
    // Enter key applies the crop
    if (e.key === 'Enter' && cropRect && cropRect.visible && this.canvas) {
      this.applyCrop()
    }
    
    // Escape key cancels the crop
    if (e.key === 'Escape' && cropRect && this.canvas) {
      this.canvas.remove(cropRect)
      this.state.set('cropRect', null)
      this.state.set('disabled', false)
      this.canvas.renderAll()
    }
  }
  
  /**
   * Apply the crop
   */
  private applyCrop(): void {
    if (!this.canvas) return
    
    const cropRect = this.state.get('cropRect')
    if (!cropRect) return
    
    this.trackAsync('applyCrop', async () => {
      // Get all objects on canvas except the crop rect
      const objects = this.canvas!.getObjects().filter(obj => obj !== cropRect)
      
      if (objects.length === 0) return
      
      // Get crop rect bounds
      const cropLeft = cropRect.left!
      const cropTop = cropRect.top!
      const cropWidth = cropRect.width! * cropRect.scaleX!
      const cropHeight = cropRect.height! * cropRect.scaleY!
      
      // Remove crop rect
      this.canvas!.remove(cropRect)
      
      // Apply clipPath to each object
      objects.forEach((obj: FabricObject) => {
        // Create a clip rectangle
        const clipRect = new Rect({
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight,
          absolutePositioned: true
        })
        
        obj.clipPath = clipRect
      })
      
      // Calculate scale factor to fit canvas
      const scaleX = this.canvas!.width! / cropWidth
      const scaleY = this.canvas!.height! / cropHeight
      const scale = Math.min(scaleX, scaleY)
      
      // Apply transformation to fit the cropped area to canvas
      objects.forEach((obj: FabricObject) => {
        // Scale the object
        obj.scale(obj.scaleX! * scale)
        
        // Reposition the object
        obj.set({
          left: ((obj.left || 0) - cropLeft) * scale,
          top: ((obj.top || 0) - cropTop) * scale
        })
        
        obj.setCoords()
      })
      
      // Optionally resize canvas to maintain aspect ratio
      if (scaleX !== scaleY) {
        this.canvas!.setDimensions({
          width: cropWidth * scale,
          height: cropHeight * scale
        })
      }
      
      // TODO: Create and execute a CropCommand when command system is implemented
      console.log('Crop applied:', {
        bounds: { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight },
        scale: scale
      })
      
      this.canvas!.renderAll()
      this.state.set('disabled', true)
    })
  }
}

// Export singleton instance
export const cropTool = new CropTool() 