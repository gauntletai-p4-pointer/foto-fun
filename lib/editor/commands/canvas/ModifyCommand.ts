import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'

/**
 * Command to modify object properties (color, opacity, etc.)
 */
export class ModifyCommand extends Command {
  private canvas: Canvas
  private object: FabricObject
  private oldProperties: Record<string, unknown>
  private newProperties: Record<string, unknown>
  
  constructor(
    canvas: Canvas, 
    object: FabricObject, 
    properties: Record<string, unknown>,
    description?: string
  ) {
    super(description || `Modify ${object.type || 'object'} properties`)
    this.canvas = canvas
    this.object = object
    this.newProperties = { ...properties }
    
    // Capture old properties
    this.oldProperties = {}
    for (const key in properties) {
      this.oldProperties[key] = object.get(key as keyof typeof object)
    }
  }
  
  async execute(): Promise<void> {
    this.object.set(this.newProperties)
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    this.object.set(this.oldProperties)
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    this.object.set(this.newProperties)
    this.canvas.renderAll()
  }
  
  /**
   * Check if this command can be merged with another
   * We can merge consecutive property changes on the same object
   */
  canMergeWith(other: Command): boolean {
    return other instanceof ModifyCommand && 
           other.object === this.object &&
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