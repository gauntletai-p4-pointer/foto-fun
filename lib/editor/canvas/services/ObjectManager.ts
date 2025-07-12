import { nanoid } from 'nanoid'
import type { CanvasManager } from '../CanvasManager'
import type { CanvasObject, ImageData, TextData, ShapeData, GroupData } from '@/lib/editor/objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { EventStore } from '@/lib/events/core/EventStore'
import { ObjectAddedEvent, ObjectRemovedEvent, ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

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
 * Unified Object Manager - Single source of truth for all object operations
 * Combines CRUD operations, event sourcing, smart operations, and validation
 * Modern object-based architecture for infinite canvas with dependency injection
 */
export class ObjectManager {
  // Core object storage
  private objects: Map<string, CanvasObject> = new Map()
  private objectOrder: string[] = [] // Z-order for rendering
  private nextZIndex = 1
  private canvasId: string
  
  // Dependencies (injected)
  private eventBus: TypedEventBus
  private eventStore: EventStore
  private canvasManager: CanvasManager | null = null
  
  constructor(
    canvasId: string,
    eventBus: TypedEventBus,
    eventStore: EventStore
  ) {
    this.canvasId = canvasId
    this.eventBus = eventBus
    this.eventStore = eventStore
  }
  
  /**
   * Set canvas manager reference (called after CanvasManager is created)
   * This avoids circular dependency issues
   */
  setCanvasManager(canvasManager: CanvasManager): void {
    this.canvasManager = canvasManager
  }
  
  // ================================
  // CORE CRUD OPERATIONS
  // ================================
  
  /**
   * Add object with full event sourcing
   */
  async addObject(objectData: Partial<CanvasObject>): Promise<string> {
    const id = objectData.id || nanoid()
    const newObject: CanvasObject = {
      id,
      name: objectData.name || `Object ${this.objects.size + 1}`,
      type: objectData.type || 'shape',
      zIndex: objectData.zIndex ?? this.nextZIndex++,
      x: objectData.x ?? 0,
      y: objectData.y ?? 0,
      width: objectData.width ?? 100,
      height: objectData.height ?? 100,
      rotation: objectData.rotation ?? 0,
      scaleX: objectData.scaleX ?? 1,
      scaleY: objectData.scaleY ?? 1,
      opacity: objectData.opacity ?? 1,
      blendMode: objectData.blendMode || 'normal',
      visible: objectData.visible ?? true,
      locked: objectData.locked ?? false,
      filters: objectData.filters || [],
      adjustments: objectData.adjustments || [],
      children: objectData.children,
      parent: objectData.parent,
      data: objectData.data || this.createDefaultData(objectData.type || 'shape'),
      metadata: objectData.metadata
    }
    
    this.objects.set(id, newObject)
    this.objectOrder.push(id)
    this.sortByZIndex()
    
    // Event sourcing
    await this.eventStore.append(
      new ObjectAddedEvent(
        this.canvasId,
        newObject,
        { source: 'system' }
      )
    )
    
    // Immediate UI updates
    this.eventBus.emit('canvas.object.added', { canvasId: this.canvasId, object: newObject })
    
    return id
  }
  
  /**
   * Remove object with cascade handling
   */
  async removeObject(objectId: string): Promise<void> {
    const object = this.objects.get(objectId)
    if (!object) return
    
    // If it's a group, remove all children first
    if (object.type === 'group' && object.children) {
      for (const childId of [...object.children]) {
        await this.removeObject(childId)
      }
    }
    
    // Remove from parent group if any
    for (const [_id, obj] of this.objects) {
      if (obj.type === 'group' && obj.children?.includes(objectId)) {
        obj.children = obj.children.filter(cId => cId !== objectId)
      }
    }
    
    this.objects.delete(objectId)
    this.objectOrder = this.objectOrder.filter(id => id !== objectId)
    
    // Event sourcing
    await this.eventStore.append(
      new ObjectRemovedEvent(
        this.canvasId,
        object,
        { source: 'system' }
      )
    )
    
    this.eventBus.emit('canvas.object.removed', { canvasId: this.canvasId, objectId })
  }
  
  /**
   * Update object with change tracking
   */
  async updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void> {
    const object = this.objects.get(objectId)
    if (!object) return
    
    const previousState = { ...object }
    
    // Apply updates
    Object.assign(object, updates)
    
    // Re-sort if z-index changed
    if (updates.zIndex !== undefined) {
      this.sortByZIndex()
    }
    
    // Event sourcing
    await this.eventStore.append(
      new ObjectModifiedEvent(
        this.canvasId,
        object,
        previousState,
        updates,
        { source: 'system' }
      )
    )
    
    this.eventBus.emit('canvas.object.modified', { 
      canvasId: this.canvasId, 
      objectId, 
      previousState, 
      newState: updates 
    })
  }
  
  /**
   * Get object by ID
   */
  getObject(objectId: string): CanvasObject | null {
    return this.objects.get(objectId) || null
  }
  
  /**
   * Get all objects
   */
  getAllObjects(): CanvasObject[] {
    return Array.from(this.objects.values())
  }
  
  /**
   * Get objects in render order
   */
  getObjectsInOrder(): CanvasObject[] {
    return this.objectOrder
      .map(id => this.objects.get(id))
      .filter((obj): obj is CanvasObject => obj !== undefined)
  }
  
  // ================================
  // SMART OPERATIONS
  // ================================
  
  /**
   * Ensure an object exists with the given options
   */
  async ensureObject(options: ObjectOptions): Promise<CanvasObject> {
    if (!this.canvasManager) {
      throw new Error('CanvasManager not set - call setCanvasManager() first')
    }
    
    // Try to find existing object first
    if (options.name) {
      const existing = this.getAllObjects().find(o => o.name === options.name)
      if (existing) return existing
    }
    
    // Check if we should use selected object
    if (options.fallbackToSelected) {
      const selectedObjects = this.getSelectedObjects()
      if (selectedObjects.length > 0) {
        return selectedObjects[0]
      }
    }
    
    // Create new object if allowed
    if (options.createIfMissing !== false) {
      const objectId = await this.addObject({
        name: options.name || `Object ${this.objects.size + 1}`,
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
      const newObject = this.getObject(objectId)
      if (!newObject) {
        throw new Error('Failed to create object')
      }
      return newObject
    }
    
    // Fallback to first available object
    const allObjects = this.getAllObjects()
    if (allObjects.length > 0) {
      return allObjects[0]
    }
    
    // Last resort: create a default object
    const objectId = await this.addObject({
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
    const defaultObject = this.getObject(objectId)
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
      const object = this.getObject(hint.preferredId)
      if (object && !object.locked) return object
    }
    
    // 2. Try by name
    if (hint?.preferredName) {
      const object = this.getAllObjects().find(o => o.name === hint.preferredName)
      if (object && !object.locked) return object
    }
    
    // 3. Try by type
    if (hint?.preferredType) {
      const object = this.getAllObjects().find(o => o.type === hint.preferredType && !o.locked)
      if (object) return object
    }
    
    // 4. Use selected objects
    const selectedObjects = this.getSelectedObjects()
    if (selectedObjects.length > 0) {
      const firstUnlocked = selectedObjects.find(obj => !obj.locked)
      if (firstUnlocked) return firstUnlocked
    }
    
    // 5. Find first unlocked object
    const unlockedObject = this.getAllObjects().find(o => !o.locked)
    if (unlockedObject) return unlockedObject
    
    // 6. Create new object as last resort
    return this.ensureObject({
      name: 'Auto Object',
      type: 'image',
      createIfMissing: true
    })
  }
  
  /**
   * Find object by various criteria
   */
  findObject(criteria: {
    id?: string
    name?: string
    type?: CanvasObject['type']
    isSelected?: boolean
  }): CanvasObject | null {
    const objects = this.getAllObjects()
    
    return objects.find(obj => {
      if (criteria.id && obj.id !== criteria.id) return false
      if (criteria.name && obj.name !== criteria.name) return false
      if (criteria.type && obj.type !== criteria.type) return false
      if (criteria.isSelected !== undefined) {
        const isSelected = this.getSelectedObjectIds().has(obj.id)
        if (isSelected !== criteria.isSelected) return false
      }
      return true
    }) || null
  }
  
  // ================================
  // SELECTION OPERATIONS
  // ================================
  
  /**
   * Select single object
   */
  selectObject(id: string): void {
    this.eventBus.emit('selection.changed', { 
      selection: { type: 'objects', objectIds: [id] } as import('@/lib/editor/canvas/types').Selection, 
      previousSelection: null 
    })
  }
  
  /**
   * Select multiple objects
   */
  selectMultiple(ids: string[]): void {
    this.eventBus.emit('selection.changed', { 
      selection: { type: 'objects', objectIds: ids } as import('@/lib/editor/canvas/types').Selection, 
      previousSelection: null 
    })
  }
  
  /**
   * Get selected objects
   */
  getSelectedObjects(): CanvasObject[] {
    if (!this.canvasManager) return []
    
    const selectedIds = this.canvasManager.state.selectedObjectIds
    return selectedIds
      .map(id => this.getObject(id))
      .filter((obj): obj is CanvasObject => obj !== null)
  }
  
  /**
   * Get selected object IDs
   */
  getSelectedObjectIds(): Set<string> {
    const selectedIds = this.canvasManager?.state.selectedObjectIds || []
    return new Set(selectedIds)
  }
  
  // ================================
  // TRANSFORM OPERATIONS
  // ================================
  
  /**
   * Move object to new position
   */
  async moveObject(id: string, x: number, y: number): Promise<void> {
    await this.updateObject(id, { x, y })
  }
  
  /**
   * Resize object
   */
  async resizeObject(id: string, width: number, height: number): Promise<void> {
    await this.updateObject(id, { width, height })
  }
  
  /**
   * Rotate object
   */
  async rotateObject(id: string, angle: number): Promise<void> {
    const object = this.getObject(id)
    if (!object) return
    
    await this.updateObject(id, { rotation: (object.rotation + angle) % 360 })
  }
  
  // ================================
  // Z-INDEX OPERATIONS
  // ================================
  
  /**
   * Bring object to front
   */
  async bringToFront(id: string): Promise<void> {
    const maxZIndex = Math.max(...this.getAllObjects().map(o => o.zIndex))
    await this.updateObject(id, { zIndex: maxZIndex + 1 })
  }
  
  /**
   * Send object to back
   */
  async sendToBack(id: string): Promise<void> {
    const minZIndex = Math.min(...this.getAllObjects().map(o => o.zIndex))
    await this.updateObject(id, { zIndex: minZIndex - 1 })
  }
  
  /**
   * Bring object forward
   */
  async bringForward(id: string): Promise<void> {
    const object = this.getObject(id)
    if (!object) return
    
    const objectsAbove = this.getAllObjects()
      .filter(o => o.zIndex > object.zIndex)
      .sort((a, b) => a.zIndex - b.zIndex)
    
    if (objectsAbove.length > 0) {
      await this.updateObject(id, { zIndex: objectsAbove[0].zIndex + 0.5 })
      this.reindexZOrder()
    }
  }
  
  /**
   * Send object backward
   */
  async sendBackward(id: string): Promise<void> {
    const object = this.getObject(id)
    if (!object) return
    
    const objectsBelow = this.getAllObjects()
      .filter(o => o.zIndex < object.zIndex)
      .sort((a, b) => b.zIndex - a.zIndex)
    
    if (objectsBelow.length > 0) {
      await this.updateObject(id, { zIndex: objectsBelow[0].zIndex - 0.5 })
      this.reindexZOrder()
    }
  }
  
  /**
   * Move object to specific index in render order
   */
  async moveObjectToIndex(objectId: string, newIndex: number): Promise<void> {
    const objects = this.getAllObjects()
    const targetObject = objects.find(o => o.id === objectId)
    if (!targetObject) return
    
    // Calculate new z-index based on position
    const sortedObjects = objects.sort((a, b) => a.zIndex - b.zIndex)
    const targetZIndex = newIndex < sortedObjects.length ? 
      sortedObjects[newIndex].zIndex : 
      sortedObjects[sortedObjects.length - 1].zIndex + 1
    
    await this.updateObject(objectId, { zIndex: targetZIndex })
  }
  
  // ================================
  // GROUP OPERATIONS
  // ================================
  
  /**
   * Create group from objects
   */
  async createGroup(objectIds: string[], name?: string): Promise<string> {
    const objects = objectIds.map(id => this.getObject(id)).filter(Boolean) as CanvasObject[]
    if (objects.length === 0) throw new Error('No valid objects to group')
    
    const bounds = this.calculateBounds(objects)
    const groupId = await this.addObject({
      name: name || `Group ${this.objects.size + 1}`,
      type: 'group',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      children: objectIds,
             data: { type: 'group', children: objectIds }
     })
     
     // Update children to reference parent
    for (const objectId of objectIds) {
      await this.updateObject(objectId, { parent: groupId })
    }
    
    return groupId
  }
  
  /**
   * Ungroup objects
   */
  async ungroup(groupId: string): Promise<string[]> {
    const group = this.getObject(groupId)
    if (!group || group.type !== 'group' || !group.children) {
      return []
    }
    
    const childIds = [...group.children]
    
    // Remove parent reference from children
    for (const childId of childIds) {
      await this.updateObject(childId, { parent: undefined })
    }
    
    // Remove the group
    await this.removeObject(groupId)
    
    return childIds
  }
  
  /**
   * Move object to group
   */
  async moveToGroup(objectId: string, groupId: string): Promise<void> {
    const object = this.getObject(objectId)
    const group = this.getObject(groupId)
    
    if (!object || !group || group.type !== 'group') return
    
    // Remove from current parent if any
    if (object.parent) {
      const currentParent = this.getObject(object.parent)
      if (currentParent && currentParent.children) {
        currentParent.children = currentParent.children.filter(id => id !== objectId)
        await this.updateObject(object.parent, { children: currentParent.children })
      }
    }
    
    // Add to new group
    const newChildren = [...(group.children || []), objectId]
    await this.updateObject(groupId, { children: newChildren })
    await this.updateObject(objectId, { parent: groupId })
  }
  
  // ================================
  // VALIDATION & REPAIR
  // ================================
  
  /**
   * Get complete object stack information
   */
  getObjectStack(): ObjectStackInfo {
    const objects = this.getAllObjects()
    const zIndexMap = new Map<string, number>()
    
    // Build z-index map
    objects.forEach((object) => {
      zIndexMap.set(object.id, object.zIndex)
    })
    
    return {
      objects: [...objects],
      selectedObjectIds: this.getSelectedObjectIds(),
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
    const objects = this.getAllObjects()
    
    // Check for empty canvas (optional - can be valid)
    if (objects.length === 0) {
      warnings.push('No objects exist in canvas')
    }
    
    // Check selected object validity
    for (const selectedId of this.getSelectedObjectIds()) {
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
    if (validation.valid) return
    
    console.log('[ObjectManager] Repairing objects...', validation)
    
    // Remove invalid selected object IDs
    const validObjectIds = new Set(this.getAllObjects().map(o => o.id))
    const invalidSelections = Array.from(this.getSelectedObjectIds()).filter(id => !validObjectIds.has(id))
    
    if (invalidSelections.length > 0) {
      console.log('[ObjectManager] Removing invalid selections:', invalidSelections)
      // Clear invalid selections through canvas manager
      this.canvasManager?.clearSelection()
    }
  }
  
  /**
   * Create smart object with intelligent defaults
   */
  async createSmartObject(options: {
    basedOn?: 'selection' | 'selectedObjects' | 'top'
    name?: string
    type?: CanvasObject['type']
    x?: number
    y?: number
  }): Promise<CanvasObject> {
    let x = options.x ?? 100
    let y = options.y ?? 100
    
    // Smart positioning based on existing objects
    if (options.basedOn === 'selection' || options.basedOn === 'selectedObjects') {
      const selected = this.getSelectedObjects()
      if (selected.length > 0) {
        // Position near selected objects
        const bounds = this.calculateBounds(selected)
        x = bounds.x + bounds.width + 20
        y = bounds.y
      }
    } else if (options.basedOn === 'top') {
      // Position at top of stack
      const allObjects = this.getAllObjects()
      if (allObjects.length > 0) {
        const topObject = allObjects.reduce((top, obj) => 
          obj.zIndex > top.zIndex ? obj : top
        )
        x = topObject.x + 20
        y = topObject.y + 20
      }
    }
    
    const objectId = await this.addObject({
      name: options.name || `Smart Object ${this.objects.size + 1}`,
      type: options.type || 'image',
      x,
      y,
      width: 100,
      height: 100,
      zIndex: this.getHighestZIndexForObjects(this.getAllObjects().map(o => o.id)) + 1,
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
    
    const newObject = this.getObject(objectId)
    if (!newObject) {
      throw new Error('Failed to create smart object')
    }
    
    return newObject
  }
  
  // ================================
  // PRIVATE UTILITIES
  // ================================
  
  /**
   * Sort objects by z-index
   */
  private sortByZIndex(): void {
    this.objectOrder.sort((a, b) => {
      const objA = this.objects.get(a)
      const objB = this.objects.get(b)
      if (!objA || !objB) return 0
      return objA.zIndex - objB.zIndex
    })
  }
  
  /**
   * Reindex z-order to avoid floating point issues
   */
  private reindexZOrder(): void {
    const sortedObjects = this.getAllObjects().sort((a, b) => a.zIndex - b.zIndex)
    
    for (let i = 0; i < sortedObjects.length; i++) {
      const obj = sortedObjects[i]
      if (obj.zIndex !== i + 1) {
        obj.zIndex = i + 1
      }
    }
    
    this.nextZIndex = sortedObjects.length + 1
    this.sortByZIndex()
  }
  
  /**
   * Calculate bounds for a group of objects
   */
  private calculateBounds(objects: CanvasObject[]): { x: number; y: number; width: number; height: number } {
    if (objects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const obj of objects) {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width)
      maxY = Math.max(maxY, obj.y + obj.height)
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
  
  /**
   * Get highest z-index for given object IDs
   */
  private getHighestZIndexForObjects(objectIds: string[]): number {
    const objects = this.getAllObjects().filter(o => objectIds.includes(o.id))
    return objects.length > 0 ? Math.max(...objects.map(o => o.zIndex)) : 0
  }
  
  /**
   * Create default data for object type
   */
  private createDefaultData(type: CanvasObject['type']): ImageData | TextData | ShapeData | GroupData {
    switch (type) {
      case 'image':
        return {
          naturalWidth: 100,
          naturalHeight: 100,
          element: new HTMLCanvasElement()
        } as ImageData
      
      case 'text':
      case 'verticalText':
        return {
          content: 'New Text',
          font: 'Arial',
          fontSize: 16,
          color: '#000000',
          align: 'left'
        } as TextData
      
      case 'group':
        return {
          type: 'group',
          children: []
        } as GroupData
      
      case 'shape':
      default:
        return {
          type: 'rectangle',
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 1
        } as ShapeData
    }
  }
} 