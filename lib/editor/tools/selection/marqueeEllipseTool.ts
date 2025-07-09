import { Circle } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Ellipse } from 'fabric'
import { SelectionTool } from '../base/SelectionTool'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useHistoryStore } from '@/store/historyStore'
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
    
    // Debug logging
    console.log('[MarqueeEllipseTool] updateFeedback:', {
      dimensions,
      centerX,
      centerY,
      rx,
      ry
    })
    
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
    
    // For Ellipse objects, we need to check rx and ry (radii), not width/height
    const rx = this.feedbackEllipse.rx ?? 0
    const ry = this.feedbackEllipse.ry ?? 0
    
    // Debug logging
    console.log('[MarqueeEllipseTool] finalizeSelection:', {
      rx,
      ry,
      minSize,
      willRemove: rx < minSize || ry < minSize
    })
    
    if (rx < minSize || ry < minSize) {
      // Too small, remove it
      this.canvas.remove(this.feedbackEllipse)
    } else {
      // Get selection manager
      const canvasStore = useCanvasStore.getState()
      const selectionManager = canvasStore.selectionManager
      
      if (!selectionManager) {
        console.error('Selection system not initialized')
        this.canvas.remove(this.feedbackEllipse)
        return
      }
      
      // Get ellipse parameters
      const bounds = this.feedbackEllipse.getBoundingRect()
      const cx = bounds.left + bounds.width / 2
      const cy = bounds.top + bounds.height / 2
      const rx = bounds.width / 2
      const ry = bounds.height / 2
      
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
          x: bounds.left,
          y: bounds.top,
          width: bounds.width,
          height: bounds.height
        })
        
        // Start rendering the selection with marching ants
        const { selectionRenderer } = canvasStore
        if (selectionRenderer) {
          selectionRenderer.startRendering()
        }
      }
      
      // Remove the temporary feedback ellipse
      this.canvas.remove(this.feedbackEllipse)
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