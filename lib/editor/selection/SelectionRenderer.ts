import type { Canvas, FabricObject } from 'fabric'
import { Path, Group } from 'fabric'
import type { SelectionManager, SelectionBounds } from './SelectionManager'

/**
 * SelectionRenderer - Handles visual rendering of selections
 * 
 * This class is responsible for displaying the selection visually
 * on the canvas, including the marching ants animation.
 */
export class SelectionRenderer {
  private canvas: Canvas
  private selectionManager: SelectionManager
  private selectionOverlay: FabricObject | null = null
  private animationOffset = 0
  private isAnimating = false
  
  constructor(canvas: Canvas, selectionManager: SelectionManager) {
    this.canvas = canvas
    this.selectionManager = selectionManager
  }
  
  /**
   * Start rendering the selection
   */
  startRendering(): void {
    if (this.isAnimating) return
    
    this.isAnimating = true
    this.selectionManager.startMarchingAnts(() => {
      this.animationOffset = (this.animationOffset + 1) % 10
      this.updateSelectionDisplay()
    })
  }
  
  /**
   * Stop rendering the selection
   */
  stopRendering(): void {
    this.isAnimating = false
    this.selectionManager.stopMarchingAnts()
    this.clearSelectionDisplay()
  }
  
  /**
   * Update the selection display
   */
  private updateSelectionDisplay(): void {
    // Remove existing overlay
    this.clearSelectionDisplay()
    
    const selection = this.selectionManager.getSelection()
    if (!selection) return
    
    // Create marching ants path
    const overlay = this.createMarchingAntsPath(selection.bounds)
    if (overlay) {
      this.selectionOverlay = overlay
      this.canvas.add(overlay)
      this.canvas.renderAll()
    }
  }
  
  /**
   * Clear the selection display
   */
  private clearSelectionDisplay(): void {
    if (this.selectionOverlay) {
      this.canvas.remove(this.selectionOverlay)
      this.selectionOverlay = null
    }
  }
  
  /**
   * Create marching ants path from selection bounds
   */
  private createMarchingAntsPath(bounds: SelectionBounds): Group | null {
    // For now, create a simple rectangle path
    // In a full implementation, this would trace the actual selection outline
    const pathData = `
      M ${bounds.x} ${bounds.y}
      L ${bounds.x + bounds.width} ${bounds.y}
      L ${bounds.x + bounds.width} ${bounds.y + bounds.height}
      L ${bounds.x} ${bounds.y + bounds.height}
      Z
    `
    
    const path = new Path(pathData, {
      fill: '',
      stroke: 'black',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      strokeDashOffset: -this.animationOffset,
      selectable: false,
      evented: false,
      excludeFromExport: true
    })
    
    // Add white background stroke for visibility
    const backgroundPath = new Path(pathData, {
      fill: '',
      stroke: 'white',
      strokeWidth: 3,
      selectable: false,
      evented: false,
      excludeFromExport: true
    })
    
    // Group them together
    const group = new Group([backgroundPath, path], {
      selectable: false,
      evented: false,
      excludeFromExport: true
    })
    
    return group
  }
  
  /**
   * Create a more accurate selection outline from the pixel mask
   */
  createSelectionOutline(): FabricObject | null {
    const selection = this.selectionManager.getSelection()
    if (!selection) return null
    
    // This is a simplified version - a full implementation would
    // use marching squares or similar algorithm to trace the selection edge
    const bounds = selection.bounds
    
    // For now, just return a rectangle
    return this.createMarchingAntsPath(bounds)
  }
  
  /**
   * Check if currently animating
   */
  isRendering(): boolean {
    return this.isAnimating
  }
} 