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
    if (!this.canvas || !this.feedbackRect) return
    
    // Only keep the selection if it has a minimum size
    const minSize = 2
    
    if ((this.feedbackRect.width ?? 0) < minSize || (this.feedbackRect.height ?? 0) < minSize) {
      // Too small, remove it
      this.canvas.remove(this.feedbackRect)
    } else {
      // Get selection manager and mode
      const canvasStore = useCanvasStore.getState()
      const selectionStore = useSelectionStore.getState()
      const historyStore = useHistoryStore.getState()
      
      if (!canvasStore.selectionManager || !canvasStore.selectionRenderer) {
        console.error('Selection system not initialized')
        this.canvas.remove(this.feedbackRect)
        return
      }
      
      // Get bounds
      const bounds = this.feedbackRect.getBoundingRect()
      
      // Create a temporary canvas to generate the selection mask
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = this.canvas.getWidth()
      tempCanvas.height = this.canvas.getHeight()
      const tempCtx = tempCanvas.getContext('2d')!
      
      // Create image data for the rectangle
      const imageData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height)
      
      // Fill the rectangle area
      for (let y = Math.floor(bounds.top); y < Math.ceil(bounds.top + bounds.height); y++) {
        for (let x = Math.floor(bounds.left); x < Math.ceil(bounds.left + bounds.width); x++) {
          if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
            const index = (y * imageData.width + x) * 4
            imageData.data[index + 3] = 255 // Set alpha to fully selected
          }
        }
      }
      
      // Create the selection command
      const command = new CreateSelectionCommand(
        canvasStore.selectionManager,
        {
          mask: imageData,
          bounds: {
            x: bounds.left,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height
          }
        },
        selectionStore.mode
      )
      
      // Execute the command through history
      historyStore.executeCommand(command)
      
      // Update selection state
      selectionStore.updateSelectionState(true, {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
      })
      
      // Start rendering the selection
      canvasStore.selectionRenderer.startRendering()
      
      // Remove the temporary feedback rectangle
      this.canvas.remove(this.feedbackRect)
    }
    
    this.feedbackRect = null
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