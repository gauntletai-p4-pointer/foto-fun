import { Hand } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseTool } from './base/BaseTool'
import { createToolState } from './utils/toolState'

// Hand tool state
type HandToolState = {
  isPanning: boolean
  startX: number
  startY: number
}

/**
 * Hand Tool - Allows panning the canvas
 * Extends BaseTool for consistent tool behavior
 */
class HandTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.HAND
  name = 'Hand Tool'
  icon = Hand
  cursor = 'grab'
  shortcut = 'H'
  
  // Encapsulated state
  private state = createToolState<HandToolState>({
    isPanning: false,
    startX: 0,
    startY: 0
  })
  
  /**
   * Tool setup - disable object selection
   */
  protected setupTool(canvas: Canvas): void {
    // Disable object selection
    canvas.selection = false
    canvas.defaultCursor = 'grab'
    canvas.hoverCursor = 'grab'
    
    // Make all objects non-selectable
    canvas.forEachObject((obj) => {
      obj.selectable = false
      obj.evented = false
    })
    
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => this.handleMouseDown(e))
    this.addCanvasEvent('mouse:move', (e: unknown) => this.handleMouseMove(e))
    this.addCanvasEvent('mouse:up', () => this.handleMouseUp())
    
    canvas.renderAll()
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Reset cursor
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    
    // Reset state
    this.state.reset()
  }
  
  /**
   * Handle mouse down - start panning
   */
  private handleMouseDown(e: unknown): void {
    if (!this.canvas) return
    
    this.track('startPanning', () => {
      this.canvas!.setCursor('grabbing')
      
      // Get the event data
      const event = e as { e: MouseEvent }
      
      // Update local state
      this.state.setState({
        isPanning: true,
        startX: event.e.clientX,
        startY: event.e.clientY
      })
      
      // Use canvasStore for panning (it expects TPointerEventInfo<MouseEvent>)
      this.canvasStore.startPanning(e as Parameters<typeof this.canvasStore.startPanning>[0])
    })
  }
  
  /**
   * Handle mouse move - continue panning
   */
  private handleMouseMove(e: unknown): void {
    if (!this.canvas || !this.state.get('isPanning')) return
    
    this.track('pan', () => {
      // Use canvasStore for panning
      this.canvasStore.pan(e as Parameters<typeof this.canvasStore.pan>[0])
    })
  }
  
  /**
   * Handle mouse up - end panning
   */
  private handleMouseUp(): void {
    if (!this.canvas) return
    
    this.track('endPanning', () => {
      this.canvas!.setCursor('grab')
      this.canvasStore.endPanning()
      
      // Reset state
      this.state.setState({
        isPanning: false,
        startX: 0,
        startY: 0
      })
    })
  }
}

// Export singleton instance
export const handTool = new HandTool() 