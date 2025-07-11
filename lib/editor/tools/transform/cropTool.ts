import { Crop } from 'lucide-react'
import { TOOL_IDS, ASPECT_RATIOS } from '@/constants'
import type { Canvas } from 'fabric'
import { Rect } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import type { Point } from '../utils/constraints'
import { CropCommand } from '@/lib/editor/commands/canvas'
import { markAsSystemObject } from '@/lib/editor/utils/systemObjects'
import { SystemObjectType } from '@/types/fabric'

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
      const event = e as { e: MouseEvent }
      this.handleMouseDown(event)
    })
    
    this.addCanvasEvent('mouse:move', (e: unknown) => {
      const event = e as { e: MouseEvent }
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
  private handleMouseDown(e: { e: MouseEvent }): void {
    if (!this.canvas || this.state.get('disabled')) return
    
    this.track('startCrop', () => {
      let cropRect = this.state.get('cropRect')
      
      if (!cropRect) {
        // Create crop rectangle with top-left origin
        cropRect = new Rect({
          fill: 'rgba(0,0,0,0.3)',
          stroke: '#ffffff',
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          visible: false,
          hasRotatingPoint: false,
          transparentCorners: false,
          cornerColor: 'white',
          cornerStrokeColor: 'black',
          borderColor: 'white',
          borderDashArray: [5, 5],
          lockRotation: true,
          originX: 'left',
          originY: 'top',
          scaleX: 1,
          scaleY: 1,
          lockScalingX: true,
          lockScalingY: true,
          strokeUniform: true,
          objectCaching: false
        })
        
        // Mark as system object
        markAsSystemObject(cropRect, SystemObjectType.CROP_OVERLAY)
        
        this.canvas!.add(cropRect)
        this.state.set('cropRect', cropRect)
      }
      
      // Use Fabric's getPointer method to get the correct coordinates
      const pointer = this.canvas!.getPointer(e.e)
      const point = { x: pointer.x, y: pointer.y }
      
      // Set initial position and size
      cropRect.set({
        left: point.x,
        top: point.y,
        width: 2,  // Start with 2 instead of 1
        height: 2,  // Start with 2 instead of 1
        visible: true
      })
      
      // Ensure scale is 1
      cropRect.scaleX = 1
      cropRect.scaleY = 1
      
      this.state.set('startPoint', point)
      this.state.set('isDrawing', true)
      
      this.canvas!.setActiveObject(cropRect)
      this.canvas!.renderAll()
    })
  }
  
  /**
   * Handle mouse move - update crop
   */
  private handleMouseMove(e: { e: MouseEvent }): void {
    if (!this.canvas || !this.state.get('isDrawing')) return
    
    const cropRect = this.state.get('cropRect')
    const startPoint = this.state.get('startPoint')
    
    if (!cropRect || !startPoint || this.state.get('disabled')) return
    
    this.track('updateCrop', () => {
      // Use Fabric's getPointer method to get the correct coordinates
      const pointer = this.canvas!.getPointer(e.e)
      const point = { x: pointer.x, y: pointer.y }
      
      // Calculate bounds ensuring positive width/height
      const left = Math.min(startPoint.x, point.x)
      const top = Math.min(startPoint.y, point.y)
      const width = Math.abs(point.x - startPoint.x)
      const height = Math.abs(point.y - startPoint.y)
      
      // Handle aspect ratio if shift is held
      const aspectRatioValue = this.aspectRatio
      const ratio = aspectRatioValue && aspectRatioValue !== 'free' 
        ? ASPECT_RATIOS[aspectRatioValue as keyof typeof ASPECT_RATIOS] 
        : null
      
      let finalWidth = width
      let finalHeight = height
      
      if (ratio && e.e.shiftKey && width > 0 && height > 0) {
        if (width > height) {
          finalHeight = width / ratio
        } else {
          finalWidth = height * ratio
        }
      }
      
      // Update rectangle with top-left origin
      cropRect.set({
        left: left,
        top: top,
        width: finalWidth,
        height: finalHeight
      })
      
      // Force scale to be 1
      cropRect.scaleX = 1
      cropRect.scaleY = 1
      
      // Update the object's coordinates
      cropRect.setCoords()
      
      // Debug the actual values being set
      if (finalWidth > 10 && finalHeight > 10) {
        console.log('[CropTool] Setting crop rect:', {
          left,
          top,
          width: finalWidth,
          height: finalHeight,
          scaleX: cropRect.scaleX,
          scaleY: cropRect.scaleY
        })
      }
      
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
      
      if (objects.length === 0) {
        console.warn('[CropTool] No objects to crop')
        return
      }
      
      // Get the crop bounds - these are already in canvas coordinates
      const cropLeft = cropRect.left!
      const cropTop = cropRect.top!
      const cropWidth = cropRect.width!
      const cropHeight = cropRect.height!
      
      console.log('[CropTool] Final crop bounds:', {
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight
      })
      
      // Validate crop bounds
      const canvasWidth = this.canvas!.getWidth()
      const canvasHeight = this.canvas!.getHeight()
      
      if (cropLeft < 0 || cropTop < 0 || 
          cropLeft + cropWidth > canvasWidth || 
          cropTop + cropHeight > canvasHeight) {
        console.warn('[CropTool] Crop bounds exceed canvas dimensions')
      }
      
      // Remove crop rect first
      this.canvas!.remove(cropRect)
      this.state.set('cropRect', null)
      
      // Create and execute crop command
      const command = new CropCommand(this.canvas!, {
        left: Math.max(0, cropLeft),
        top: Math.max(0, cropTop),
        width: Math.min(cropWidth, canvasWidth - Math.max(0, cropLeft)),
        height: Math.min(cropHeight, canvasHeight - Math.max(0, cropTop))
      })
      
      await this.executeCommand(command)
      
      this.canvas!.renderAll()
      this.state.set('disabled', true)
    })
  }
}

// Export singleton instance
export const cropTool = new CropTool() 