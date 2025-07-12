import { Crop } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS, ASPECT_RATIOS } from '@/constants'
import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point, Rect } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Crop Tool - Crop individual objects (images)
 * Non-destructive cropping with visual preview
 */
export class CropTool extends ObjectTool {
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
  private targetObject: CanvasObject | null = null
  private originalBounds: Rect | null = null
  
  // Interactive handles
  private handles: Konva.Rect[] = []
  private activeHandle: Konva.Rect | null = null
  private handleType: string | null = null
  private isDraggingHandle = false
  
  // Grid overlay
  private gridOverlay: Konva.Group | null = null
  private currentOverlayType: 'none' | 'thirds' | 'grid' | 'golden' = 'thirds'
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Use the existing overlay layer
    const stage = canvas.stage
    this.overlayLayer = stage.children[stage.children.length - 1] as Konva.Layer
    
    // Set default options
    this.setOption('aspectRatio', 'free')
    this.setOption('overlayType', 'thirds')
    this.setOption('shieldOpacity', 0.5)
    
    // Get selected object
    this.targetObject = this.getTargetObject()
    
    // If an image object is selected, show crop bounds
    if (this.targetObject && this.targetObject.type === 'image') {
      this.showCropBounds()
    }
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
    
    // Clean up handles
    this.handles.forEach(handle => handle.destroy())
    this.handles = []
    
    // Reset state
    this.isDrawing = false
    this.startPoint = null
    this.targetObject = null
    this.originalBounds = null
    this.activeHandle = null
    this.handleType = null
    this.isDraggingHandle = false
  }
  
  /**
   * Show crop bounds for selected object
   */
  private showCropBounds(): void {
    if (!this.targetObject || !this.overlayLayer) return
    
    // Store original bounds
    this.originalBounds = {
      x: this.targetObject.x,
      y: this.targetObject.y,
      width: this.targetObject.width,
      height: this.targetObject.height
    }
    
    // Create crop overlay
    this.createCropOverlay(this.originalBounds)
  }
  
  /**
   * Create crop overlay for the object
   */
  private createCropOverlay(bounds: Rect): void {
    if (!this.overlayLayer) return
    
    // Remove existing overlay
    if (this.cropOverlay) {
      this.cropOverlay.destroy()
    }
    
    // Create crop overlay group
    this.cropOverlay = new Konva.Group()
    this.overlayLayer.add(this.cropOverlay)
    
    // Create semi-transparent overlay around the object
    const stage = this.getCanvas().stage
    const opacity = (this.getOption('shieldOpacity') as number) || 0.5
    
    // Create dark overlay rectangles around the crop area
    const topOverlay = new Konva.Rect({
      x: 0,
      y: 0,
      width: stage.width(),
      height: bounds.y,
      fill: `rgba(0, 0, 0, ${opacity})`
    })
    
    const bottomOverlay = new Konva.Rect({
      x: 0,
      y: bounds.y + bounds.height,
      width: stage.width(),
      height: stage.height() - (bounds.y + bounds.height),
      fill: `rgba(0, 0, 0, ${opacity})`
    })
    
    const leftOverlay = new Konva.Rect({
      x: 0,
      y: bounds.y,
      width: bounds.x,
      height: bounds.height,
      fill: `rgba(0, 0, 0, ${opacity})`
    })
    
    const rightOverlay = new Konva.Rect({
      x: bounds.x + bounds.width,
      y: bounds.y,
      width: stage.width() - (bounds.x + bounds.width),
      height: bounds.height,
      fill: `rgba(0, 0, 0, ${opacity})`
    })
    
    this.cropOverlay.add(topOverlay, bottomOverlay, leftOverlay, rightOverlay)
    
    // Create crop rectangle
    this.cropRect = new Konva.Rect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      stroke: '#ffffff',
      strokeWidth: 2,
      dash: [5, 5],
      listening: false
    })
    
    this.cropOverlay.add(this.cropRect)
    
    // Add handles and grid
    this.addCropHandles(bounds)
    this.updateGridOverlay(bounds)
    
    this.overlayLayer.batchDraw()
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (!this.overlayLayer) return
    
    // Check if clicking on a different object
    const clickedObject = this.getCanvas().getObjectAtPoint(event.point)
    if (clickedObject && clickedObject !== this.targetObject && clickedObject.type === 'image') {
      // Switch to new object
      this.targetObject = clickedObject
      this.getCanvas().selectObject(clickedObject.id)
      this.showCropBounds()
      return
    }
    
    // If no crop bounds shown yet, start drawing
    if (!this.cropRect && this.targetObject) {
      this.isDrawing = true
      this.startPoint = { x: event.point.x, y: event.point.y }
      
      // Create initial crop overlay
      this.createCropOverlay({
        x: event.point.x,
        y: event.point.y,
        width: 0,
        height: 0
      })
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    // Handle dragging handles
    if (this.isDraggingHandle && this.activeHandle && this.handleType && this.cropRect) {
      this.updateCropBoundsFromHandle(event.point)
      return
    }
    
    // Handle drawing new crop area
    if (!this.isDrawing || !this.startPoint || !this.cropRect || !this.cropOverlay) return
    
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
    this.updateOverlays(bounds)
    this.overlayLayer?.batchDraw()
  }
  
  async onMouseUp(): Promise<void> {
    // Handle dragging end
    if (this.isDraggingHandle) {
      this.isDraggingHandle = false
      this.activeHandle = null
      this.handleType = null
      const stage = this.getCanvas().stage
      stage.container().style.cursor = this.cursor
      return
    }
    
    // Handle drawing end
    if (!this.isDrawing) return
    
    this.isDrawing = false
    
    // Update handles for the new bounds
    if (this.cropRect) {
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
      
      // Store handle type
      handle.setAttr('handleType', config.type)
      handle.setAttr('cursor', config.cursor)
      
      // Handle events
      handle.on('mouseenter', () => {
        const stage = this.getCanvas().stage
        stage.container().style.cursor = config.cursor
        handle.fill('#007AFF')
        this.overlayLayer?.batchDraw()
      })
      
      handle.on('mouseleave', () => {
        if (!this.isDraggingHandle) {
          const stage = this.getCanvas().stage
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
    
    this.overlayLayer.batchDraw()
  }
  
  /**
   * Update grid overlay
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
   * Update crop bounds from handle
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
    const stage = canvas.stage
    const opacity = (this.getOption('shieldOpacity') as number) || 0.5
    
    const overlays = this.cropOverlay.getChildren().filter(child => 
      child !== this.cropRect && 
      !this.handles.includes(child as Konva.Rect) &&
      (!this.gridOverlay || child !== this.gridOverlay)
    )
    
    if (overlays.length >= 4) {
      // Top overlay
      overlays[0].setAttrs({
        x: 0,
        y: 0,
        width: stage.width(),
        height: bounds.y,
        fill: `rgba(0, 0, 0, ${opacity})`
      })
      
      // Bottom overlay
      overlays[1].setAttrs({
        x: 0,
        y: bounds.y + bounds.height,
        width: stage.width(),
        height: stage.height() - (bounds.y + bounds.height),
        fill: `rgba(0, 0, 0, ${opacity})`
      })
      
      // Left overlay
      overlays[2].setAttrs({
        x: 0,
        y: bounds.y,
        width: bounds.x,
        height: bounds.height,
        fill: `rgba(0, 0, 0, ${opacity})`
      })
      
      // Right overlay
      overlays[3].setAttrs({
        x: bounds.x + bounds.width,
        y: bounds.y,
        width: stage.width() - (bounds.x + bounds.width),
        height: bounds.height,
        fill: `rgba(0, 0, 0, ${opacity})`
      })
    }
  }
  
  /**
   * Apply the crop to the selected object
   */
  private async applyCrop(): Promise<void> {
    if (!this.cropRect || !this.targetObject || this.targetObject.type !== 'image') return
    
    const canvas = this.getCanvas()
    const cropBounds = this.cropRect.getAttrs() as Rect
    
    // Validate bounds
    if (cropBounds.width < 1 || cropBounds.height < 1) {
      console.warn('[CropTool] Invalid crop bounds')
      return
    }
    
    // Calculate relative crop bounds within the object
    const relativeBounds = {
      x: cropBounds.x - this.targetObject.x,
      y: cropBounds.y - this.targetObject.y,
      width: cropBounds.width,
      height: cropBounds.height
    }
    
    // Update object with crop information
    await canvas.updateObject(this.targetObject.id, {
      // Update position to crop position
      x: cropBounds.x,
      y: cropBounds.y,
      width: cropBounds.width,
      height: cropBounds.height,
      // Store crop data in metadata
      metadata: {
        ...this.targetObject.metadata,
        crop: {
          x: relativeBounds.x,
          y: relativeBounds.y,
          width: relativeBounds.width,
          height: relativeBounds.height,
          originalWidth: this.originalBounds?.width,
          originalHeight: this.originalBounds?.height
        }
      }
    })
    
    // Clean up
    this.cancelCrop()
  }
  
  /**
   * Public method for programmatic cropping (for AI adapters)
   */
  async cropObject(
    object: CanvasObject, 
    cropBounds: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    if (object.type !== 'image') {
      throw new Error('Can only crop image objects')
    }
    
    const canvas = this.getCanvas()
    
    // Validate bounds
    if (cropBounds.width < 1 || cropBounds.height < 1) {
      throw new Error('Invalid crop bounds: width and height must be at least 1')
    }
    
    // Ensure crop bounds are within object bounds
    const maxWidth = object.width * (object.scaleX || 1)
    const maxHeight = object.height * (object.scaleY || 1)
    
    if (cropBounds.x < 0 || cropBounds.y < 0 || 
        cropBounds.x + cropBounds.width > maxWidth || 
        cropBounds.y + cropBounds.height > maxHeight) {
      throw new Error('Crop bounds exceed object dimensions')
    }
    
    // Update object with crop information
    await canvas.updateObject(object.id, {
      // Store crop information in metadata
      metadata: {
        ...object.metadata,
        crop: {
          cropX: cropBounds.x,
          cropY: cropBounds.y,
          cropWidth: cropBounds.width,
          cropHeight: cropBounds.height
        }
      },
      // Update display dimensions to match crop
      width: cropBounds.width / (object.scaleX || 1),
      height: cropBounds.height / (object.scaleY || 1)
    })
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
    
    // Clear handles
    this.handles.forEach(handle => handle.destroy())
    this.handles = []
    
    this.targetObject = null
    this.originalBounds = null
  }
  
  protected onOptionChange(key: string): void {
    // Handle option changes during crop
    if (key === 'overlayType' && this.cropRect) {
      const bounds = this.cropRect.getAttrs() as Rect
      this.updateGridOverlay(bounds)
      this.overlayLayer?.batchDraw()
    }
  }
}

// Export singleton instance
export const cropTool = new CropTool() 