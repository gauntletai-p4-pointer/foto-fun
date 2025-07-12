import { Command } from '../base/Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export class UpdateObjectCommand extends Command {
  private previousState: Partial<CanvasObject> | null = null
  
  constructor(
    eventBus: TypedEventBus,
    private canvas: CanvasManager,
    private objectId: string,
    private updates: Partial<CanvasObject>
  ) {
    super(`Update object`, eventBus)
  }
  
  protected async doExecute(): Promise<void> {
    const object = this.canvas.getObject(this.objectId)
    if (!object) {
      throw new Error(`Object ${this.objectId} not found`)
    }
    
    // Store previous state for undo
    this.previousState = {}
    for (const key of Object.keys(this.updates) as (keyof CanvasObject)[]) {
      if (key in object) {
        // Type-safe property assignment using computed property access
        this.previousState = {
          ...this.previousState,
          [key]: object[key]
        }
      }
    }
    
    // Apply updates
    await this.canvas.updateObject(this.objectId, this.updates)
  }
  
  async undo(): Promise<void> {
    if (!this.previousState) return
    
    // Restore previous state
    await this.canvas.updateObject(this.objectId, this.previousState)
  }
  
  canMergeWith(other: Command): boolean {
    // Merge consecutive updates to the same object
    return other instanceof UpdateObjectCommand && 
           other.objectId === this.objectId &&
           this.metadata.source === other.metadata.source
  }
  
  mergeWith(other: Command): void {
    if (!(other instanceof UpdateObjectCommand)) return
    
    // Merge the updates
    this.updates = { ...this.updates, ...other.updates }
  }
} 