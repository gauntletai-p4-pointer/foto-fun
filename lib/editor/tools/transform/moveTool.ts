import { Move } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { ActiveSelection } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { TransformCommand } from '@/lib/editor/commands/canvas'
import { isSystemObject, filterOutSystemObjects } from '@/lib/editor/utils/systemObjects'

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
   * Get show transform controls option value
   */
  private get showTransform(): boolean {
    return this.toolOptionsStore.getOptionValue<boolean>(this.id, 'showTransform') ?? true
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
    
    // Filter out system objects from selections
    this.addCanvasEvent('selection:created', (e: unknown) => {
      this.filterSystemObjectsFromSelection(e as { selected: FabricObject[] })
    })
    
    this.addCanvasEvent('selection:updated', (e: unknown) => {
      this.filterSystemObjectsFromSelection(e as { selected: FabricObject[] })
    })
    
    // Subscribe to option changes
    this.subscribeToToolOptions(() => {
      this.updateObjectSelectability(canvas)
      this.updateTransformControls(canvas)
    })
    
    // Update transform controls visibility
    this.updateTransformControls(canvas)
    
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
    canvas.forEachObject((obj) => {
      // Skip system objects like selection overlays
      if (isSystemObject(obj)) return
      
      // Always make objects selectable when Move tool is active
      obj.selectable = true
      obj.evented = true
      
      // The auto-select option just controls whether clicking automatically selects
      // It doesn't affect whether objects CAN be selected
    })
  }
  
  /**
   * Update transform controls visibility
   */
  private updateTransformControls(canvas: Canvas): void {
    const showTransform = this.showTransform
    
    canvas.forEachObject((obj) => {
      // Skip system objects like selection overlays
      if (isSystemObject(obj)) return
      
      // Control visibility of transform handles
      obj.hasControls = showTransform
      obj.hasBorders = showTransform
      
      // Ensure rotation is not locked when transform controls are shown
      if (showTransform) {
        obj.lockRotation = false
      }
    })
    
    // Update active object if any
    const activeObject = canvas.getActiveObject()
    if (activeObject && !isSystemObject(activeObject)) {
      activeObject.hasControls = showTransform
      activeObject.hasBorders = showTransform
      activeObject.lockRotation = false
      canvas.renderAll()
    }
  }
  
  /**
   * Handle mouse down - auto-select objects if enabled
   */
  private handleMouseDown(e: { target: FabricObject | null }): void {
    if (!this.canvas || !this.autoSelect) return
    
    this.track('mouseDown', () => {
      if (e.target && this.canvas) {
        // Don't select system objects
        if (isSystemObject(e.target)) return
        
        // Auto-select the clicked object
        this.canvas.setActiveObject(e.target)
        this.state.set('lastActiveObject', e.target)
        
        // Ensure transform controls are visible on the selected object
        const showTransform = this.showTransform
        e.target.hasControls = showTransform
        e.target.hasBorders = showTransform
        e.target.lockRotation = false
        
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
  
  /**
   * Filter system objects from selection
   * This prevents selection overlays and other system objects from being selected
   */
  private filterSystemObjectsFromSelection(e: { selected: FabricObject[] }): void {
    if (!this.canvas || !e.selected || e.selected.length === 0) return
    
    // Filter out any objects marked as system objects
    const validObjects = filterOutSystemObjects(e.selected)
    
    // If all objects were filtered out, clear the selection
    if (validObjects.length === 0) {
      this.canvas.discardActiveObject()
      this.canvas.renderAll()
    } 
    // If some objects were filtered out, update the selection
    else if (validObjects.length !== e.selected.length) {
      this.canvas.discardActiveObject()
      
      // Re-select only the valid objects
      if (validObjects.length === 1) {
        this.canvas.setActiveObject(validObjects[0])
      } else {
        // Create a new active selection with the valid objects
        const activeSelection = new ActiveSelection(validObjects, {
          canvas: this.canvas
        })
        this.canvas.setActiveObject(activeSelection)
      }
      
      this.canvas.renderAll()
    }
  }
}

// Export singleton instance
export const moveTool = new MoveTool() 