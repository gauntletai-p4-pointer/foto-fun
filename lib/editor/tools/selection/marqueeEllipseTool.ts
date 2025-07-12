import { Circle } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Ellipse } from 'fabric'
import { SelectionTool } from '../base/SelectionTool'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { CreateSelectionCommand } from '@/lib/editor/commands/selection'

/**
 * Elliptical Marquee Tool - Creates elliptical selections
 * Extends SelectionTool for consistent selection behavior
 */
class MarqueeEllipseTool extends SelectionTool {
  // Tool identification
  id = TOOL_IDS.MARQUEE_ELLIPSE
  name = 'Elliptical Marquee Tool'
  icon = Circle
  cursor = 'crosshair'
  shortcut = 'M' // Same as rectangular marquee (cycle between them)
  
  // Override to use Ellipse instead of Path
  protected feedbackEllipse: Ellipse | null = null
  
  /**
   * Create visual feedback (ellipse)
   */
  protected createFeedback(): void {
    if (!this.canvas) return
    
    const startPoint = this.state.get('startPoint')
    const currentPoint = this.state.get('currentPoint')
    if (!startPoint || !currentPoint) return
    
    // Get initial dimensions
    const dimensions = this.getConstrainedDimensions()
    
    // Calculate center and radii (same as updateFeedback)
    const centerX = dimensions.x + dimensions.width / 2
    const centerY = dimensions.y + dimensions.height / 2
    const rx = Math.max(1, dimensions.width / 2)  // Ensure minimum size
    const ry = Math.max(1, dimensions.height / 2)  // Ensure minimum size
    
    // Create initial ellipse - position at center of drag area
    this.feedbackEllipse = new Ellipse({
      left: centerX,
      top: centerY,
      rx: rx,
      ry: ry,
      originX: 'center',  // Position from center
      originY: 'center',  // Position from center
      ...selectionStyle
    })
    
    this.canvas.add(this.feedbackEllipse)
    this.canvas.renderAll()
  }
  
  /**
   * Update visual feedback during selection
   */
  protected updateFeedback(): void {
    if (!this.canvas || !this.feedbackEllipse) return
    
    const dimensions = this.getConstrainedDimensions()
    
    // Calculate center and radii
    const centerX = dimensions.x + dimensions.width / 2
    const centerY = dimensions.y + dimensions.height / 2
    const rx = dimensions.width / 2
    const ry = dimensions.height / 2
    
    this.feedbackEllipse.set({
      left: centerX,
      top: centerY,
      rx: rx,
      ry: ry
    })
    
    this.canvas.renderAll()
  }
  
  /**
   * Finalize the selection
   */
  protected finalizeSelection(): void {
    if (!this.canvas || !this.state.get('startPoint') || !this.state.get('currentPoint')) return
    
    // Get dimensions from constrained dimensions (like rectangular marquee)
    const dimensions = this.getConstrainedDimensions()
    
    // Skip if too small
    if (dimensions.width < 5 || dimensions.height < 5) {
      // Remove feedback if too small
      if (this.feedbackEllipse) {
        this.canvas.remove(this.feedbackEllipse)
        this.feedbackEllipse = null
      }
      return
    }
    
    // Calculate ellipse parameters based on dimensions
    const cx = dimensions.x + dimensions.width / 2
    const cy = dimensions.y + dimensions.height / 2
    const rx = dimensions.width / 2
    const ry = dimensions.height / 2
    
    // Get selection manager
    const canvasStore = useCanvasStore.getState()
    const selectionManager = canvasStore.selectionManager
    
    if (!selectionManager) {
      if (this.feedbackEllipse) {
        this.canvas.remove(this.feedbackEllipse)
      }
      return
    }
    
    // Get selection mode (new, add, subtract, intersect)
    const mode = this.selectionMode
    
    // Create the selection - the base SelectionTool has already set up
    // the correct selection mode (object vs global) in the selection manager
    selectionManager.createEllipse(
      cx,
      cy,
      rx,
      ry,
      mode === 'new' ? 'replace' : mode
    )
    
    // If in object mode, the LayerAwareSelectionManager will automatically
    // clip the selection to object bounds and store it as an object selection
    
    // Record command for undo/redo
    const selection = selectionManager.getSelection()
    if (selection) {
      const command = new CreateSelectionCommand(selectionManager, selection, mode === 'new' ? 'replace' : mode)
      this.historyStore.executeCommand(command)
      
      // Update selection store
      this.selectionStore.updateSelectionState(true, {
        x: dimensions.x,
        y: dimensions.y,
        width: dimensions.width,
        height: dimensions.height
      })
      
      // Start rendering the selection with marching ants
      const { selectionRenderer } = canvasStore
      if (selectionRenderer) {
        selectionRenderer.startRendering()
      }
    }
    
    // Remove the temporary feedback ellipse
    if (this.feedbackEllipse) {
      this.canvas.remove(this.feedbackEllipse)
      this.feedbackEllipse = null
    }
  }
  
  /**
   * Override cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up feedback ellipse if exists
    if (this.feedbackEllipse && canvas.contains(this.feedbackEllipse)) {
      canvas.remove(this.feedbackEllipse)
      this.feedbackEllipse = null
    }
    
    // Call parent cleanup
    super.cleanup(canvas)
  }
}

// Export singleton instance
export const marqueeEllipseTool = new MarqueeEllipseTool() 