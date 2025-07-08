import { Circle } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Ellipse } from 'fabric'
import { SelectionTool } from '../base/SelectionTool'
import { selectionStyle, startMarchingAnts, stopMarchingAnts, type SelectionShape } from '../utils/selectionRenderer'

/**
 * Elliptical Marquee Tool - Creates elliptical/circular selections
 * Extends SelectionTool for consistent selection behavior
 */
class MarqueeEllipseTool extends SelectionTool {
  // Tool identification
  id = TOOL_IDS.MARQUEE_ELLIPSE
  name = 'Elliptical Marquee Tool'
  icon = Circle
  cursor = 'crosshair'
  shortcut = 'M'
  
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
    
    // Ellipse uses center point and radii
    this.feedbackEllipse.set({
      left: dimensions.x + dimensions.width / 2,
      top: dimensions.y + dimensions.height / 2,
      rx: dimensions.width / 2,
      ry: dimensions.height / 2
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
      // Start marching ants animation
      startMarchingAnts(this.feedbackEllipse as SelectionShape, this.canvas)
      
      // Apply selection based on current mode
      this.selectionStore.applySelection(this.canvas, this.feedbackEllipse)
      
      // TODO: Create SelectionCommand when command system is implemented
      console.log('Ellipse selection created:', {
        mode: this.selectionMode,
        bounds: {
          left: this.feedbackEllipse.left,
          top: this.feedbackEllipse.top,
          rx: this.feedbackEllipse.rx,
          ry: this.feedbackEllipse.ry
        }
      })
    }
    
    this.feedbackEllipse = null
  }
  
  /**
   * Override cleanup to handle marching ants
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up any existing selections
    const objects = canvas.getObjects()
    objects.forEach(obj => {
      if (obj instanceof Ellipse && !obj.selectable) {
        stopMarchingAnts(obj as SelectionShape)
        canvas.remove(obj)
      }
    })
    
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