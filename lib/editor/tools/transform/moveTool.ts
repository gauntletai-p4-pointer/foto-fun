import { Move } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { TransformCommand } from '@/lib/editor/commands/canvas'

// Move tool state
type MoveToolState = {
  isDragging: boolean
  lastActiveObject: FabricObject | null
  initialTransform: ReturnType<typeof TransformCommand.captureState> | null
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
    lastActiveObject: null,
    initialTransform: null
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
    
    this.addCanvasEvent('object:moving', (e: unknown) => {
      const event = e as { target: FabricObject }
      this.handleObjectMoving(event)
    })
    
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
   * Handle object moving - track drag state and capture initial transform
   */
  private handleObjectMoving(e: { target: FabricObject }): void {
    // Capture initial state on first move
    if (!this.state.get('isDragging')) {
      this.state.set('isDragging', true)
      this.state.set('initialTransform', TransformCommand.captureState(e.target))
    }
  }
  
  /**
   * Handle object modified - record command for history
   */
  private handleObjectModified(e: { target: FabricObject }): void {
    if (!this.canvas) return
    
    this.trackAsync('objectModified', async () => {
      const initialTransform = this.state.get('initialTransform')
      
      if (initialTransform) {
        // Capture final state
        const finalTransform = TransformCommand.captureState(e.target)
        
        // Create and execute transform command
        const command = new TransformCommand(
          this.canvas!,
          e.target,
          initialTransform,
          finalTransform
        )
        
        await this.executeCommand(command)
      }
      
      // Reset state
      this.state.set('isDragging', false)
      this.state.set('initialTransform', null)
    })
  }
}

// Export singleton instance
export const moveTool = new MoveTool() 