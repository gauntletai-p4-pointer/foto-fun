import { Square } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Rect } from 'fabric'
import { SelectionTool } from './base/SelectionTool'
import { selectionStyle, startMarchingAnts, stopMarchingAnts, type SelectionShape } from './utils/selectionRenderer'

/**
 * Rectangular Marquee Tool - Creates rectangular selections
 * Extends SelectionTool for consistent selection behavior
 */
class MarqueeRectTool extends SelectionTool {
  // Tool identification
  id = TOOL_IDS.MARQUEE_RECT
  name = 'Rectangular Marquee Tool'
  icon = Square
  cursor = 'crosshair'
  shortcut = 'M'
  
  // Override to use Rect instead of Path
  protected feedbackRect: Rect | null = null
  
  /**
   * Create visual feedback (rectangle)
   */
  protected createFeedback(): void {
    if (!this.canvas) return
    
    const startPoint = this.state.get('startPoint')
    if (!startPoint) return
    
    // Create initial rectangle
    this.feedbackRect = new Rect({
      left: startPoint.x,
      top: startPoint.y,
      width: 0,
      height: 0,
      ...selectionStyle
    })
    
    this.canvas.add(this.feedbackRect)
    this.canvas.renderAll()
  }
  
  /**
   * Update visual feedback during selection
   */
  protected updateFeedback(): void {
    if (!this.canvas || !this.feedbackRect) return
    
    const dimensions = this.getConstrainedDimensions()
    
    this.feedbackRect.set({
      left: dimensions.x,
      top: dimensions.y,
      width: dimensions.width,
      height: dimensions.height
    })
    
    this.canvas.renderAll()
  }
  
  /**
   * Finalize the selection
   */
  protected finalizeSelection(): void {
    if (!this.canvas || !this.feedbackRect) return
    
    // Only keep the selection if it has a minimum size
    const minSize = 2
    
    if ((this.feedbackRect.width ?? 0) < minSize || (this.feedbackRect.height ?? 0) < minSize) {
      // Too small, remove it
      this.canvas.remove(this.feedbackRect)
    } else {
      // Start marching ants animation
      startMarchingAnts(this.feedbackRect as SelectionShape, this.canvas)
      
      // Apply selection based on current mode
      this.selectionStore.applySelection(this.canvas, this.feedbackRect)
      
      // TODO: Create SelectionCommand when command system is implemented
      console.log('Rectangle selection created:', {
        mode: this.selectionMode,
        bounds: {
          left: this.feedbackRect.left,
          top: this.feedbackRect.top,
          width: this.feedbackRect.width,
          height: this.feedbackRect.height
        }
      })
    }
    
    this.feedbackRect = null
  }
  
  /**
   * Override cleanup to handle marching ants
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up any existing selections
    const objects = canvas.getObjects()
    objects.forEach(obj => {
      if (obj instanceof Rect && !obj.selectable) {
        stopMarchingAnts(obj as SelectionShape)
        canvas.remove(obj)
      }
    })
    
    // Clean up feedback rect if exists
    if (this.feedbackRect && canvas.contains(this.feedbackRect)) {
      canvas.remove(this.feedbackRect)
      this.feedbackRect = null
    }
    
    // Call parent cleanup
    super.cleanup(canvas)
  }
}

// Export singleton instance
export const marqueeRectTool = new MarqueeRectTool() 