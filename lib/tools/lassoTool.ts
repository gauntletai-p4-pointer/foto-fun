import { Lasso } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Polygon } from 'fabric'
import { SelectionTool } from './base/SelectionTool'
import { selectionStyle, startMarchingAnts, stopMarchingAnts, type SelectionShape } from './utils/selectionRenderer'

/**
 * Lasso Tool - Creates freehand selections
 * Extends SelectionTool for consistent selection behavior
 */
class LassoTool extends SelectionTool {
  // Tool identification
  id = TOOL_IDS.LASSO
  name = 'Lasso Tool'
  icon = Lasso
  cursor = 'crosshair'
  shortcut = 'L'
  
  // Tool-specific properties
  protected previewPath: Polygon | null = null
  protected finalPath: Polygon | null = null
  
  /**
   * Create visual feedback (polygon path)
   */
  protected createFeedback(): void {
    if (!this.canvas) return
    
    const startPoint = this.state.get('startPoint')
    if (!startPoint) return
    
    // Create initial preview path
    this.previewPath = new Polygon([startPoint], {
      ...selectionStyle,
      fill: 'transparent',
      strokeDashArray: [3, 3],
    })
    
    this.canvas.add(this.previewPath)
    this.canvas.renderAll()
  }
  
  /**
   * Update visual feedback during selection
   */
  protected updateFeedback(): void {
    if (!this.canvas || !this.previewPath) return
    
    const selectionPath = this.state.get('selectionPath')
    if (selectionPath.length < 2) return
    
    // Remove old preview
    this.canvas.remove(this.previewPath)
    
    // Create new preview with all points
    this.previewPath = new Polygon(selectionPath, {
      ...selectionStyle,
      fill: 'transparent',
      strokeDashArray: [3, 3],
    })
    
    this.canvas.add(this.previewPath)
    this.canvas.renderAll()
  }
  
  /**
   * Finalize the lasso selection
   */
  protected finalizeSelection(): void {
    if (!this.canvas || !this.previewPath) return
    
    const selectionPath = this.state.get('selectionPath')
    
    // Check if we have enough points for a valid selection
    if (selectionPath.length < 3) {
      this.canvas.remove(this.previewPath)
      this.previewPath = null
      this.canvas.renderAll()
      return
    }
    
    // Close the path by connecting to the first point
    const firstPoint = selectionPath[0]
    const lastPoint = selectionPath[selectionPath.length - 1]
    const distance = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) + 
      Math.pow(lastPoint.y - firstPoint.y, 2)
    )
    
    // Auto-close if last point is far from first
    const closedPath = [...selectionPath]
    if (distance > 10) {
      closedPath.push({ x: firstPoint.x, y: firstPoint.y })
    }
    
    // Remove preview path
    this.canvas.remove(this.previewPath)
    this.previewPath = null
    
    // Create final selection polygon
    this.finalPath = new Polygon(closedPath, {
      ...selectionStyle,
    })
    
    this.canvas.add(this.finalPath)
    
    // Start marching ants animation
    startMarchingAnts(this.finalPath as SelectionShape, this.canvas)
    
    // Apply selection based on current mode
    this.selectionStore.applySelection(this.canvas, this.finalPath)
    
    // TODO: Create SelectionCommand when selection commands are implemented
    console.log('Lasso selection created:', {
      mode: this.selectionMode,
      points: closedPath.length
    })
    
    // Reset final path reference
    this.finalPath = null
    
    this.canvas.renderAll()
  }
  
  /**
   * Override cleanup to handle marching ants
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up any existing selections
    const objects = canvas.getObjects()
    objects.forEach(obj => {
      if (obj instanceof Polygon && !obj.selectable) {
        stopMarchingAnts(obj as SelectionShape)
        canvas.remove(obj)
      }
    })
    
    // Clean up preview path if exists
    if (this.previewPath && canvas.contains(this.previewPath)) {
      canvas.remove(this.previewPath)
      this.previewPath = null
    }
    
    // Call parent cleanup
    super.cleanup(canvas)
  }
}

// Export singleton instance
export const lassoTool = new LassoTool() 