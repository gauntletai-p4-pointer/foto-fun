import { Hand } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'

/**
 * Hand Tool - Canvas panning/navigation
 * Konva implementation with smooth panning
 */
export class HandTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.HAND
  name = 'Hand Tool'
  icon = Hand
  cursor = 'grab'
  shortcut = 'H'
  
  // Panning state
  private isPanning = false
  private startPoint: Point | null = null
  private startPan: Point | null = null
  
  protected setupTool(): void {
    // Hand tool doesn't need special setup
  }
  
  protected cleanupTool(): void {
    // Reset state
    this.isPanning = false
    this.startPoint = null
    this.startPan = null
  }
  
  onMouseDown(event: ToolEvent): void {
    const canvas = this.getCanvas()
    
    // Start panning
    this.isPanning = true
    this.startPoint = { ...event.screenPoint } // Use screenPoint consistently
    this.startPan = { ...canvas.state.pan }
    
    // Change cursor to grabbing
    canvas.konvaStage.container().style.cursor = 'grabbing'
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isPanning || !this.startPoint || !this.startPan) return
    
    const canvas = this.getCanvas()
    
    // Calculate delta in screen coordinates
    const dx = event.screenPoint.x - this.startPoint.x
    const dy = event.screenPoint.y - this.startPoint.y
    
    // Apply pan directly (no zoom adjustment needed for screen coordinates)
    const newPan = {
      x: this.startPan.x + dx,
      y: this.startPan.y + dy
    }
    
    // Update pan
    canvas.setPan(newPan)
  }
  
  onMouseUp(_event: ToolEvent): void {
    if (!this.isPanning) return
    
    const canvas = this.getCanvas()
    
    // Stop panning
    this.isPanning = false
    this.startPoint = null
    this.startPan = null
    
    // Reset cursor
    canvas.konvaStage.container().style.cursor = this.cursor
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Space bar temporarily activates hand tool
    if (event.code === 'Space' && !event.repeat) {
      const canvas = this.getCanvas()
      canvas.konvaStage.container().style.cursor = 'grab'
    }
  }
  
  onKeyUp(event: KeyboardEvent): void {
    // Release space bar deactivates temporary hand tool
    if (event.code === 'Space') {
      const canvas = this.getCanvas()
      canvas.konvaStage.container().style.cursor = this.cursor
      
      // Stop any active panning
      if (this.isPanning) {
        this.isPanning = false
        this.startPoint = null
        this.startPan = null
      }
    }
  }
  
  /**
   * Pan to specific position for AI operations
   */
  async panToPosition(position: Point): Promise<void> {
    const canvas = this.getCanvas()
    
    // Calculate pan to center the position
    const stageWidth = canvas.konvaStage.width()
    const stageHeight = canvas.konvaStage.height()
    
    const newPan = {
      x: -position.x + stageWidth / 2,
      y: -position.y + stageHeight / 2
    }
    
    canvas.setPan(newPan)
  }
  
  /**
   * Pan by delta amount
   */
  async panByDelta(delta: Point): Promise<void> {
    const canvas = this.getCanvas()
    const currentPan = canvas.state.pan
    
    const newPan = {
      x: currentPan.x + delta.x,
      y: currentPan.y + delta.y
    }
    
    canvas.setPan(newPan)
  }
}

// Export singleton instance
export const handTool = new HandTool() 