import { BaseTool } from './BaseTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { Point } from '@/lib/editor/canvas/types'
import { ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

/**
 * Base class for all object-based tools
 * Provides common functionality for working with objects instead of layers
 */
export abstract class ObjectTool extends BaseTool {
  // Override requirements - no document or layers needed
  protected requirements = {
    needsDocument: false,
    needsSelection: false,
    needsLayers: false
  }
  
  // Track last mouse position for object creation
  protected lastMousePosition: Point | null = null
  
  /**
   * Get the currently selected object (first one if multiple)
   */
  protected getTargetObject(): CanvasObject | null {
    const canvas = this.getCanvas()
    const selectedIds = Array.from(canvas.state.selectedObjectIds)
    if (selectedIds.length === 0) return null
    return canvas.getObject(selectedIds[0])
  }
  
  /**
   * Get all currently selected objects
   */
  protected getTargetObjects(): CanvasObject[] {
    const canvas = this.getCanvas()
    const selectedIds = Array.from(canvas.state.selectedObjectIds)
    return selectedIds.map(id => canvas.getObject(id)).filter(Boolean) as CanvasObject[]
  }
  
  /**
   * Create a new object on the canvas
   */
  protected async createNewObject(
    type: CanvasObject['type'], 
    data: Partial<CanvasObject>
  ): Promise<string> {
    const canvas = this.getCanvas()
    
    // Use last mouse position or center of viewport
    const x = data.x ?? this.lastMousePosition?.x ?? canvas.state.canvasWidth / 2
    const y = data.y ?? this.lastMousePosition?.y ?? canvas.state.canvasHeight / 2
    
    return canvas.addObject({
      type,
      ...data,
      x,
      y
    })
  }
  
  /**
   * Check if we have any selected objects
   */
  protected hasSelection(): boolean {
    return this.getCanvas().state.selectedObjectIds.size > 0
  }
  
  /**
   * Get objects in the current viewport
   */
  protected getVisibleObjects(): CanvasObject[] {
    const canvas = this.getCanvas()
    // @ts-expect-error - getViewportBounds exists on our CanvasManager implementation
    const viewport = canvas.getViewportBounds()
    return canvas.getObjectsInBounds(viewport)
  }
  
  /**
   * Helper to emit object modification events
   */
  protected async modifyObject(
    objectId: string, 
    updates: Partial<CanvasObject>,
    _eventType: string = 'modified'
  ): Promise<void> {
    const canvas = this.getCanvas()
    const object = canvas.getObject(objectId)
    if (!object) return
    
    const previousState = { ...object }
    await canvas.updateObject(objectId, updates)
    
    // Emit event through execution context if available
    if (this.executionContext) {
      await this.executionContext.emit(new ObjectModifiedEvent(
        'canvas',
        object,
        previousState,
        updates,
        this.executionContext.getMetadata()
      ))
    }
  }
} 