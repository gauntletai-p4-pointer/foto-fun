import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'

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
  
  // For class instances (like Fabric filters), we need to handle them specially
  if (typeof value === 'object' && 'type' in value) {
    // This is likely a Fabric filter or similar object
    // We'll store it as-is since Fabric will handle the recreation
    return value
  }
  
  // Primitive values
  return value
}

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
    this.newProperties = deepClone(properties) as Record<string, unknown>
    
    // Capture old properties with deep cloning
    this.oldProperties = {}
    for (const key in properties) {
      const value = object.get(key as keyof typeof object)
      this.oldProperties[key] = deepClone(value)
    }
  }
  
  async execute(): Promise<void> {
    console.log('[ModifyCommand] Executing with properties:', this.newProperties)
    console.log('[ModifyCommand] Object before modification:', {
      type: this.object.type,
      angle: this.object.angle,
      left: this.object.left,
      top: this.object.top,
      centeredRotation: this.object.centeredRotation,
      originX: this.object.originX,
      originY: this.object.originY
    })
    
    this.object.set(this.newProperties)
    
    console.log('[ModifyCommand] Object after modification:', {
      type: this.object.type,
      angle: this.object.angle,
      left: this.object.left,
      top: this.object.top,
      centeredRotation: this.object.centeredRotation,
      originX: this.object.originX,
      originY: this.object.originY
    })
    
    // If we're setting filters, we need to apply them
    if ('filters' in this.newProperties && 'applyFilters' in this.object) {
      const imageObject = this.object as FabricObject & { applyFilters: () => void }
      imageObject.applyFilters()
    }
    
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    this.object.set(this.oldProperties)
    
    // If we're setting filters, we need to apply them
    if ('filters' in this.oldProperties && 'applyFilters' in this.object) {
      const imageObject = this.object as FabricObject & { applyFilters: () => void }
      imageObject.applyFilters()
    }
    
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    this.object.set(this.newProperties)
    
    // If we're setting filters, we need to apply them
    if ('filters' in this.newProperties && 'applyFilters' in this.object) {
      const imageObject = this.object as FabricObject & { applyFilters: () => void }
      imageObject.applyFilters()
    }
    
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