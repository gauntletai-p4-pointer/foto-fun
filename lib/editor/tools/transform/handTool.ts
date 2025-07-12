import { Hand } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import { NAVIGATION_TOOL_REQUIREMENTS } from '../base/ToolRequirements'

/**
 * Hand Tool - Allows panning the canvas
 * Uses Konva's built-in stage dragging for smooth panning
 * Works without a document
 */
export class HandTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.HAND
  name = 'Hand Tool'
  icon = Hand
  cursor = 'grab'
  shortcut = 'H'
  
  // Navigation tools don't need a document
  protected requirements = NAVIGATION_TOOL_REQUIREMENTS
  
  protected setupTool(): void {
    // Enable stage dragging when hand tool is active
    const canvas = this.getCanvas()
    canvas.setDraggable(true)
    
    // Set cursor
    canvas.stage.container().style.cursor = 'grab'
  }
  
  protected cleanupTool(): void {
    // Disable stage dragging when switching tools
    const canvas = this.getCanvas()
    canvas.setDraggable(false)
    
    // Reset cursor
    canvas.stage.container().style.cursor = 'default'
  }
  
  onMouseDown(): void {
    // Change cursor to grabbing
    const canvas = this.getCanvas()
    canvas.stage.container().style.cursor = 'grabbing'
  }
  
  onMouseUp(): void {
    // Change cursor back to grab
    const canvas = this.getCanvas()
    canvas.stage.container().style.cursor = 'grab'
  }
  
  // No need for onMouseMove - Konva handles the dragging
}

// Export singleton instance
export const handTool = new HandTool() 