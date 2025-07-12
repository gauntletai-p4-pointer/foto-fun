import { Command } from '../base'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Deep clone a value to ensure proper undo/redo
 */
function deepClone(value: unknown): unknown {
  if (value === null || value === undefined) return value
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item))
  }
  
  // Handle objects (but not class instances)
  if (typeof value === 'object' && value.constructor === Object) {
    const cloned: Record<string, unknown> = {}
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = deepClone((value as Record<string, unknown>)[key])
      }
    }
    return cloned
  }
  
  // For class instances (like filters), we need to handle them specially
  if (typeof value === 'object' && 'type' in value) {
    // This is likely a filter or similar object
    // We'll store it as-is since the system will handle the recreation
    return value
  }
  
  // Primitive values
  return value
}

/**
 * Command to modify object properties (color, opacity, etc.)
 * Uses the event-driven architecture for state changes
 */
export class ModifyCommand extends Command {
  private canvasManager: CanvasManager
  private objectId: string
  private oldProperties: Record<string, unknown>
  private newProperties: Record<string, unknown>
  
  constructor(
    eventBus: TypedEventBus,
    canvasManager: CanvasManager, 
    object: CanvasObject, 
    properties: Record<string, unknown>,
    description?: string
  ) {
    super(description || `Modify ${object.type || 'object'} properties`, eventBus)
    this.canvasManager = canvasManager
    this.objectId = object.id
    this.newProperties = deepClone(properties) as Record<string, unknown>
    
    // Capture old properties with deep cloning
    this.oldProperties = {}
    for (const key in properties) {
      // Use bracket notation with proper type assertion
      const value = object[key as keyof CanvasObject]
      this.oldProperties[key] = deepClone(value)
    }
  }
  
  protected async doExecute(): Promise<void> {
    // Find the object
    const object = this.findObject(this.objectId)
    if (!object) {
      throw new Error(`Object ${this.objectId} not found`)
    }
    
    // Emit modification event using inherited eventBus
    this.eventBus.emit('canvas.object.modified', {
      canvasId: 'main', // TODO: Get actual canvas ID
      objectId: this.objectId,
      previousState: this.oldProperties,
      newState: this.newProperties
    })
    
    // Update the object through canvas manager
    await this.canvasManager.updateObject(this.objectId, this.newProperties)
  }
  
  async undo(): Promise<void> {
    // Find the object
    const object = this.findObject(this.objectId)
    if (!object) {
      throw new Error(`Object ${this.objectId} not found`)
    }
    
    // Emit modification event with reversed properties using inherited eventBus
    this.eventBus.emit('canvas.object.modified', {
      canvasId: 'main', // TODO: Get actual canvas ID
      objectId: this.objectId,
      previousState: this.newProperties,
      newState: this.oldProperties
    })
    
    // Update the object through canvas manager
    await this.canvasManager.updateObject(this.objectId, this.oldProperties)
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  /**
   * Find object by ID
   */
  private findObject(id: string): CanvasObject | null {
    return this.canvasManager.getObject(id)
  }
  
  /**
   * Check if this command can be merged with another
   * We can merge consecutive property changes on the same object
   */
  canMergeWith(other: Command): boolean {
    return other instanceof ModifyCommand && 
           other.objectId === this.objectId &&
           // Only merge if commands are close in time (within 500ms)
           Math.abs(other.timestamp - this.timestamp) < 500
  }
  
  /**
   * Merge with another modify command
   * Combine the property changes
   */
  mergeWith(other: Command): void {
    if (other instanceof ModifyCommand) {
      // Merge new properties
      Object.assign(this.newProperties, other.newProperties)
    }
  }
} 