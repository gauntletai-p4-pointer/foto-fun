import { Move } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { BaseTool } from './base/BaseTool'
import { createToolState } from './utils/toolState'

// Move tool state
type MoveToolState = {
  isDragging: boolean
  lastActiveObject: FabricObject | null
}

/**
 * Move Tool - Allows selecting and moving objects on the canvas
 * Migrated to new architecture with proper state management
 */
class MoveTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.MOVE
  name = 'Move Tool'
  icon = Move
  cursor = 'move'
  shortcut = 'V'
  
  // Encapsulated state
  private state = createToolState<MoveToolState>({
    isDragging: false,
    lastActiveObject: null
  })
  
  /**
   * Get auto-select option value
   */
  private get autoSelect(): boolean {
    return this.toolOptionsStore.getOptionValue<boolean>(this.id, 'autoSelect') ?? true
  }
  
  /**
   * Tool setup - enable selection and configure objects
   */
  protected setupTool(canvas: Canvas): void {
    // Enable object selection
    canvas.selection = true
    
    // Configure object selectability based on auto-select
    this.updateObjectSelectability(canvas)
    
    // Set up event handlers using BaseTool's event management
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      const event = e as { target: FabricObject | null }
      this.handleMouseDown(event)
    })
    
    this.addCanvasEvent('object:moving', () => this.handleObjectMoving())
    this.addCanvasEvent('object:modified', (e: unknown) => {
      this.handleObjectModified(e as { target: FabricObject })
    })
    
    // Subscribe to option changes
    this.subscribeToToolOptions(() => {
      this.updateObjectSelectability(canvas)
    })
    
    canvas.renderAll()
  }
  
  /**
   * Tool cleanup - deselect objects
   */
  protected cleanup(canvas: Canvas): void {
    // Deselect any active objects
    canvas.discardActiveObject()
    
    // Reset state
    this.state.reset()
    
    canvas.renderAll()
  }
  
  /**
   * Update object selectability based on auto-select option
   */
  private updateObjectSelectability(canvas: Canvas): void {
    const autoSelect = this.autoSelect
    
    canvas.forEachObject((obj) => {
      obj.selectable = autoSelect
      obj.evented = autoSelect
    })
  }
  
  /**
   * Handle mouse down - auto-select objects if enabled
   */
  private handleMouseDown(e: { target: FabricObject | null }): void {
    if (!this.canvas || !this.autoSelect) return
    
    this.track('mouseDown', () => {
      if (e.target && this.canvas) {
        // Auto-select the clicked object
        this.canvas.setActiveObject(e.target)
        this.state.set('lastActiveObject', e.target)
        this.canvas.renderAll()
      }
    })
  }
  
  /**
   * Handle object moving - track drag state
   */
  private handleObjectMoving(): void {
    this.state.set('isDragging', true)
  }
  
  /**
   * Handle object modified - record command for history
   */
  private handleObjectModified(e: { target: FabricObject }): void {
    if (!this.canvas) return
    
    this.track('objectModified', () => {
      this.state.set('isDragging', false)
      
      // TODO: Create and execute a TransformCommand when command system is implemented
      // For now, just log the modification
      console.log('Object modified:', {
        object: e.target.type,
        left: e.target.left,
        top: e.target.top,
        scaleX: e.target.scaleX,
        scaleY: e.target.scaleY,
        angle: e.target.angle
      })
    })
  }
}

// Export singleton instance
export const moveTool = new MoveTool() 