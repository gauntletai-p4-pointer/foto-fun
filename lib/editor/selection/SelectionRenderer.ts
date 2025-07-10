import Konva from 'konva'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { SelectionManager, SelectionBounds } from './SelectionManager'

/**
 * SelectionRenderer - Handles visual rendering of selections
 * 
 * This class is responsible for displaying the selection visually
 * on the canvas using Konva, including the marching ants animation.
 */
export class SelectionRenderer {
  private canvasManager: CanvasManager
  private selectionManager: SelectionManager
  private selectionGroup: Konva.Group | null = null
  private marchingAntsAnimation: Konva.Animation | null = null
  private animationOffset = 0
  
  constructor(canvasManager: CanvasManager, selectionManager: SelectionManager) {
    this.canvasManager = canvasManager
    this.selectionManager = selectionManager
  }
  
  /**
   * Get the selection layer from canvas manager
   */
  private getSelectionLayer(): Konva.Layer | null {
    // Access the selection layer through the canvas manager's stage
    const layers = this.canvasManager.konvaStage.getLayers()
    // The selection layer is typically the second-to-last layer (before overlay)
    return layers[layers.length - 2] || null
  }
  
  /**
   * Start rendering the selection
   */
  startRendering(): void {
    if (this.marchingAntsAnimation) return
    
    const selectionLayer = this.getSelectionLayer()
    if (!selectionLayer) return
    
    // Create marching ants animation
    this.marchingAntsAnimation = new Konva.Animation((frame) => {
      if (frame) {
        this.animationOffset = (frame.time / 50) % 10
        this.updateSelectionDisplay()
      }
    }, selectionLayer)
    
    this.marchingAntsAnimation.start()
  }
  
  /**
   * Stop rendering the selection
   */
  stopRendering(): void {
    if (this.marchingAntsAnimation) {
      this.marchingAntsAnimation.stop()
      this.marchingAntsAnimation = null
    }
    this.clearSelectionDisplay()
  }
  
  /**
   * Update the selection display
   */
  private updateSelectionDisplay(): void {
    // Remove existing selection display
    this.clearSelectionDisplay()
    
    const selection = this.selectionManager.getSelection()
    if (!selection) return
    
    const selectionLayer = this.getSelectionLayer()
    if (!selectionLayer) return
    
    // Create marching ants visualization
    const selectionVisual = this.createMarchingAntsVisual(selection.bounds)
    if (selectionVisual) {
      this.selectionGroup = selectionVisual
      selectionLayer.add(selectionVisual)
      selectionLayer.batchDraw()
    }
  }
  
  /**
   * Clear the selection display
   */
  private clearSelectionDisplay(): void {
    if (this.selectionGroup) {
      this.selectionGroup.destroy()
      this.selectionGroup = null
    }
    
    const selectionLayer = this.getSelectionLayer()
    if (selectionLayer) {
      // Only clear selection-related shapes, not the entire layer
      const children = selectionLayer.getChildren()
      children.forEach(child => {
        // Remove only marching ants groups
        if (child === this.selectionGroup || child.name() === 'selection-marching-ants') {
          child.destroy()
        }
      })
      selectionLayer.batchDraw()
    }
  }
  
  /**
   * Create marching ants visualization from selection bounds
   */
  private createMarchingAntsVisual(bounds: SelectionBounds): Konva.Group | null {
    const group = new Konva.Group({
      name: 'selection-marching-ants'
    })
    
    // Create white background stroke for visibility
    const backgroundRect = new Konva.Rect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      stroke: 'white',
      strokeWidth: 3,
      fill: 'transparent',
      listening: false
    })
    
    // Create marching ants rectangle
    const marchingAntsRect = new Konva.Rect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      stroke: 'black',
      strokeWidth: 1,
      dash: [5, 5],
      dashOffset: -this.animationOffset,
      fill: 'transparent',
      listening: false
    })
    
    group.add(backgroundRect)
    group.add(marchingAntsRect)
    
    return group
  }
  
  /**
   * Create a more complex selection path (for non-rectangular selections)
   */
  createSelectionPath(pathData: string): Konva.Group {
    const group = new Konva.Group()
    
    // Background path for visibility
    const backgroundPath = new Konva.Path({
      data: pathData,
      stroke: 'white',
      strokeWidth: 3,
      fill: 'transparent',
      listening: false
    })
    
    // Marching ants path
    const marchingAntsPath = new Konva.Path({
      data: pathData,
      stroke: 'black',
      strokeWidth: 1,
      dash: [5, 5],
      dashOffset: -this.animationOffset,
      fill: 'transparent',
      listening: false
    })
    
    group.add(backgroundPath)
    group.add(marchingAntsPath)
    
    return group
  }
  
  /**
   * Create selection outline from pixel mask
   * This would use marching squares algorithm for accurate edge detection
   */
  createSelectionOutlineFromMask(mask: ImageData): string {
    // Simplified implementation - in production would trace actual edges
    const bounds = this.findMaskBounds(mask)
    
    // Create path data for rectangle
    return `
      M ${bounds.x} ${bounds.y}
      L ${bounds.x + bounds.width} ${bounds.y}
      L ${bounds.x + bounds.width} ${bounds.y + bounds.height}
      L ${bounds.x} ${bounds.y + bounds.height}
      Z
    `
  }
  
  /**
   * Find bounds of non-transparent pixels in mask
   */
  private findMaskBounds(mask: ImageData): SelectionBounds {
    let minX = mask.width
    let minY = mask.height
    let maxX = 0
    let maxY = 0
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const idx = (y * mask.width + x) * 4
        if (mask.data[idx + 3] > 0) { // Check alpha channel
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  }
  
  /**
   * Check if currently animating
   */
  isRendering(): boolean {
    return this.marchingAntsAnimation !== null && this.marchingAntsAnimation.isRunning()
  }
  
  /**
   * Destroy the renderer and clean up resources
   */
  destroy(): void {
    this.stopRendering()
    // No need to destroy the layer as it's managed by CanvasManager
  }
} 