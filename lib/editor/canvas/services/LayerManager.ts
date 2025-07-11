import type { CanvasManager } from '../types'
import type { CanvasObject } from '@/lib/editor/objects/types'

export interface ObjectOptions {
  name?: string
  type?: 'image' | 'text' | 'shape' | 'group' | 'verticalText'
  fallbackToSelected?: boolean
  createIfMissing?: boolean
}

export interface ObjectHint {
  preferredId?: string
  preferredType?: CanvasObject['type']
  preferredName?: string
}

export interface ObjectStackInfo {
  objects: CanvasObject[]
  selectedObjectIds: Set<string>
  visibleObjects: CanvasObject[]
  lockedObjects: CanvasObject[]
  zIndexMap: Map<string, number>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Manages canvas objects with guaranteed operations and smart selection
 * Migrated from layer-based to object-based architecture
 */
export class LayerManager {
  private canvas: CanvasManager
  
  constructor(canvas: CanvasManager) {
    this.canvas = canvas
  }
  
  /**
   * Ensure an object exists with the given options
   */
  async ensureObject(options: ObjectOptions): Promise<CanvasObject> {
    // Try to find existing object first
    if (options.name) {
      const existing = this.canvas.getAllObjects().find(o => o.name === options.name)
      if (existing) return existing
    }
    
    // Check if we should use selected object
    if (options.fallbackToSelected) {
      const selectedObjects = this.canvas.getSelectedObjects()
      if (selectedObjects.length > 0) {
        return selectedObjects[0]
      }
    }
    
    // Create new object if allowed
    if (options.createIfMissing !== false) {
      const objectId = await this.canvas.addObject({
        name: options.name || `Object ${this.canvas.getAllObjects().length + 1}`,
        type: options.type || 'image',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        data: options.type === 'text' ? {
          content: 'New Text',
          font: 'Arial',
          fontSize: 16,
          color: '#000000',
          align: 'left'
        } : {
          naturalWidth: 100,
          naturalHeight: 100,
          element: new HTMLCanvasElement()
        }
      })
      const newObject = this.canvas.getObject(objectId)
      if (!newObject) {
        throw new Error('Failed to create object')
      }
      return newObject
    }
    
    // Fallback to first available object
    const allObjects = this.canvas.getAllObjects()
    if (allObjects.length > 0) {
      return allObjects[0]
    }
    
    // Last resort: create a default object
    const objectId = await this.canvas.addObject({
      name: 'Default Object',
      type: 'image',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      data: {
        naturalWidth: 100,
        naturalHeight: 100,
        element: new HTMLCanvasElement()
      }
    })
    const defaultObject = this.canvas.getObject(objectId)
    if (!defaultObject) {
      throw new Error('Failed to create default object')
    }
    return defaultObject
  }
  
  /**
   * Get target object based on hints and preferences
   */
  async getTargetObject(hint?: ObjectHint): Promise<CanvasObject> {
    // 1. Try specific ID
    if (hint?.preferredId) {
      const object = this.canvas.getObject(hint.preferredId)
      if (object && !object.locked) return object
    }
    
    // 2. Try by name
    if (hint?.preferredName) {
      const object = this.canvas.getAllObjects().find(o => o.name === hint.preferredName)
      if (object && !object.locked) return object
    }
    
    // 3. Try by type
    if (hint?.preferredType) {
      const object = this.canvas.getAllObjects().find(o => o.type === hint.preferredType && !o.locked)
      if (object) return object
    }
    
    // 4. Use selected objects
    const selectedObjects = this.canvas.getSelectedObjects()
    if (selectedObjects.length > 0) {
      const firstUnlocked = selectedObjects.find(obj => !obj.locked)
      if (firstUnlocked) return firstUnlocked
    }
    
    // 5. Find first unlocked object
    const unlockedObject = this.canvas.getAllObjects().find(o => !o.locked)
    if (unlockedObject) return unlockedObject
    
    // 6. Create new object as last resort
    return this.ensureObject({
      name: 'Auto Object',
      type: 'image',
      createIfMissing: true
    })
  }
  
  /**
   * Get complete object stack information
   */
  getObjectStack(): ObjectStackInfo {
    const objects = this.canvas.getAllObjects()
    const zIndexMap = new Map<string, number>()
    
    // Build z-index map (0 is bottom, higher is on top)
    objects.forEach((object) => {
      zIndexMap.set(object.id, object.zIndex)
    })
    
    return {
      objects: [...objects],
      selectedObjectIds: new Set(this.canvas.state.selectedObjectIds),
      visibleObjects: objects.filter(o => o.visible),
      lockedObjects: objects.filter(o => o.locked),
      zIndexMap
    }
  }
  
  /**
   * Validate object hierarchy
   */
  validateObjectHierarchy(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const objects = this.canvas.getAllObjects()
    
    // Check for empty canvas (optional - can be valid)
    if (objects.length === 0) {
      warnings.push('No objects exist in canvas')
    }
    
    // Check selected object validity
    for (const selectedId of this.canvas.state.selectedObjectIds) {
      const objectExists = objects.some(o => o.id === selectedId)
      if (!objectExists) {
        errors.push(`Selected object ID references non-existent object: ${selectedId}`)
      }
    }
    
    // Check for duplicate IDs
    const ids = new Set<string>()
    for (const object of objects) {
      if (ids.has(object.id)) {
        errors.push(`Duplicate object ID found: ${object.id}`)
      }
      ids.add(object.id)
    }
    
    // Check object structure
    for (const object of objects) {
      // Validate required properties
      if (typeof object.x !== 'number' || typeof object.y !== 'number') {
        errors.push(`Object ${object.id} has invalid position`)
      }
      if (typeof object.width !== 'number' || typeof object.height !== 'number') {
        errors.push(`Object ${object.id} has invalid dimensions`)
      }
      if (!object.data) {
        errors.push(`Object ${object.id} is missing data property`)
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Fix common object issues
   */
  async repairObjects(): Promise<void> {
    const validation = this.validateObjectHierarchy()
    
    if (validation.valid && validation.warnings.length === 0) {
      return // Nothing to fix
    }
    
    console.log('[LayerManager] Repairing objects...', validation)
    
    // Fix invalid selected objects
    const objects = this.canvas.getAllObjects()
    const objectIds = new Set(objects.map(o => o.id))
    const validSelectedIds = Array.from(this.canvas.state.selectedObjectIds)
      .filter(id => objectIds.has(id))
    
    // Update selection to only include valid objects
    if (validSelectedIds.length !== this.canvas.state.selectedObjectIds.size) {
      this.canvas.state.selectedObjectIds = new Set(validSelectedIds)
    }
    
    // Force re-render
    this.canvas.stage.batchDraw()
  }
  
  /**
   * Get object by various criteria
   */
  findObject(criteria: {
    id?: string
    name?: string
    type?: CanvasObject['type']
    isSelected?: boolean
  }): CanvasObject | null {
    return this.canvas.getAllObjects().find(object => {
      if (criteria.id && object.id !== criteria.id) return false
      if (criteria.name && object.name !== criteria.name) return false
      if (criteria.type && object.type !== criteria.type) return false
      if (criteria.isSelected !== undefined) {
        const isSelected = this.canvas.state.selectedObjectIds.has(object.id)
        if (criteria.isSelected !== isSelected) return false
      }
      return true
    }) || null
  }
  
  /**
   * Move object to specific z-index
   */
  async moveObjectToIndex(objectId: string, newIndex: number): Promise<void> {
    const object = this.canvas.getObject(objectId)
    if (!object) {
      console.error(`Object ${objectId} not found`)
      return
    }
    
    // Clamp index to valid range
    const maxIndex = this.canvas.getAllObjects().length - 1
    const targetIndex = Math.max(0, Math.min(maxIndex, newIndex))
    
    // Update object z-index
    await this.canvas.updateObject(objectId, {
      zIndex: targetIndex
    })
  }
  
  /**
   * Create object with auto-positioning
   */
  async createSmartObject(options: {
    basedOn?: 'selection' | 'selectedObjects' | 'top'
    name?: string
    type?: CanvasObject['type']
    x?: number
    y?: number
  }): Promise<CanvasObject> {
    const name = options.name || `Object ${this.canvas.getAllObjects().length + 1}`
    const type = options.type || 'image'
    
    // Determine position
    let x = options.x ?? 100
    let y = options.y ?? 100
    let zIndex = this.canvas.getAllObjects().length // Place on top by default
    
    // Position based on strategy
    switch (options.basedOn) {
      case 'selection':
      case 'selectedObjects':
        // Place above selected objects and near them
        const selectedObjects = this.canvas.getSelectedObjects()
        if (selectedObjects.length > 0) {
          const highestZIndex = this.getHighestZIndexForObjects(selectedObjects.map(o => o.id))
          zIndex = highestZIndex + 1
          
          // Position near the first selected object
          const firstSelected = selectedObjects[0]
          x = firstSelected.x + 20
          y = firstSelected.y + 20
        }
        break
        
      case 'top':
      default:
        // Already positioned at top (default behavior)
        break
    }
    
    // Create the object
    const objectId = await this.canvas.addObject({
      name,
      type,
      x,
      y,
      width: 100,
      height: 100,
      zIndex,
      data: type === 'text' ? {
        content: name,
        font: 'Arial',
        fontSize: 16,
        color: '#000000',
        align: 'left'
      } : {
        naturalWidth: 100,
        naturalHeight: 100,
        element: new HTMLCanvasElement()
      }
    })
    
    const newObject = this.canvas.getObject(objectId)
    if (!newObject) {
      throw new Error('Failed to create object')
    }
    return newObject
  }
  
  /**
   * Get highest z-index of the specified objects
   */
  private getHighestZIndexForObjects(objectIds: string[]): number {
    let highestZIndex = -1
    
    for (const id of objectIds) {
      const object = this.canvas.getObject(id)
      if (object) {
        highestZIndex = Math.max(highestZIndex, object.zIndex)
      }
    }
    
    return highestZIndex
  }
} 