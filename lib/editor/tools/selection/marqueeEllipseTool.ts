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
    
    if ((this.feedbackEllipse.width ?? 0) < minSize || (this.feedbackEllipse.height ?? 0) < minSize) {
      // Too small, remove it
      this.canvas.remove(this.feedbackEllipse)
    } else {
      // Get selection manager and mode
      const canvasStore = useCanvasStore.getState()
      const selectionStore = useSelectionStore.getState()
      const historyStore = useHistoryStore.getState()
      
      if (!canvasStore.selectionManager || !canvasStore.selectionRenderer) {
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
      
      // Create a temporary canvas to generate the selection mask
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = this.canvas.getWidth()
      tempCanvas.height = this.canvas.getHeight()
      const tempCtx = tempCanvas.getContext('2d')!
      
      // Create image data for the ellipse
      const imageData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height)
      
      // Fill the ellipse area using the ellipse equation
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          const dx = (x - cx) / rx
          const dy = (y - cy) / ry
          
          if (dx * dx + dy * dy <= 1) {
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