import type { CanvasObject } from '@/lib/editor/objects/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
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
  public readonly objects: ReadonlyArray<CanvasObject>
  public readonly objectIds: ReadonlySet<string>
  public readonly isEmpty: boolean
  public readonly count: number
  public readonly types: ReadonlySet<string>
  
  constructor(objects: CanvasObject[]) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.objects = Object.freeze([...objects])
    
    // Extract and freeze metadata
    const ids = new Set<string>()
    const types = new Set<string>()
    
    objects.forEach(obj => {
      ids.add(obj.id)
      types.add(obj.type)
    })
    
    this.objectIds = Object.freeze(ids)
    this.types = Object.freeze(types)
    this.isEmpty = objects.length === 0
    this.count = objects.length
  }
  
  /**
   * Filter objects by type
   */
  getObjectsByType(type: string): CanvasObject[] {
    return this.objects.filter(obj => obj.type === type)
  }
  
  /**
   * Check if snapshot contains a specific object
   */
  contains(objectOrId: CanvasObject | string): boolean {
    if (typeof objectOrId === 'string') {
      return this.objectIds.has(objectOrId)
    }
    return this.objectIds.has(objectOrId.id)
  }
  
  /**
   * Get only image objects
   */
  getImages(): CanvasObject[] {
    return this.getObjectsByType('image')
  }
  
  /**
   * Get only text objects
   */
  getTextObjects(): CanvasObject[] {
    return this.objects.filter(obj => 
      obj.type === 'text' || obj.type === 'verticalText'
    )
  }
  
  /**
   * Check if all objects in the snapshot still exist on canvas
   */
  verifyIntegrity(canvas: CanvasManager): boolean {
    // Check if all snapshot objects still exist by ID
    for (const obj of this.objects) {
      const foundObject = canvas.getObject(obj.id)
      if (!foundObject) {
        console.warn(`[SelectionSnapshot ${this.id}] Object ${obj.id} no longer exists on canvas`)
        return false
      }
    }
    
    return true
  }
  
  /**
   * Get valid objects that still exist on canvas
   */
  getValidObjects(canvas: CanvasManager): CanvasObject[] {
    return this.objects.filter(obj => {
      const foundObject = canvas.getObject(obj.id)
      return foundObject !== null
    })
  }
}

/**
 * Factory for creating selection snapshots
 */
export class SelectionSnapshotFactory {
  /**
   * Create snapshot from current canvas selection
   */
  static fromCanvas(canvas: CanvasManager): SelectionSnapshot {
    const selection = canvas.state.selection
    const selectedObjects: CanvasObject[] = []
    
    if (selection?.type === 'objects') {
      selection.objectIds.forEach(id => {
        const obj = canvas.findObject(id)
        if (obj) selectedObjects.push(obj)
      })
    }
    
    return new SelectionSnapshot(selectedObjects)
  }
  
  /**
   * Create snapshot from specific objects
   */
  static fromObjects(objects: CanvasObject[]): SelectionSnapshot {
    return new SelectionSnapshot(objects)
  }
  
  /**
   * Create snapshot with fallback logic
   * If no selection, optionally include all objects of a type
   */
  static fromCanvasWithFallback(
    canvas: CanvasManager,
    fallbackType?: string
  ): SelectionSnapshot {
    const selection = canvas.state.selection
    const selectedObjects: CanvasObject[] = []
    
    if (selection?.type === 'objects' && selection.objectIds.length > 0) {
      selection.objectIds.forEach(id => {
        const obj = canvas.findObject(id)
        if (obj) selectedObjects.push(obj)
      })
      return new SelectionSnapshot(selectedObjects)
    }
    
    if (fallbackType) {
      const allObjects = canvas.getAllObjects()
      const allOfType = allObjects.filter(obj => obj.type === fallbackType)
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