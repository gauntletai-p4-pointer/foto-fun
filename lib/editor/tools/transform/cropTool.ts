import { Crop } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS, ASPECT_RATIOS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, Rect } from '@/lib/editor/canvas/types'
import { CanvasCroppedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Crop Tool - Allows cropping the canvas content
 * Konva implementation with non-destructive cropping
 */
export class CropTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.CROP
  name = 'Crop Tool'
  icon = Crop
  cursor = 'crosshair'
  shortcut = 'C'
  
  // Crop state
  private isDrawing = false
  private startPoint: Point | null = null
  private cropRect: Konva.Rect | null = null
  private cropOverlay: Konva.Group | null = null
  private overlayLayer: Konva.Layer | null = null
  private disabled = false
  
  // Interactive handles
  private handles: Konva.Rect[] = []
  private activeHandle: Konva.Rect | null = null
  private handleType: string | null = null
  private isDraggingHandle = false
  
  // Rotation
  private rotation = 0
  private rotationHandle: Konva.Circle | null = null
  private isRotating = false
  
  // Grid overlay
  private gridOverlay: Konva.Group | null = null
  private currentOverlayType: 'none' | 'thirds' | 'grid' | 'golden' = 'thirds'
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create overlay layer for crop visualization
    this.overlayLayer = new Konva.Layer()
    canvas.konvaStage.add(this.overlayLayer)
    this.overlayLayer.moveToTop()
    
    // Set default options
    this.setOption('aspectRatio', 'free')
    this.setOption('deletePixels', false)
    this.setOption('overlayType', 'thirds')
    this.setOption('shieldOpacity', 0.5)
    this.setOption('shieldColor', '#000000')
    
    // Reset state
    this.disabled = false
    this.rotation = 0
    this.currentOverlayType = 'thirds'
  }
  
  protected cleanupTool(): void {
    // Clean up overlay
    if (this.cropOverlay) {
      this.cropOverlay.destroy()
      this.cropOverlay = null
    }
    
    if (this.cropRect) {
      this.cropRect.destroy()
      this.cropRect = null
    }
    
    if (this.gridOverlay) {
      this.gridOverlay.destroy()
      this.gridOverlay = null
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.destroy()
      this.overlayLayer = null
    }
    
    // Clean up handles
    this.handles.forEach(handle => handle.destroy())
    this.handles = []
    
    if (this.rotationHandle) {
      this.rotationHandle.destroy()
      this.rotationHandle = null
    }
    
    // Reset state
    this.isDrawing = false
    this.startPoint = null
    this.disabled = false
    this.activeHandle = null
    this.handleType = null
    this.isDraggingHandle = false
    this.isRotating = false
    this.rotation = 0
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (!this.overlayLayer || this.disabled) return
    
    this.isDrawing = true
    this.startPoint = { x: event.point.x, y: event.point.y }
    
    // Remove existing crop overlay if any
    if (this.cropOverlay) {
      this.cropOverlay.destroy()
    }
    
    // Create crop overlay group
    this.cropOverlay = new Konva.Group()
    this.overlayLayer.add(this.cropOverlay)
    
    // Create semi-transparent overlay for areas outside crop
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Create dark overlay rectangles
    const topOverlay = new Konva.Rect({
      x: 0,
      y: 0,
      width: stage.width(),
      height: event.point.y,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    const bottomOverlay = new Konva.Rect({
      x: 0,
      y: event.point.y,
      width: stage.width(),
      height: stage.height() - event.point.y,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    const leftOverlay = new Konva.Rect({
      x: 0,
      y: event.point.y,
      width: event.point.x,
      height: 0,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    const rightOverlay = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: stage.width() - event.point.x,
      height: 0,
      fill: 'rgba(0, 0, 0, 0.5)'
    })
    
    this.cropOverlay.add(topOverlay, bottomOverlay, leftOverlay, rightOverlay)
    
    // Create crop rectangle with dashed border
    this.cropRect = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: '#ffffff',
      strokeWidth: 2,
      dash: [5, 5],
      listening: false
    })
    
    this.cropOverlay.add(this.cropRect)
    this.overlayLayer.batchDraw()
  }
  
  onMouseMove(event: ToolEvent): void {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Handle rotation
    if (this.isRotating && this.cropRect) {
      const bounds = this.cropRect.getAttrs() as Rect
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      
      const angle = Math.atan2(event.point.y - centerY, event.point.x - centerX)
      this.rotation = angle * 180 / Math.PI + 90
      
      if (this.cropOverlay) {
        this.cropOverlay.rotation(this.rotation)
        this.cropOverlay.x(centerX)
        this.cropOverlay.y(centerY)
        this.cropOverlay.offsetX(centerX - bounds.x)
        this.cropOverlay.offsetY(centerY - bounds.y)
      }
      
      this.overlayLayer?.batchDraw()
      return
    }
    
    // Handle dragging handles
    if (this.isDraggingHandle && this.activeHandle && this.handleType && this.cropRect) {
      this.updateCropBoundsFromHandle(event.point)
      return
    }
    
    // Regular crop drawing
    if (!this.isDrawing || !this.startPoint || !this.cropRect || !this.cropOverlay || this.disabled) return
    
    // Calculate bounds
    const bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Apply aspect ratio if shift is held
    const aspectRatio = this.getOption('aspectRatio') as string
    if (event.shiftKey && aspectRatio && aspectRatio !== 'free') {
      const ratio = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS]
      if (ratio) {
        if (bounds.width > bounds.height) {
          bounds.height = bounds.width / ratio
        } else {
          bounds.width = bounds.height * ratio
        }
        
        // Adjust position based on drag direction
        if (event.point.x < this.startPoint.x) {
          bounds.x = this.startPoint.x - bounds.width
        }
        if (event.point.y < this.startPoint.y) {
          bounds.y = this.startPoint.y - bounds.height
        }
      }
    }
    
    // Update crop rectangle
    this.cropRect.setAttrs(bounds)
    
    // Update overlay rectangles
    const overlays = this.cropOverlay.getChildren()
    
    // Top overlay
    overlays[0].setAttrs({
      x: 0,
      y: 0,
      width: stage.width(),
      height: bounds.y
    })
    
    // Bottom overlay
    overlays[1].setAttrs({
      x: 0,
      y: bounds.y + bounds.height,
      width: stage.width(),
      height: stage.height() - (bounds.y + bounds.height)
    })
    
    // Left overlay
    overlays[2].setAttrs({
      x: 0,
      y: bounds.y,
      width: bounds.x,
      height: bounds.height
    })
    
    // Right overlay
    overlays[3].setAttrs({
      x: bounds.x + bounds.width,
      y: bounds.y,
      width: stage.width() - (bounds.x + bounds.width),
      height: bounds.height
    })
    
    this.overlayLayer?.batchDraw()
  }
  
  async onMouseUp(_event: ToolEvent): Promise<void> {
    // Handle rotation end
    if (this.isRotating) {
      this.isRotating = false
      const stage = this.getCanvas().konvaStage
      stage.container().style.cursor = this.cursor
      return
    }
    
    // Handle dragging end
    if (this.isDraggingHandle) {
      this.isDraggingHandle = false
      this.activeHandle = null
      this.handleType = null
      const stage = this.getCanvas().konvaStage
      stage.container().style.cursor = this.cursor
      return
    }
    
    // Regular drawing end
    if (!this.isDrawing) return
    
    this.isDrawing = false
    
    // Add crop handles for fine-tuning
    if (this.cropRect && this.overlayLayer) {
      const bounds = this.cropRect.getAttrs() as Rect
      
      // Only show handles if crop area is large enough
      if (bounds.width > 10 && bounds.height > 10) {
        this.addCropHandles(bounds)
      }
    }
    
    this.startPoint = null
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (!this.cropRect || !this.overlayLayer) return
    
    // Enter key applies the crop
    if (event.key === 'Enter') {
      event.preventDefault()
      this.applyCrop()
    }
    
    // Escape key cancels the crop
    if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelCrop()
    }
  }
  
  /**
   * Add interactive handles to the crop rectangle
   */
  private addCropHandles(bounds: Rect): void {
    if (!this.cropOverlay || !this.overlayLayer) return
    
    // Clear existing handles
    this.handles.forEach(handle => handle.destroy())
    this.handles = []
    
    const handleSize = 12
    const handleConfigs = [
      // Corners
      { x: bounds.x, y: bounds.y, cursor: 'nw-resize', type: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize', type: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize', type: 'se' },
      { x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize', type: 'sw' },
      // Edges
      { x: bounds.x + bounds.width / 2, y: bounds.y, cursor: 'n-resize', type: 'n' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, cursor: 'e-resize', type: 'e' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, cursor: 's-resize', type: 's' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, cursor: 'w-resize', type: 'w' }
    ]
    
    handleConfigs.forEach(config => {
      const handle = new Konva.Rect({
        x: config.x - handleSize / 2,
        y: config.y - handleSize / 2,
        width: handleSize,
        height: handleSize,
        fill: 'white',
        stroke: '#333',
        strokeWidth: 2,
        cornerRadius: 2,
        shadowBlur: 2,
        shadowOpacity: 0.3
      })
      
      // Store handle type as custom attribute
      handle.setAttr('handleType', config.type)
      handle.setAttr('cursor', config.cursor)
      
      // Handle events
      handle.on('mouseenter', () => {
        const stage = this.getCanvas().konvaStage
        stage.container().style.cursor = config.cursor
        handle.fill('#007AFF')
        this.overlayLayer?.batchDraw()
      })
      
      handle.on('mouseleave', () => {
        if (!this.isDraggingHandle) {
          const stage = this.getCanvas().konvaStage
          stage.container().style.cursor = this.cursor
          handle.fill('white')
          this.overlayLayer?.batchDraw()
        }
      })
      
      handle.on('mousedown', (e) => {
        e.cancelBubble = true
        this.activeHandle = handle
        this.handleType = config.type
        this.isDraggingHandle = true
      })
      
      this.handles.push(handle)
      this.cropOverlay!.add(handle)
    })
    
    // Add rotation handle
    this.addRotationHandle(bounds)
    
    // Add grid overlay
    this.updateGridOverlay(bounds)
    
    this.overlayLayer.batchDraw()
  }
  
  /**
   * Add rotation handle outside the crop area
   */
  private addRotationHandle(bounds: Rect): void {
    if (!this.cropOverlay || !this.overlayLayer) return
    
    if (this.rotationHandle) {
      this.rotationHandle.destroy()
    }
    
    // Position rotation handle above the top edge
    const rotationHandleY = bounds.y - 30
    
    this.rotationHandle = new Konva.Circle({
      x: bounds.x + bounds.width / 2,
      y: rotationHandleY,
      radius: 8,
      fill: 'white',
      stroke: '#333',
      strokeWidth: 2,
      shadowBlur: 2,
      shadowOpacity: 0.3
    })
    
    this.rotationHandle.on('mouseenter', () => {
      const stage = this.getCanvas().konvaStage
      stage.container().style.cursor = 'grab'
      this.rotationHandle?.fill('#007AFF')
      this.overlayLayer?.batchDraw()
    })
    
    this.rotationHandle.on('mouseleave', () => {
      if (!this.isRotating) {
        const stage = this.getCanvas().konvaStage
        stage.container().style.cursor = this.cursor
        this.rotationHandle?.fill('white')
        this.overlayLayer?.batchDraw()
      }
    })
    
    this.rotationHandle.on('mousedown', (e) => {
      e.cancelBubble = true
      this.isRotating = true
      const stage = this.getCanvas().konvaStage
      stage.container().style.cursor = 'grabbing'
    })
    
    this.cropOverlay.add(this.rotationHandle)
  }
  
  /**
   * Update grid overlay based on current option
   */
  private updateGridOverlay(bounds: Rect): void {
    if (!this.cropOverlay || !this.overlayLayer) return
    
    // Remove existing grid
    if (this.gridOverlay) {
      this.gridOverlay.destroy()
    }
    
    const overlayType = this.getOption('overlayType') as string || 'thirds'
    if (overlayType === 'none') return
    
    this.gridOverlay = new Konva.Group()
    
    const lineConfig = {
      stroke: 'rgba(255, 255, 255, 0.5)',
      strokeWidth: 1,
      listening: false
    }
    
    switch (overlayType) {
      case 'thirds': {
        // Rule of thirds
        const thirdW = bounds.width / 3
        const thirdH = bounds.height / 3
        
        // Vertical lines
        for (let i = 1; i <= 2; i++) {
          this.gridOverlay.add(new Konva.Line({
            points: [bounds.x + thirdW * i, bounds.y, bounds.x + thirdW * i, bounds.y + bounds.height],
            ...lineConfig
          }))
        }
        
        // Horizontal lines
        for (let i = 1; i <= 2; i++) {
          this.gridOverlay.add(new Konva.Line({
            points: [bounds.x, bounds.y + thirdH * i, bounds.x + bounds.width, bounds.y + thirdH * i],
            ...lineConfig
          }))
        }
        break
      }
      
      case 'grid': {
        // Grid pattern
        const gridSize = 50
        const cols = Math.floor(bounds.width / gridSize)
        const rows = Math.floor(bounds.height / gridSize)
        
        // Vertical lines
        for (let i = 1; i <= cols; i++) {
          this.gridOverlay.add(new Konva.Line({
            points: [bounds.x + gridSize * i, bounds.y, bounds.x + gridSize * i, bounds.y + bounds.height],
            ...lineConfig
          }))
        }
        
        // Horizontal lines
        for (let i = 1; i <= rows; i++) {
          this.gridOverlay.add(new Konva.Line({
            points: [bounds.x, bounds.y + gridSize * i, bounds.x + bounds.width, bounds.y + gridSize * i],
            ...lineConfig
          }))
        }
        break
      }
      
      case 'golden': {
        // Golden ratio
        const goldenRatio = 1.618
        const goldenW = bounds.width / goldenRatio
        const goldenH = bounds.height / goldenRatio
        
        // Vertical lines
        this.gridOverlay.add(new Konva.Line({
          points: [bounds.x + goldenW, bounds.y, bounds.x + goldenW, bounds.y + bounds.height],
          ...lineConfig
        }))
        this.gridOverlay.add(new Konva.Line({
          points: [bounds.x + bounds.width - goldenW, bounds.y, bounds.x + bounds.width - goldenW, bounds.y + bounds.height],
          ...lineConfig
        }))
        
        // Horizontal lines
        this.gridOverlay.add(new Konva.Line({
          points: [bounds.x, bounds.y + goldenH, bounds.x + bounds.width, bounds.y + goldenH],
          ...lineConfig
        }))
        this.gridOverlay.add(new Konva.Line({
          points: [bounds.x, bounds.y + bounds.height - goldenH, bounds.x + bounds.width, bounds.y + bounds.height - goldenH],
          ...lineConfig
        }))
        break
      }
    }
    
    this.cropOverlay.add(this.gridOverlay)
    this.currentOverlayType = overlayType as 'none' | 'thirds' | 'grid' | 'golden'
  }
  
  /**
   * Update crop bounds based on handle dragging
   */
  private updateCropBoundsFromHandle(mousePoint: Point): void {
    if (!this.cropRect || !this.handleType) return
    
    const bounds = { ...(this.cropRect.getAttrs() as Rect) }
    const aspectRatio = this.getOption('aspectRatio') as string
    let maintainRatio = aspectRatio !== 'free'
    let ratio = 1
    
    if (maintainRatio && aspectRatio in ASPECT_RATIOS) {
      ratio = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] || 1
    }
    
    // Update bounds based on handle type
    switch (this.handleType) {
      case 'nw':
        bounds.width += bounds.x - mousePoint.x
        bounds.height += bounds.y - mousePoint.y
        bounds.x = mousePoint.x
        bounds.y = mousePoint.y
        break
      case 'ne':
        bounds.width = mousePoint.x - bounds.x
        bounds.height += bounds.y - mousePoint.y
        bounds.y = mousePoint.y
        break
      case 'se':
        bounds.width = mousePoint.x - bounds.x
        bounds.height = mousePoint.y - bounds.y
        break
      case 'sw':
        bounds.width += bounds.x - mousePoint.x
        bounds.height = mousePoint.y - bounds.y
        bounds.x = mousePoint.x
        break
      case 'n':
        bounds.height += bounds.y - mousePoint.y
        bounds.y = mousePoint.y
        maintainRatio = false
        break
      case 'e':
        bounds.width = mousePoint.x - bounds.x
        maintainRatio = false
        break
      case 's':
        bounds.height = mousePoint.y - bounds.y
        maintainRatio = false
        break
      case 'w':
        bounds.width += bounds.x - mousePoint.x
        bounds.x = mousePoint.x
        maintainRatio = false
        break
    }
    
    // Apply aspect ratio constraint
    if (maintainRatio && ratio) {
      if (this.handleType.includes('e') || this.handleType.includes('w')) {
        bounds.height = bounds.width / ratio
      } else {
        bounds.width = bounds.height * ratio
      }
    }
    
    // Ensure minimum size
    bounds.width = Math.max(20, bounds.width)
    bounds.height = Math.max(20, bounds.height)
    
    // Update crop rectangle
    this.cropRect.setAttrs(bounds)
    
    // Update overlays
    this.updateOverlays(bounds)
    
    // Update handles and grid
    this.addCropHandles(bounds)
    
    this.overlayLayer?.batchDraw()
  }
  
  /**
   * Update overlay rectangles
   */
  private updateOverlays(bounds: Rect): void {
    if (!this.cropOverlay) return
    
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const overlays = this.cropOverlay.getChildren().filter(child => 
      child !== this.cropRect && 
      !this.handles.includes(child as Konva.Rect) && 
      (!this.rotationHandle || child !== this.rotationHandle) &&
      (!this.gridOverlay || child !== this.gridOverlay)
    )
    
    if (overlays.length >= 4) {
      // Top overlay
      overlays[0].setAttrs({
        x: 0,
        y: 0,
        width: stage.width(),
        height: bounds.y
      })
      
      // Bottom overlay
      overlays[1].setAttrs({
        x: 0,
        y: bounds.y + bounds.height,
        width: stage.width(),
        height: stage.height() - (bounds.y + bounds.height)
      })
      
      // Left overlay
      overlays[2].setAttrs({
        x: 0,
        y: bounds.y,
        width: bounds.x,
        height: bounds.height
      })
      
      // Right overlay
      overlays[3].setAttrs({
        x: bounds.x + bounds.width,
        y: bounds.y,
        width: stage.width() - (bounds.x + bounds.width),
        height: bounds.height
      })
    }
  }
  
  /**
   * Apply the crop operation
   */
  private async applyCrop(): Promise<void> {
    if (!this.cropRect || this.disabled) return
    
    const canvas = this.getCanvas()
    const bounds = this.cropRect.getAttrs() as Rect
    
    // Validate bounds
    if (bounds.width < 1 || bounds.height < 1) {
      console.warn('[CropTool] Invalid crop bounds')
      return
    }
    
    // Get current canvas bounds for the event
    const previousBounds: Rect = {
      x: 0,
      y: 0,
      width: canvas.state.width,
      height: canvas.state.height
    }
    
    // Apply the crop
    await canvas.crop(bounds)
    
    // Emit event if in ExecutionContext
    if (this.executionContext) {
      await this.executionContext.emit(new CanvasCroppedEvent(
        'canvas',
        previousBounds,
        bounds,
        this.executionContext.getMetadata()
      ))
    }
    
    // Clean up
    this.cancelCrop()
    this.disabled = true
  }
  
  /**
   * Cancel the crop operation
   */
  private cancelCrop(): void {
    if (this.cropOverlay) {
      this.cropOverlay.destroy()
      this.cropOverlay = null
    }
    
    if (this.cropRect) {
      this.cropRect = null
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.batchDraw()
    }
    
    this.disabled = false
  }
  
  protected onOptionChange(key: string, _value: unknown): void {
    // Handle aspect ratio changes during crop
    if (key === 'aspectRatio' && this.cropRect && this.isDrawing) {
      // Could update the crop rectangle to match new aspect ratio
    }
  }
}

// Export singleton instance
export const cropTool = new CropTool() 