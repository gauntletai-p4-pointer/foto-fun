import { BaseTool, type ToolOptions, type ToolDependencies } from './BaseTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { Point } from '@/lib/editor/canvas/types'
import { ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

/**
 * Base class for all object-based tools
 * Provides common functionality for working with objects instead of layers
 */
export abstract class ObjectTool<TOptions extends ToolOptions = {}> extends BaseTool<TOptions> {
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
  }
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
    const canvas = this.dependencies.canvasManager
    const selectedIds = Array.from(canvas.state.selectedObjectIds)
    if (selectedIds.length === 0) return null
    return canvas.getObject(selectedIds[0])
  }
  
  /**
   * Get all currently selected objects
   */
  protected getTargetObjects(): CanvasObject[] {
    const canvas = this.dependencies.canvasManager
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
    const canvas = this.dependencies.canvasManager
    
    // Use last mouse position or center of viewport
    const viewport = canvas.getViewport()
    const x = data.x ?? this.lastMousePosition?.x ?? viewport.width / 2
    const y = data.y ?? this.lastMousePosition?.y ?? viewport.height / 2
    
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
    return this.dependencies.canvasManager.state.selectedObjectIds.size > 0
  }
  
  /**
   * Get objects in the current viewport
   */
  protected getVisibleObjects(): CanvasObject[] {
    const canvas = this.dependencies.canvasManager
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
    const canvas = this.dependencies.canvasManager
    const object = canvas.getObject(objectId)
    if (!object) return
    
    const previousState = { ...object }
    await canvas.updateObject(objectId, updates)
    
    // TODO: Emit object modification event when EventRegistry is updated
    // this.dependencies.eventBus.emit('object.modified', {
    //   objectId,
    //   object,
    //   previousState,
    //   updates,
    //   timestamp: Date.now()
    // })
  }
} 