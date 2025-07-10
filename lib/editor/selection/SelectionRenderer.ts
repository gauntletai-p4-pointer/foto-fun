import type { Canvas, FabricObject } from 'fabric'
import { Path, Group } from 'fabric'
import type { SelectionManager, PixelSelection } from './SelectionManager'
import { markAsSystemObject } from '@/lib/editor/utils/systemObjects'
import { SystemObjectType } from '@/types/fabric'

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
  private animationFrame: number | null = null
  
  constructor(canvas: Canvas, selectionManager: SelectionManager) {
    this.canvas = canvas
    this.selectionManager = selectionManager
  }
  
  /**
   * Start rendering the selection
   */
  startRendering(): void {
    if (this.isAnimating) {
      // Stop and restart to ensure we're showing the latest selection
      this.stopRendering()
    }
    
    this.isAnimating = true
    
    // Create the initial selection display
    this.createSelectionDisplay()
    
    // Start the animation loop
    const animate = () => {
      if (!this.isAnimating) return
      
      this.animationOffset = (this.animationOffset + 1) % 10
      this.updateMarchingAnts()
      
      this.animationFrame = requestAnimationFrame(animate)
    }
    
    this.animationFrame = requestAnimationFrame(animate)
  }
  
  /**
   * Stop rendering the selection
   */
  stopRendering(): void {
    this.isAnimating = false
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    
    this.clearSelectionDisplay()
  }
  
  /**
   * Create the selection display
   */
  private createSelectionDisplay(): void {
    // Remove existing overlay if any
    this.clearSelectionDisplay()
    
    const selection = this.selectionManager.getSelection()
    
    if (!selection) {
      return
    }
    
    // Create marching ants path
    const overlay = this.createMarchingAntsPath(selection)
    
    if (overlay) {
      this.selectionOverlay = overlay
      this.canvas.add(overlay)
      this.canvas.renderAll()
    }
  }
  
  /**
   * Update only the marching ants animation
   */
  private updateMarchingAnts(): void {
    if (!this.selectionOverlay) return
    
    // Update the stroke dash offset for animation
    if (this.selectionOverlay.type === 'group') {
      const group = this.selectionOverlay as Group
      const objects = group.getObjects()
      
      // Update the black dashed line (second object in the group)
      if (objects[1]) {
        objects[1].set('strokeDashOffset', -this.animationOffset)
      }
    }
    
    // Request a render without triggering object events
    this.canvas.requestRenderAll()
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
  private createMarchingAntsPath(selection: PixelSelection): Group | null {
    // Validate bounds
    if (selection.bounds.width <= 0 || selection.bounds.height <= 0) {
      return null
    }
    
    // Create path data based on shape type
    let pathData: string
    
    if (selection.shape) {
      switch (selection.shape.type) {
        case 'rectangle':
          pathData = `
            M ${selection.shape.x} ${selection.shape.y}
            L ${selection.shape.x + selection.shape.width} ${selection.shape.y}
            L ${selection.shape.x + selection.shape.width} ${selection.shape.y + selection.shape.height}
            L ${selection.shape.x} ${selection.shape.y + selection.shape.height}
            Z
          `
          break
          
        case 'ellipse':
          // Create ellipse path using SVG arc commands
          const { cx, cy, rx, ry } = selection.shape
          pathData = `
            M ${cx - rx} ${cy}
            A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}
            A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy}
            Z
          `
          break
          
        case 'path':
          // Use the stored path data directly
          pathData = selection.shape.pathData
          break
          
        default:
          // Fallback to rectangle bounds
          pathData = `
            M ${selection.bounds.x} ${selection.bounds.y}
            L ${selection.bounds.x + selection.bounds.width} ${selection.bounds.y}
            L ${selection.bounds.x + selection.bounds.width} ${selection.bounds.y + selection.bounds.height}
            L ${selection.bounds.x} ${selection.bounds.y + selection.bounds.height}
            Z
          `
      }
    } else {
      // No shape info, use bounds as rectangle
      pathData = `
        M ${selection.bounds.x} ${selection.bounds.y}
        L ${selection.bounds.x + selection.bounds.width} ${selection.bounds.y}
        L ${selection.bounds.x + selection.bounds.width} ${selection.bounds.y + selection.bounds.height}
        L ${selection.bounds.x} ${selection.bounds.y + selection.bounds.height}
        Z
      `
    }
    
    const path = new Path(pathData, {
      fill: '',
      stroke: 'black',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      strokeDashOffset: -this.animationOffset
    })
    
    // Add white background stroke for visibility
    const backgroundPath = new Path(pathData, {
      fill: '',
      stroke: 'white',
      strokeWidth: 3
    })
    
    // Group them together
    const group = new Group([backgroundPath, path])
    
    // Mark as system object
    markAsSystemObject(group, SystemObjectType.SELECTION_OVERLAY)
    
    return group
  }
  
  /**
   * Create a more accurate selection outline from the pixel mask
   */
  createSelectionOutline(): FabricObject | null {
    const selection = this.selectionManager.getSelection()
    if (!selection) return null
    
    // Use the main createMarchingAntsPath method which now properly handles shape types
    return this.createMarchingAntsPath(selection)
  }
  
  /**
   * Check if currently animating
   */
  isRendering(): boolean {
    return this.isAnimating
  }
} 