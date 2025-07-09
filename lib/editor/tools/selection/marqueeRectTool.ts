import { Square } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Rect } from 'fabric'
import { SelectionTool } from '../base/SelectionTool'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useHistoryStore } from '@/store/historyStore'
import { CreateSelectionCommand } from '@/lib/editor/commands/selection'

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
    if (!this.canvas || !this.state.get('startPoint') || !this.state.get('currentPoint')) return
    
    // Get dimensions
    const { x, y, width, height } = this.getConstrainedDimensions()
    
    // Skip if too small
    if (width < 5 || height < 5) {
      // Remove feedback if too small
      if (this.feedbackRect) {
        this.canvas.remove(this.feedbackRect)
        this.feedbackRect = null
      }
      return
    }
    
    // Get the selection manager from canvas store
    const canvasStore = useCanvasStore.getState()
    const selectionManager = canvasStore.selectionManager
    
    if (!selectionManager) {
      // Clean up feedback on error
      if (this.feedbackRect) {
        this.canvas.remove(this.feedbackRect)
        this.feedbackRect = null
      }
      return
    }
    
    // Check if we're in object mode
    const isObjectMode = this.state.get('isObjectMode')
    const targetObjectId = this.state.get('targetObjectId')
    
    // Get selection mode (new, add, subtract, intersect)
    const mode = this.selectionMode
    
    // Create the selection - the base SelectionTool has already set up
    // the correct selection mode (object vs global) in the selection manager
    selectionManager.createRectangle(
      x, 
      y, 
      width, 
      height, 
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
      this.selectionStore.updateSelectionState(true, { x, y, width, height })
      
      // Start rendering the selection with marching ants
      const { selectionRenderer } = canvasStore
      if (selectionRenderer) {
        selectionRenderer.startRendering()
      }
    }
    
    // IMPORTANT: Remove the temporary feedback rectangle from canvas
    if (this.feedbackRect) {
      this.canvas.remove(this.feedbackRect)
      this.feedbackRect = null
    }
  }
  
  /**
   * Override cleanup to handle marching ants
   */
  protected cleanup(canvas: Canvas): void {
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