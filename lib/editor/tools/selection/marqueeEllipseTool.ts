import { Circle } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Ellipse } from 'fabric'
import { SelectionTool } from '../base/SelectionTool'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'

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
    if (!startPoint) return
    
    // Create initial ellipse
    this.feedbackEllipse = new Ellipse({
      left: startPoint.x,
      top: startPoint.y,
      rx: 0,
      ry: 0,
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
    if (!this.canvas || !this.feedbackEllipse) return
    
    // Only keep the selection if it has a minimum size
    const minSize = 2
    const rx = this.feedbackEllipse.rx ?? 0
    const ry = this.feedbackEllipse.ry ?? 0
    
    if (rx < minSize || ry < minSize) {
      // Too small, remove it
      this.canvas.remove(this.feedbackEllipse)
    } else {
      // Get selection manager and mode
      const canvasStore = useCanvasStore.getState()
      const selectionStore = useSelectionStore.getState()
      
      if (!canvasStore.selectionManager || !canvasStore.selectionRenderer) {
        console.error('Selection system not initialized')
        this.canvas.remove(this.feedbackEllipse)
        return
      }
      
      // Create pixel selection
      const cx = this.feedbackEllipse.left ?? 0
      const cy = this.feedbackEllipse.top ?? 0
      
      canvasStore.selectionManager.createEllipse(
        cx,
        cy,
        rx,
        ry,
        selectionStore.mode
      )
      
      // Update selection state
      selectionStore.updateSelectionState(true, {
        x: cx - rx,
        y: cy - ry,
        width: rx * 2,
        height: ry * 2
      })
      
      // Start rendering the selection
      canvasStore.selectionRenderer.startRendering()
      
      // Remove the temporary feedback ellipse
      this.canvas.remove(this.feedbackEllipse)
      
      console.log('Ellipse selection created:', {
        mode: selectionStore.mode,
        center: { x: cx, y: cy },
        radii: { rx, ry }
      })
    }
    
    this.feedbackEllipse = null
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