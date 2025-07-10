import type { FabricObject } from 'fabric'
import type { Canvas } from 'fabric'
import { nanoid } from 'nanoid'

/**
 * SelectionSnapshot - Immutable snapshot of canvas selection state
 * 
 * This is the foundation of our robust selection system. Once created,
 * a snapshot cannot be modified, ensuring consistent behavior across
 * all operations.
 */
export class SelectionSnapshot {
  public readonly id: string
  public readonly timestamp: number
  public readonly objects: ReadonlyArray<FabricObject>
  public readonly objectIds: ReadonlySet<string>
  public readonly isEmpty: boolean
  public readonly count: number
  public readonly types: ReadonlySet<string>
  
  constructor(objects: FabricObject[]) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.objects = Object.freeze([...objects])
    
    // Extract and freeze metadata
    const ids = new Set<string>()
    const types = new Set<string>()
    
    objects.forEach(obj => {
      const id = (obj as FabricObject & { id?: string }).id
      if (id) ids.add(id)
      if (obj.type) types.add(obj.type)
    })
    
    this.objectIds = Object.freeze(ids)
    this.types = Object.freeze(types)
    this.isEmpty = objects.length === 0
    this.count = objects.length
  }
  
  /**
   * Filter objects by type
   */
  getObjectsByType(type: string): FabricObject[] {
    return this.objects.filter(obj => obj.type === type)
  }
  
  /**
   * Check if snapshot contains a specific object
   */
  contains(objectOrId: FabricObject | string): boolean {
    if (typeof objectOrId === 'string') {
      return this.objectIds.has(objectOrId)
    }
    const id = (objectOrId as FabricObject & { id?: string }).id
    return id ? this.objectIds.has(id) : false
  }
  
  /**
   * Get only image objects
   */
  getImages(): FabricObject[] {
    return this.getObjectsByType('image')
  }
  
  /**
   * Get only text objects
   */
  getTextObjects(): FabricObject[] {
    return this.objects.filter(obj => 
      obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox'
    )
  }
  
  /**
   * Check if all objects in the snapshot still exist on canvas
   */
  verifyIntegrity(canvas: Canvas): boolean {
    const canvasObjects = canvas.getObjects()
    const canvasObjectSet = new Set(canvasObjects)
    
    // Check if all snapshot objects still exist
    for (const obj of this.objects) {
      if (!canvasObjectSet.has(obj)) {
        console.warn(`[SelectionSnapshot ${this.id}] Object no longer exists on canvas`)
        return false
      }
    }
    
    return true
  }
  
  /**
   * Get valid objects that still exist on canvas
   */
  getValidObjects(canvas: Canvas): FabricObject[] {
    const canvasObjects = canvas.getObjects()
    const canvasObjectSet = new Set(canvasObjects)
    
    return this.objects.filter(obj => canvasObjectSet.has(obj))
  }
}

/**
 * Factory for creating selection snapshots
 */
export class SelectionSnapshotFactory {
  /**
   * Create snapshot from current canvas selection
   */
  static fromCanvas(canvas: Canvas): SelectionSnapshot {
    const activeObjects = canvas.getActiveObjects()
    return new SelectionSnapshot(activeObjects)
  }
  
  /**
   * Create snapshot from specific objects
   */
  static fromObjects(objects: FabricObject[]): SelectionSnapshot {
    return new SelectionSnapshot(objects)
  }
  
  /**
   * Create snapshot with fallback logic
   * If no selection, optionally include all objects of a type
   */
  static fromCanvasWithFallback(
    canvas: Canvas,
    fallbackType?: string
  ): SelectionSnapshot {
    const activeObjects = canvas.getActiveObjects()
    
    if (activeObjects.length > 0) {
      return new SelectionSnapshot(activeObjects)
    }
    
    if (fallbackType) {
      const allOfType = canvas.getObjects().filter(obj => obj.type === fallbackType)
      return new SelectionSnapshot(allOfType)
    }
    
    return new SelectionSnapshot([])
  }
}

/**
 * Selection validation rules
 */
export class SelectionValidator {
  /**
   * Validate selection for a specific operation
   */
  static validate(
    snapshot: SelectionSnapshot,
    requirements: {
      minCount?: number
      maxCount?: number
      requiredTypes?: string[]
      allowEmpty?: boolean
    }
  ): { valid: boolean; error?: string } {
    // Check empty
    if (snapshot.isEmpty && !requirements.allowEmpty) {
      return { 
        valid: false, 
        error: 'Please select at least one object' 
      }
    }
    
    // Check count
    if (requirements.minCount && snapshot.count < requirements.minCount) {
      return { 
        valid: false, 
        error: `Please select at least ${requirements.minCount} object(s)` 
      }
    }
    
    if (requirements.maxCount && snapshot.count > requirements.maxCount) {
      return { 
        valid: false, 
        error: `Please select at most ${requirements.maxCount} object(s)` 
      }
    }
    
    // Check types
    if (requirements.requiredTypes) {
      const hasRequiredType = requirements.requiredTypes.some(type => 
        snapshot.types.has(type)
      )
      if (!hasRequiredType) {
        return { 
          valid: false, 
          error: `Please select ${requirements.requiredTypes.join(' or ')} objects` 
        }
      }
    }
    
    return { valid: true }
  }
} 