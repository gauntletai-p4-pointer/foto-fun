# Selection Tools Implementation Guide

## Phase 1: Foundation Implementation

### 1. Create Base Selection Tool

```typescript
// lib/editor/tools/base/BaseSelectionTool.ts
import { BaseTool } from './BaseTool'
import { ToolEvent } from '../types'
import { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import { Point, SelectionMode } from '@/types'
import Konva from 'konva'

export abstract class BaseSelectionTool extends BaseTool {
  protected selectionManager!: SelectionManager
  protected overlayLayer!: Konva.Layer
  protected isCreating = false
  protected startPoint: Point | null = null
  protected visualFeedback: Konva.Node | null = null
  
  onActivate(canvas: CanvasManager): void {
    super.onActivate(canvas)
    this.selectionManager = canvas.selectionManager
    this.overlayLayer = canvas.overlayLayer
    
    // Show modifier hints in status bar
    this.showModifierHints()
  }
  
  onDeactivate(): void {
    this.cleanup()
    super.onDeactivate()
  }
  
  /**
   * Get selection mode based on current modifier keys
   * This is checked in real-time, not stored as state
   */
  protected getSelectionMode(event: ToolEvent): SelectionMode {
    const { shiftKey, altKey } = event
    
    if (shiftKey && altKey) return 'intersect'
    if (shiftKey) return 'add'
    if (altKey) return 'subtract'
    return 'replace'
  }
  
  /**
   * Apply constraints based on modifier keys
   */
  protected applyConstraints(
    bounds: { x: number; y: number; width: number; height: number },
    event: ToolEvent
  ): typeof bounds {
    if (!this.startPoint) return bounds
    
    let { x, y, width, height } = bounds
    
    // Shift constrains proportions (square/circle)
    if (event.shiftKey && !event.altKey) {
      const size = Math.max(width, height)
      width = height = size
      
      // Adjust position to maintain direction
      if (event.point.x < this.startPoint.x) {
        x = this.startPoint.x - size
      }
      if (event.point.y < this.startPoint.y) {
        y = this.startPoint.y - size
      }
    }
    
    // Alt draws from center
    if (event.altKey && !event.shiftKey) {
      x = this.startPoint.x - width / 2
      y = this.startPoint.y - height / 2
      width = width
      height = height
    }
    
    // Shift + Alt: constrained from center
    if (event.shiftKey && event.altKey) {
      const size = Math.max(width, height)
      width = height = size
      x = this.startPoint.x - size / 2
      y = this.startPoint.y - size / 2
    }
    
    return { x, y, width, height }
  }
  
  /**
   * Show visual hints for available modifiers
   */
  protected showModifierHints(): void {
    this.eventBus.emit({
      type: 'statusbar.hints.show',
      payload: {
        hints: [
          { key: 'Shift', action: 'Add to selection / Constrain' },
          { key: 'Alt', action: 'Subtract / From center' },
          { key: 'Shift+Alt', action: 'Intersect / Constrained center' }
        ]
      }
    })
  }
  
  /**
   * Create selection mask from bounds/shape
   */
  protected abstract createSelectionMask(data: any): ImageData
  
  /**
   * Finalize and apply the selection
   */
  protected finalizeSelection(mask: ImageData, mode: SelectionMode): void {
    this.selectionManager.applySelection(mask, mode)
    this.cleanup()
  }
  
  /**
   * Clean up any temporary visuals
   */
  protected cleanup(): void {
    this.isCreating = false
    this.startPoint = null
    
    if (this.visualFeedback) {
      this.visualFeedback.destroy()
      this.visualFeedback = null
    }
    
    this.overlayLayer.batchDraw()
  }
  
  /**
   * Update visual feedback (preview)
   */
  protected updateVisualFeedback(node: Konva.Node): void {
    if (this.visualFeedback && this.visualFeedback !== node) {
      this.visualFeedback.destroy()
    }
    
    this.visualFeedback = node
    
    if (!node.getLayer()) {
      this.overlayLayer.add(node)
    }
    
    this.overlayLayer.batchDraw()
  }
}
```

### 2. Update SelectionManager for Clean Architecture

```typescript
// lib/editor/selection/SelectionManager.ts
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { SelectionChangedEvent } from '@/lib/events/canvas/SelectionEvents'
import { PixelSelection, SelectionMode, Point } from '@/types'
import { SelectionRenderer } from './SelectionRenderer'
import { SelectionOperations } from './SelectionOperations'

export class SelectionManager {
  private selection: PixelSelection | null = null
  private renderer: SelectionRenderer
  private operations: SelectionOperations
  
  constructor(
    private canvas: any, // CanvasManager type
    private eventBus: TypedEventBus
  ) {
    this.renderer = new SelectionRenderer(canvas)
    this.operations = new SelectionOperations()
    
    // Listen for quick mask toggle
    this.eventBus.on('selection.quickmask.toggle', () => {
      this.renderer.toggleQuickMask()
    })
  }
  
  /**
   * Get current selection
   */
  getSelection(): PixelSelection | null {
    return this.selection
  }
  
  /**
   * Apply a selection with the given mode
   */
  applySelection(mask: ImageData, mode: SelectionMode): void {
    let newSelection: PixelSelection | null = null
    
    if (mode === 'replace' || !this.selection) {
      // Replace or create new
      newSelection = this.createSelection(mask)
    } else {
      // Combine with existing
      newSelection = this.operations.combine(
        this.selection,
        this.createSelection(mask),
        mode
      )
    }
    
    this.setSelection(newSelection)
  }
  
  /**
   * Create a selection from a mask
   */
  private createSelection(mask: ImageData): PixelSelection {
    const bounds = this.operations.findBounds(mask)
    return {
      type: 'pixel',
      mask,
      bounds
    }
  }
  
  /**
   * Set the current selection
   */
  private setSelection(selection: PixelSelection | null): void {
    const previousSelection = this.selection
    this.selection = selection
    
    // Update renderer
    this.renderer.updateSelection(selection)
    
    // Emit event
    this.eventBus.emit(new SelectionChangedEvent({
      aggregateId: this.canvas.id,
      selection,
      previousSelection,
      metadata: { source: 'user' }
    }))
  }
  
  /**
   * Clear selection
   */
  deselect(): void {
    this.setSelection(null)
  }
  
  /**
   * Invert selection
   */
  invert(): void {
    const canvasSize = {
      width: this.canvas.width,
      height: this.canvas.height
    }
    
    const inverted = this.operations.invert(this.selection, canvasSize)
    this.setSelection(inverted)
  }
  
  /**
   * Expand selection by pixels
   */
  expand(pixels: number): void {
    if (!this.selection) return
    const expanded = this.operations.expand(this.selection, pixels)
    this.setSelection(expanded)
  }
  
  /**
   * Contract selection by pixels
   */
  contract(pixels: number): void {
    if (!this.selection) return
    const contracted = this.operations.contract(this.selection, pixels)
    this.setSelection(contracted)
  }
  
  /**
   * Feather selection edges
   */
  feather(radius: number): void {
    if (!this.selection) return
    const feathered = this.operations.feather(this.selection, radius)
    this.setSelection(feathered)
  }
  
  /**
   * Smooth selection edges
   */
  smooth(radius: number): void {
    if (!this.selection) return
    const smoothed = this.operations.smooth(this.selection, radius)
    this.setSelection(smoothed)
  }
  
  /**
   * Transform selection
   */
  transform(matrix: DOMMatrix): void {
    if (!this.selection) return
    const transformed = this.operations.transform(this.selection, matrix)
    this.setSelection(transformed)
  }
  
  /**
   * Check if point is in selection
   */
  isPointInSelection(point: Point): boolean {
    if (!this.selection) return false
    
    const { mask, bounds } = this.selection
    const x = Math.floor(point.x - bounds.x)
    const y = Math.floor(point.y - bounds.y)
    
    if (x < 0 || x >= bounds.width || y < 0 || y >= bounds.height) {
      return false
    }
    
    const index = (y * bounds.width + x) * 4 + 3
    return mask.data[index] > 0
  }
}
```

### 3. Implement Selection Operations

```typescript
// lib/editor/selection/SelectionOperations.ts
import { PixelSelection, SelectionMode } from '@/types'

export class SelectionOperations {
  /**
   * Find bounds of non-transparent pixels in mask
   */
  findBounds(mask: ImageData): { x: number; y: number; width: number; height: number } {
    let minX = mask.width
    let minY = mask.height
    let maxX = 0
    let maxY = 0
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const alpha = mask.data[(y * mask.width + x) * 4 + 3]
        if (alpha > 0) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    if (minX > maxX || minY > maxY) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  }
  
  /**
   * Combine two selections based on mode
   */
  combine(
    existing: PixelSelection,
    newSelection: PixelSelection,
    mode: SelectionMode
  ): PixelSelection {
    // Calculate combined bounds
    const bounds = this.combineBounds(existing.bounds, newSelection.bounds)
    const mask = new ImageData(bounds.width, bounds.height)
    
    // Copy existing selection to new mask
    this.copyToMask(existing, mask, bounds)
    
    // Apply new selection based on mode
    switch (mode) {
      case 'add':
        this.addToMask(newSelection, mask, bounds)
        break
      case 'subtract':
        this.subtractFromMask(newSelection, mask, bounds)
        break
      case 'intersect':
        this.intersectWithMask(newSelection, mask, bounds)
        break
    }
    
    return { type: 'pixel', mask, bounds }
  }
  
  /**
   * Invert selection
   */
  invert(
    selection: PixelSelection | null,
    canvasSize: { width: number; height: number }
  ): PixelSelection {
    const mask = new ImageData(canvasSize.width, canvasSize.height)
    
    // Fill with white (fully selected)
    for (let i = 3; i < mask.data.length; i += 4) {
      mask.data[i] = 255
    }
    
    // Subtract existing selection
    if (selection) {
      const { bounds } = selection
      for (let y = 0; y < selection.mask.height; y++) {
        for (let x = 0; x < selection.mask.width; x++) {
          const srcIndex = (y * selection.mask.width + x) * 4 + 3
          const dstX = x + bounds.x
          const dstY = y + bounds.y
          
          if (dstX >= 0 && dstX < mask.width && dstY >= 0 && dstY < mask.height) {
            const dstIndex = (dstY * mask.width + dstX) * 4 + 3
            mask.data[dstIndex] = 255 - selection.mask.data[srcIndex]
          }
        }
      }
    }
    
    return {
      type: 'pixel',
      mask,
      bounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height }
    }
  }
  
  /**
   * Expand selection by dilating the mask
   */
  expand(selection: PixelSelection, pixels: number): PixelSelection {
    const radius = Math.round(pixels)
    const { mask, bounds } = selection
    
    // Create expanded bounds
    const newBounds = {
      x: bounds.x - radius,
      y: bounds.y - radius,
      width: bounds.width + radius * 2,
      height: bounds.height + radius * 2
    }
    
    const newMask = new ImageData(newBounds.width, newBounds.height)
    
    // Morphological dilation
    for (let y = 0; y < newMask.height; y++) {
      for (let x = 0; x < newMask.width; x++) {
        let maxAlpha = 0
        
        // Check neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const srcX = x + dx - radius
            const srcY = y + dy - radius
            
            if (srcX >= 0 && srcX < mask.width && srcY >= 0 && srcY < mask.height) {
              const srcIndex = (srcY * mask.width + srcX) * 4 + 3
              maxAlpha = Math.max(maxAlpha, mask.data[srcIndex])
            }
          }
        }
        
        const dstIndex = (y * newMask.width + x) * 4 + 3
        newMask.data[dstIndex] = maxAlpha
      }
    }
    
    return { type: 'pixel', mask: newMask, bounds: newBounds }
  }
  
  /**
   * Contract selection by eroding the mask
   */
  contract(selection: PixelSelection, pixels: number): PixelSelection {
    const radius = Math.round(pixels)
    const { mask, bounds } = selection
    
    // Create contracted mask (same size for now)
    const newMask = new ImageData(mask.width, mask.height)
    
    // Morphological erosion
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        let minAlpha = 255
        
        // Check neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const srcX = x + dx
            const srcY = y + dy
            
            if (srcX >= 0 && srcX < mask.width && srcY >= 0 && srcY < mask.height) {
              const srcIndex = (srcY * mask.width + srcX) * 4 + 3
              minAlpha = Math.min(minAlpha, mask.data[srcIndex])
            } else {
              minAlpha = 0 // Outside bounds = not selected
            }
          }
        }
        
        const dstIndex = (y * mask.width + x) * 4 + 3
        newMask.data[dstIndex] = minAlpha
      }
    }
    
    // Recalculate bounds
    const newBounds = this.findBounds(newMask)
    
    return { type: 'pixel', mask: newMask, bounds: newBounds }
  }
  
  /**
   * Feather selection edges with Gaussian blur
   */
  feather(selection: PixelSelection, radius: number): PixelSelection {
    if (radius <= 0) return selection
    
    const { mask, bounds } = selection
    const newMask = this.gaussianBlur(mask, radius)
    
    return { type: 'pixel', mask: newMask, bounds }
  }
  
  /**
   * Smooth selection edges
   */
  smooth(selection: PixelSelection, radius: number): PixelSelection {
    const { mask, bounds } = selection
    
    // Apply median filter for smoothing
    const smoothed = this.medianFilter(mask, radius)
    
    return { type: 'pixel', mask: smoothed, bounds }
  }
  
  /**
   * Transform selection with matrix
   */
  transform(selection: PixelSelection, matrix: DOMMatrix): PixelSelection {
    // This would use canvas 2D transform or implement manual transformation
    // For now, return as-is
    return selection
  }
  
  // Helper methods
  
  private combineBounds(a: any, b: any): any {
    const minX = Math.min(a.x, b.x)
    const minY = Math.min(a.y, b.y)
    const maxX = Math.max(a.x + a.width, b.x + b.width)
    const maxY = Math.max(a.y + a.height, b.y + b.height)
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
  
  private gaussianBlur(imageData: ImageData, radius: number): ImageData {
    // Implement Gaussian blur
    // For now, simple box blur as placeholder
    const output = new ImageData(imageData.width, imageData.height)
    const kernel = this.createGaussianKernel(radius)
    
    // Apply convolution
    // ... implementation
    
    return output
  }
  
  private medianFilter(imageData: ImageData, radius: number): ImageData {
    // Implement median filter
    const output = new ImageData(imageData.width, imageData.height)
    
    // ... implementation
    
    return output
  }
  
  private createGaussianKernel(radius: number): number[] {
    // Create Gaussian kernel
    const size = radius * 2 + 1
    const kernel = new Array(size * size)
    const sigma = radius / 3
    
    // ... implementation
    
    return kernel
  }
}
```

### 4. Implement First Selection Tool - Marquee Rectangle

```typescript
// lib/editor/tools/selection/marqueeRectTool.ts
import { BaseSelectionTool } from '../base/BaseSelectionTool'
import { ToolEvent } from '../types'
import { SelectionMode } from '@/types'
import Konva from 'konva'

export class MarqueeRectTool extends BaseSelectionTool {
  static id = 'marquee-rect'
  static name = 'Rectangular Marquee Tool'
  static icon = RectangleIcon // Import appropriate icon
  static cursor = 'crosshair'
  
  private preview: Konva.Rect | null = null
  private currentBounds: any = null
  
  onMouseDown(event: ToolEvent): void {
    this.isCreating = true
    this.startPoint = event.point
    
    // Create preview rectangle
    this.preview = new Konva.Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      stroke: '#000000',
      strokeWidth: 1,
      dash: [4, 4],
      fill: 'rgba(0, 0, 0, 0.1)',
      listening: false
    })
    
    this.updateVisualFeedback(this.preview)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isCreating || !this.startPoint || !this.preview) return
    
    // Calculate bounds
    let bounds = {
      x: Math.min(this.startPoint.x, event.point.x),
      y: Math.min(this.startPoint.y, event.point.y),
      width: Math.abs(event.point.x - this.startPoint.x),
      height: Math.abs(event.point.y - this.startPoint.y)
    }
    
    // Apply constraints based on modifiers
    bounds = this.applyConstraints(bounds, event)
    this.currentBounds = bounds
    
    // Update preview
    this.preview.setAttrs(bounds)
    
    // Update mode indicator
    const mode = this.getSelectionMode(event)
    this.updateModeIndicator(mode)
    
    this.overlayLayer.batchDraw()
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isCreating || !this.currentBounds) return
    
    // Get final selection mode
    const mode = this.getSelectionMode(event)
    
    // Create selection mask
    const mask = this.createSelectionMask(this.currentBounds)
    
    // Apply selection
    this.finalizeSelection(mask, mode)
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isCreating) {
      this.cleanup()
    }
  }
  
  protected createSelectionMask(bounds: any): ImageData {
    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height
    const mask = new ImageData(canvasWidth, canvasHeight)
    
    // Ensure bounds are within canvas
    const x1 = Math.max(0, Math.floor(bounds.x))
    const y1 = Math.max(0, Math.floor(bounds.y))
    const x2 = Math.min(canvasWidth, Math.ceil(bounds.x + bounds.width))
    const y2 = Math.min(canvasHeight, Math.ceil(bounds.y + bounds.height))
    
    // Fill rectangle in mask
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const index = (y * canvasWidth + x) * 4 + 3
        mask.data[index] = 255
      }
    }
    
    // Apply anti-aliasing if enabled
    if (this.getOption('antiAlias')) {
      this.applyAntiAliasing(mask, bounds)
    }
    
    return mask
  }
  
  private updateModeIndicator(mode: SelectionMode): void {
    // Update visual indicator for current mode
    if (!this.preview) return
    
    switch (mode) {
      case 'add':
        this.preview.stroke('#00ff00')
        break
      case 'subtract':
        this.preview.stroke('#ff0000')
        break
      case 'intersect':
        this.preview.stroke('#0000ff')
        break
      default:
        this.preview.stroke('#000000')
    }
  }
  
  private applyAntiAliasing(mask: ImageData, bounds: any): void {
    // Apply anti-aliasing to edges
    // Simple implementation - can be improved
    const { x, y, width, height } = bounds
    
    // Process edges
    for (let py = Math.floor(y); py < Math.ceil(y + height); py++) {
      for (let px = Math.floor(x); px < Math.ceil(x + width); px++) {
        const index = (py * mask.width + px) * 4 + 3
        
        // Calculate distance to edge
        let distance = 1
        
        if (px < x) distance = Math.min(distance, x - px)
        if (px > x + width - 1) distance = Math.min(distance, px - (x + width - 1))
        if (py < y) distance = Math.min(distance, y - py)
        if (py > y + height - 1) distance = Math.min(distance, py - (y + height - 1))
        
        if (distance < 1) {
          mask.data[index] = Math.floor(255 * distance)
        }
      }
    }
  }
}
```

## Next Steps

1. Implement remaining selection tools following the same pattern
2. Create SelectionRenderer for marching ants
3. Build UI components for selection tools
4. Add selection operations (expand, contract, feather)
5. Implement Select and Mask workspace

This clean architecture ensures:
- No Fabric dependencies
- Clear separation of concerns
- Event-driven state management
- Photoshop-accurate behavior
- Extensible for future tools 