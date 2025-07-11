import { nanoid } from 'nanoid'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { CanvasObject as NewCanvasObject, ImageData, TextData, ShapeData } from './types'
import type { CanvasObject as OldCanvasObject } from '@/lib/editor/canvas/types'
import { ObjectAddedEvent, ObjectRemovedEvent, ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'

export class ObjectManager {
  private objects: Map<string, NewCanvasObject> = new Map()
  private objectOrder: string[] = [] // Z-order
  private nextZIndex = 1
  private canvasId = 'main' // Default canvas ID
  
  constructor(
    private eventBus: TypedEventBus,
    private eventStore: EventStore
  ) {}
  
  // Add object
  async addObject(object: Partial<NewCanvasObject>): Promise<string> {
    const id = object.id || nanoid()
    const newObject: NewCanvasObject = {
      id,
      name: object.name || `Object ${this.objects.size + 1}`,
      type: object.type || 'shape',
      zIndex: object.zIndex ?? this.nextZIndex++,
      x: object.x ?? 0,
      y: object.y ?? 0,
      width: object.width ?? 100,
      height: object.height ?? 100,
      rotation: object.rotation ?? 0,
      scaleX: object.scaleX ?? 1,
      scaleY: object.scaleY ?? 1,
      opacity: object.opacity ?? 1,
      blendMode: object.blendMode || 'normal',
      visible: object.visible ?? true,
      locked: object.locked ?? false,
      filters: object.filters || [],
      adjustments: object.adjustments || [],
      children: object.children,
      data: object.data || this.createDefaultData(object.type || 'shape'),
      metadata: object.metadata
    }
    
    this.objects.set(id, newObject)
    this.objectOrder.push(id)
    this.sortByZIndex()
    
    // Create canvas object for event (old format)
    const canvasObject: OldCanvasObject = {
      id,
      type: newObject.type as OldCanvasObject['type'],
      name: newObject.name,
      visible: newObject.visible,
      locked: newObject.locked,
      opacity: newObject.opacity,
      blendMode: newObject.blendMode,
      transform: {
        x: newObject.x,
        y: newObject.y,
        scaleX: newObject.scaleX,
        scaleY: newObject.scaleY,
        rotation: newObject.rotation,
        skewX: 0,
        skewY: 0
      },
      node: null as any, // Will be set by Konva
      layerId: 'default', // We don't use layers anymore but need this for compatibility
      data: newObject.data as any // Type conversion for compatibility
    }
    
    // Emit event
    await this.eventStore.append(
      new ObjectAddedEvent(
        this.canvasId,
        canvasObject,
        undefined, // layerId
        { source: 'system' }
      )
    )
    
    // Emit on event bus for immediate UI updates
    this.eventBus.emit('canvas.object.added' as any, { objectId: id, object: newObject })
    
    return id
  }
  
  // Remove object
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
    
    // Create canvas object for event
    const canvasObject: OldCanvasObject = {
      id: objectId,
      type: object.type as OldCanvasObject['type'],
      name: object.name,
      visible: object.visible,
      locked: object.locked,
      opacity: object.opacity,
      blendMode: object.blendMode,
      transform: {
        x: object.x,
        y: object.y,
        scaleX: object.scaleX,
        scaleY: object.scaleY,
        rotation: object.rotation,
        skewX: 0,
        skewY: 0
      },
      node: null as any,
      layerId: 'default',
      data: object.data as any // Type conversion for compatibility
    }
    
    // Emit event
    await this.eventStore.append(
      new ObjectRemovedEvent(
        this.canvasId,
        canvasObject,
        { source: 'system' }
      )
    )
    
    this.eventBus.emit('canvas.object.removed' as any, { objectId, object })
  }
  
  // Update object
  async updateObject(objectId: string, updates: Partial<NewCanvasObject>): Promise<void> {
    const object = this.objects.get(objectId)
    if (!object) return
    
    const previousState = { ...object }
    
    // Apply updates
    Object.assign(object, updates)
    
    // Re-sort if z-index changed
    if (updates.zIndex !== undefined) {
      this.sortByZIndex()
    }
    
    // Create canvas object for event
    const canvasObject: OldCanvasObject = {
      id: objectId,
      type: object.type as OldCanvasObject['type'],
      name: object.name,
      visible: object.visible,
      locked: object.locked,
      opacity: object.opacity,
      blendMode: object.blendMode,
      transform: {
        x: object.x,
        y: object.y,
        scaleX: object.scaleX,
        scaleY: object.scaleY,
        rotation: object.rotation,
        skewX: 0,
        skewY: 0
      },
      node: null as any,
      layerId: 'default',
      data: object.data as any // Type conversion for compatibility
    }
    
    // Emit event
    await this.eventStore.append(
      new ObjectModifiedEvent(
        this.canvasId,
        canvasObject,
        previousState,
        updates,
        { source: 'system' }
      )
    )
    
    this.eventBus.emit('canvas.object.modified' as any, { objectId, object, previousState, updates })
  }
  
  // Get object by ID
  getObject(objectId: string): NewCanvasObject | undefined {
    return this.objects.get(objectId)
  }
  
  // Get all objects
  getAllObjects(): NewCanvasObject[] {
    return Array.from(this.objects.values())
  }
  
  // Get objects in render order
  getObjectsInOrder(): NewCanvasObject[] {
    return this.objectOrder
      .map(id => this.objects.get(id))
      .filter((obj): obj is NewCanvasObject => obj !== undefined)
  }
  
  // Selection operations
  selectObject(id: string): void {
    this.eventBus.emit('selection.changed' as any, { selectedIds: [id] })
  }
  
  selectMultiple(ids: string[]): void {
    this.eventBus.emit('selection.changed' as any, { selectedIds: ids })
  }
  
  // Transform operations
  async moveObject(id: string, x: number, y: number): Promise<void> {
    await this.updateObject(id, { x, y })
  }
  
  async resizeObject(id: string, width: number, height: number): Promise<void> {
    await this.updateObject(id, { width, height })
  }
  
  async rotateObject(id: string, angle: number): Promise<void> {
    const object = this.objects.get(id)
    if (!object) return
    
    await this.updateObject(id, { rotation: (object.rotation + angle) % 360 })
  }
  
  // Stacking operations
  async bringToFront(id: string): Promise<void> {
    const maxZIndex = Math.max(...Array.from(this.objects.values()).map(o => o.zIndex))
    await this.updateObject(id, { zIndex: maxZIndex + 1 })
  }
  
  async sendToBack(id: string): Promise<void> {
    const minZIndex = Math.min(...Array.from(this.objects.values()).map(o => o.zIndex))
    await this.updateObject(id, { zIndex: minZIndex - 1 })
  }
  
  async bringForward(id: string): Promise<void> {
    const object = this.objects.get(id)
    if (!object) return
    
    const objectsAbove = Array.from(this.objects.values())
      .filter(o => o.zIndex > object.zIndex)
      .sort((a, b) => a.zIndex - b.zIndex)
    
    if (objectsAbove.length > 0) {
      await this.updateObject(id, { zIndex: objectsAbove[0].zIndex + 0.5 })
      this.reindexZOrder()
    }
  }
  
  async sendBackward(id: string): Promise<void> {
    const object = this.objects.get(id)
    if (!object) return
    
    const objectsBelow = Array.from(this.objects.values())
      .filter(o => o.zIndex < object.zIndex)
      .sort((a, b) => b.zIndex - a.zIndex)
    
    if (objectsBelow.length > 0) {
      await this.updateObject(id, { zIndex: objectsBelow[0].zIndex - 0.5 })
      this.reindexZOrder()
    }
  }
  
  // Group operations
  async createGroup(objectIds: string[], name?: string): Promise<string> {
    const objects = objectIds.map(id => this.objects.get(id)).filter((o): o is NewCanvasObject => o !== undefined)
    if (objects.length === 0) return ''
    
    // Calculate group bounds
    const bounds = this.calculateBounds(objects)
    
    // Create group
    const groupId = await this.addObject({
      type: 'group',
      name: name || `Group ${this.objects.size + 1}`,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      children: objectIds,
      data: {} as ShapeData // Groups don't have specific data
    })
    
    // Update children positions to be relative to group
    for (const obj of objects) {
      await this.updateObject(obj.id, {
        x: obj.x - bounds.x,
        y: obj.y - bounds.y
      })
    }
    
    return groupId
  }
  
  async ungroup(groupId: string): Promise<string[]> {
    const group = this.objects.get(groupId)
    if (!group || group.type !== 'group' || !group.children) return []
    
    const childIds = [...group.children]
    
    // Update children positions to be absolute
    for (const childId of childIds) {
      const child = this.objects.get(childId)
      if (child) {
        await this.updateObject(childId, {
          x: child.x + group.x,
          y: child.y + group.y
        })
      }
    }
    
    // Remove the group
    await this.removeObject(groupId)
    
    return childIds
  }
  
  // Move object to group
  async moveToGroup(objectId: string, groupId: string): Promise<void> {
    const object = this.objects.get(objectId)
    const group = this.objects.get(groupId)
    
    if (!object || !group || group.type !== 'group') return
    
    // Remove from current parent if any
    for (const [_id, obj] of this.objects) {
      if (obj.type === 'group' && obj.children?.includes(objectId)) {
        obj.children = obj.children.filter(cId => cId !== objectId)
      }
    }
    
    // Add to new group
    if (!group.children) group.children = []
    group.children.push(objectId)
    
    // Update object position to be relative to group
    await this.updateObject(objectId, {
      x: object.x - group.x,
      y: object.y - group.y
    })
  }
  
  // Helper methods
  private sortByZIndex(): void {
    this.objectOrder.sort((a, b) => {
      const objA = this.objects.get(a)
      const objB = this.objects.get(b)
      return (objA?.zIndex || 0) - (objB?.zIndex || 0)
    })
  }
  
  private reindexZOrder(): void {
    const sorted = this.getObjectsInOrder()
    sorted.forEach((obj, index) => {
      obj.zIndex = index + 1
    })
    this.nextZIndex = sorted.length + 1
  }
  
  private calculateBounds(objects: NewCanvasObject[]): { x: number; y: number; width: number; height: number } {
    if (objects.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    for (const obj of objects) {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width * obj.scaleX)
      maxY = Math.max(maxY, obj.y + obj.height * obj.scaleY)
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
  
  private createDefaultData(type: NewCanvasObject['type']): ImageData | TextData | ShapeData {
    switch (type) {
      case 'text':
        return {
          content: 'New Text',
          font: 'Arial',
          fontSize: 16,
          color: '#000000',
          align: 'left'
        }
      case 'shape':
        return {
          type: 'rectangle',
          fill: '#000000',
          stroke: '#000000',
          strokeWidth: 1
        }
      case 'image':
        // This should be provided when creating image objects
        throw new Error('Image data must be provided')
      case 'group':
        return {} as ShapeData // Groups don't need data
    }
  }
} 