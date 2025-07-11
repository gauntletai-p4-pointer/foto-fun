import Konva from 'konva'
import { nanoid } from 'nanoid'
import type { 
  CanvasState, 
  Selection, 
  Point, 
  Rect,
  BlendMode,
  Filter,
  CanvasManager as ICanvasManager
} from './types'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ObjectManager } from '@/lib/editor/objects/ObjectManager'
import { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import { SelectionRenderer } from '@/lib/editor/selection/SelectionRenderer'
import { calculateFitToScreenScale } from './helpers'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Object-based canvas manager implementation
 */
export class CanvasManager implements ICanvasManager {
  private _state: CanvasState
  private container: HTMLDivElement
  private typedEventBus: TypedEventBus
  private objectManager: ObjectManager
  
  // Selection system
  private selectionManager: SelectionManager | null = null
  private selectionRenderer: SelectionRenderer | null = null
  
  // Canvas ID
  public readonly id: string = nanoid()
  
  // Konva internals
  private stage: Konva.Stage
  private backgroundLayer: Konva.Layer
  private contentLayer: Konva.Layer
  private selectionLayer: Konva.Layer
  private overlayLayer: Konva.Layer
  
  // Map object IDs to Konva nodes
  private nodeMap: Map<string, Konva.Node> = new Map()
  
  constructor(
    container: HTMLDivElement,
    typedEventBus: TypedEventBus,
    objectManager: ObjectManager
  ) {
    this.container = container
    this.typedEventBus = typedEventBus
    this.objectManager = objectManager
    
    // Initialize stage
    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false
    })
    
    // Create layers
    this.backgroundLayer = new Konva.Layer()
    this.contentLayer = new Konva.Layer()
    this.selectionLayer = new Konva.Layer()
    this.overlayLayer = new Konva.Layer()
    
    // Add layers in order
    this.stage.add(this.backgroundLayer)
    this.stage.add(this.contentLayer)
    this.stage.add(this.selectionLayer)
    this.stage.add(this.overlayLayer)
    
    // Initialize state
    this._state = {
      canvasWidth: container.offsetWidth,
      canvasHeight: container.offsetHeight,
      zoom: 1,
      pan: { x: 0, y: 0 },
      objects: new Map(),
      objectOrder: [],
      selectedObjectIds: new Set(),
      pixelSelection: undefined,
      backgroundColor: 'transparent',
      isLoading: false,
      canUndo: false,
      canRedo: false
    }
    
    // Render background
    this.renderBackground()
    
    // Initialize selection system
    this.selectionManager = new SelectionManager(this as unknown as ICanvasManager, this.typedEventBus)
    this.selectionRenderer = new SelectionRenderer(this as unknown as ICanvasManager, this.selectionManager)
    
    // Subscribe to object events
    this.subscribeToEvents()
    
    // Canvas is ready
    this.typedEventBus.emit('canvas.ready' as any, { canvasId: this.id })
  }
  
  get state(): CanvasState {
    return this._state
  }
  
  get konvaStage(): Konva.Stage {
    return this.stage
  }
  
  private subscribeToEvents(): void {
    // Listen for object events from ObjectManager
    this.typedEventBus.on('canvas.object.added' as any, (data: unknown) => {
      const { objectId, object } = data as { objectId: string; object: CanvasObject }
      this.renderObject(objectId, object)
    })
    
    this.typedEventBus.on('canvas.object.removed' as any, (data: unknown) => {
      const { objectId } = data as { objectId: string }
      this.removeObjectFromCanvas(objectId)
    })
    
    this.typedEventBus.on('canvas.object.modified' as any, (data: unknown) => {
      const { objectId, object } = data as { objectId: string; object: CanvasObject }
      this.updateObjectOnCanvas(objectId, object)
    })
    
    this.typedEventBus.on('selection.changed' as any, (data: unknown) => {
      const { selectedIds } = data as { selectedIds: string[] }
      this._state.selectedObjectIds = new Set(selectedIds)
      this.renderSelection()
    })
  }
  
  private renderBackground(): void {
    this.backgroundLayer.destroyChildren()
    
    const computedStyle = getComputedStyle(document.documentElement)
    const bgColor = computedStyle.getPropertyValue('--content-background').trim() || '#1a1a1a'
    
    const bg = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.stage.width(),
      height: this.stage.height(),
      fill: bgColor,
      listening: false
    })
    
    this.backgroundLayer.add(bg)
    this.backgroundLayer.draw()
  }
  
  private renderObject(objectId: string, object: CanvasObject): void {
    // Create Konva node based on object type
    let node: Konva.Node
    
    switch (object.type) {
      case 'image': {
        const imageData = object.data as import('@/lib/editor/objects/types').ImageData
        node = new Konva.Image({
          id: objectId,
          image: imageData.element,
          x: object.x,
          y: object.y,
          width: object.width,
          height: object.height,
          scaleX: object.scaleX,
          scaleY: object.scaleY,
          rotation: object.rotation,
          draggable: !object.locked,
          visible: object.visible,
          opacity: object.opacity
        })
        break
      }
        
      case 'text': {
        const textData = object.data as import('@/lib/editor/objects/types').TextData
        node = new Konva.Text({
          id: objectId,
          text: textData.content,
          x: object.x,
          y: object.y,
          fontSize: textData.fontSize,
          fontFamily: textData.font,
          fill: textData.color,
          scaleX: object.scaleX,
          scaleY: object.scaleY,
          rotation: object.rotation,
          draggable: !object.locked,
          visible: object.visible,
          opacity: object.opacity
        })
        break
      }
        
      case 'shape': {
        const shapeData = object.data as import('@/lib/editor/objects/types').ShapeData
        if (shapeData.type === 'rectangle') {
          node = new Konva.Rect({
            id: objectId,
            x: object.x,
            y: object.y,
            width: object.width,
            height: object.height,
            fill: shapeData.fill,
            stroke: shapeData.stroke,
            strokeWidth: shapeData.strokeWidth,
            scaleX: object.scaleX,
            scaleY: object.scaleY,
            rotation: object.rotation,
            draggable: !object.locked,
            visible: object.visible,
            opacity: object.opacity
          })
        } else {
          // Default to circle for other shapes
          node = new Konva.Circle({
            id: objectId,
            x: object.x + object.width / 2,
            y: object.y + object.height / 2,
            radius: Math.min(object.width, object.height) / 2,
            fill: shapeData.fill,
            stroke: shapeData.stroke,
            strokeWidth: shapeData.strokeWidth,
            scaleX: object.scaleX,
            scaleY: object.scaleY,
            rotation: object.rotation,
            draggable: !object.locked,
            visible: object.visible,
            opacity: object.opacity
          })
        }
        break
      }
        
      case 'group':
        node = new Konva.Group({
          id: objectId,
          x: object.x,
          y: object.y,
          scaleX: object.scaleX,
          scaleY: object.scaleY,
          rotation: object.rotation,
          draggable: !object.locked,
          visible: object.visible,
          opacity: object.opacity
        })
        break
        
      default:
        throw new Error(`Unsupported object type: ${object.type}`)
    }
    
    // Apply blend mode
    if (object.blendMode && object.blendMode !== 'normal') {
      const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
        'normal': 'source-over',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
        'darken': 'darken',
        'lighten': 'lighten',
        'color-dodge': 'color-dodge',
        'color-burn': 'color-burn',
        'hard-light': 'hard-light',
        'soft-light': 'soft-light',
        'difference': 'difference',
        'exclusion': 'exclusion',
        'hue': 'source-over',
        'saturation': 'source-over',
        'color': 'source-over',
        'luminosity': 'source-over'
      }
      node.globalCompositeOperation(blendModeMap[object.blendMode] || 'source-over')
    }
    
    // Set z-index
    node.zIndex(object.zIndex)
    
    // Add to content layer
    this.contentLayer.add(node as Konva.Shape | Konva.Group)
    
    // Store node reference
    this.nodeMap.set(objectId, node)
    
    // Handle drag events
    node.on('dragend', () => {
      const pos = node.position()
      this.objectManager.updateObject(objectId, {
        x: pos.x,
        y: pos.y
      })
    })
    
    // Handle click for selection
    node.on('click tap', () => {
      this.objectManager.selectObject(objectId)
    })
    
    this.contentLayer.draw()
  }
  
  private removeObjectFromCanvas(objectId: string): void {
    const node = this.nodeMap.get(objectId)
    if (node) {
      node.destroy()
      this.nodeMap.delete(objectId)
      this.contentLayer.draw()
    }
  }
  
  private updateObjectOnCanvas(objectId: string, object: CanvasObject): void {
    const node = this.nodeMap.get(objectId)
    if (!node) return
    
    // Update position and transform
    node.setAttrs({
      x: object.x,
      y: object.y,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      rotation: object.rotation,
      visible: object.visible,
      opacity: object.opacity,
      draggable: !object.locked
    })
    
    // Update z-index
    node.zIndex(object.zIndex)
    
    this.contentLayer.draw()
  }
  
  private renderSelection(): void {
    // Clear previous selection
    this.selectionLayer.destroyChildren()
    
    // Render selection for each selected object
    this._state.selectedObjectIds.forEach(objectId => {
      const node = this.nodeMap.get(objectId)
      if (!node) return
      
      // Get bounding box
      const box = node.getClientRect()
      
      // Create selection rect
      const selectionRect = new Konva.Rect({
        x: box.x - 2,
        y: box.y - 2,
        width: box.width + 4,
        height: box.height + 4,
        stroke: '#0096ff',
        strokeWidth: 2,
        dash: [5, 5],
        listening: false
      })
      
      this.selectionLayer.add(selectionRect)
    })
    
    this.selectionLayer.draw()
  }
  
  // Object operations
  async addObject(objectData: Partial<CanvasObject>): Promise<string> {
    // Ensure object is positioned at viewport center if no position specified
    if (objectData.x === undefined && objectData.y === undefined) {
      const viewportCenterX = (this.container.offsetWidth / 2 - this._state.pan.x) / this._state.zoom
      const viewportCenterY = (this.container.offsetHeight / 2 - this._state.pan.y) / this._state.zoom
      objectData.x = viewportCenterX
      objectData.y = viewportCenterY
    }
    
    return this.objectManager.addObject(objectData)
  }
  
  async removeObject(objectId: string): Promise<void> {
    return this.objectManager.removeObject(objectId)
  }
  
  async updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void> {
    return this.objectManager.updateObject(objectId, updates)
  }
  
  getObject(objectId: string): CanvasObject | null {
    return this.objectManager.getObject(objectId) || null
  }
  
  getAllObjects(): CanvasObject[] {
    return this.objectManager.getAllObjects()
  }
  
  // Selection operations
  setSelection(selection: Selection | null): void {
    if (selection?.type === 'objects') {
      this.objectManager.selectMultiple(selection.objectIds)
    } else {
      this.objectManager.selectMultiple([])
    }
  }
  
  selectAll(): void {
    const allIds = this.objectManager.getAllObjects().map(obj => obj.id)
    this.objectManager.selectMultiple(allIds)
  }
  
  deselectAll(): void {
    this.objectManager.selectMultiple([])
  }
  
  selectObject(objectId: string): void {
    this.objectManager.selectObject(objectId)
  }
  
  selectMultiple(objectIds: string[]): void {
    this.objectManager.selectMultiple(objectIds)
  }
  
  getSelectionManager(): SelectionManager {
    return this.selectionManager!
  }
  
  // View operations
  setZoom(zoom: number): void {
    this._state.zoom = zoom
    this.stage.scale({ x: zoom, y: zoom })
    this.stage.batchDraw()
  }
  
  setPan(pan: Point): void {
    this._state.pan = pan
    this.stage.position(pan)
    this.stage.batchDraw()
  }
  
  fitToScreen(): void {
    const objects = this.objectManager.getObjectsInOrder()
    if (objects.length === 0) {
      this.setZoom(1)
      this.setPan({ x: 0, y: 0 })
      return
    }
    
    // Calculate bounds of all objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    objects.forEach(obj => {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width * obj.scaleX)
      maxY = Math.max(maxY, obj.y + obj.height * obj.scaleY)
    })
    
    const objectBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
    
    const { scale, panX, panY } = calculateFitToScreenScale(
      objectBounds,
      this.container.offsetWidth,
      this.container.offsetHeight
    )
    
    this.setZoom(scale)
    this.setPan({ x: panX, y: panY })
  }
  
  setDraggable(draggable: boolean): void {
    this.stage.draggable(draggable)
  }
  
  // Object finding
  getObjectAtPoint(point: Point): CanvasObject | null {
    const node = this.stage.getIntersection(point)
    if (node && node.id()) {
      return this.objectManager.getObject(node.id()) || null
    }
    return null
  }
  
  getObjectsInBounds(bounds: Rect): CanvasObject[] {
    const objects: CanvasObject[] = []
    this.objectManager.getAllObjects().forEach(obj => {
      if (obj.x < bounds.x + bounds.width &&
          obj.x + obj.width > bounds.x &&
          obj.y < bounds.y + bounds.height &&
          obj.y + obj.height > bounds.y) {
        objects.push(obj)
      }
    })
    return objects
  }
  
  // Pixel operations
  getImageData(rect?: Rect): ImageData {
    // Create a temporary canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    if (rect) {
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Use Konva's toCanvas method to get the specified rect
      const pixelRatio = 1
      this.stage.toCanvas({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        pixelRatio,
        callback: (stageCanvas: HTMLCanvasElement) => {
          ctx.drawImage(stageCanvas, 0, 0)
        }
      })
    } else {
      canvas.width = this.stage.width()
      canvas.height = this.stage.height()
      
      // Get the entire stage
      this.stage.toCanvas({
        callback: (stageCanvas: HTMLCanvasElement) => {
          ctx.drawImage(stageCanvas, 0, 0)
        }
      })
    }
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
  
  putImageData(imageData: ImageData, point: Point): void {
    // Create a canvas with the image data
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = imageData.width
    canvas.height = imageData.height
    ctx.putImageData(imageData, 0, 0)
    
    // Create an image object
    this.addObject({
      type: 'image',
      x: point.x,
      y: point.y,
      width: imageData.width,
      height: imageData.height,
      data: {
        element: canvas,
        naturalWidth: imageData.width,
        naturalHeight: imageData.height
      }
    })
  }
  
  // Filter operations
  async applyFilter(filter: Filter, targetIds?: string[]): Promise<void> {
    // TODO: Implement filter application
    console.log('Filter application not yet implemented', filter, targetIds)
  }
  
  async removeFilter(filterId: string, targetIds?: string[]): Promise<void> {
    // TODO: Implement filter removal
    console.log('Filter removal not yet implemented', filterId, targetIds)
  }
  
  // Transform operations
  async resize(width: number, height: number): Promise<void> {
    // Resize the canvas viewport
    this.stage.width(width)
    this.stage.height(height)
    this._state.canvasWidth = width
    this._state.canvasHeight = height
    this.renderBackground()
  }
  
  updateViewport(): void {
    const width = this.container.offsetWidth
    const height = this.container.offsetHeight
    
    this.stage.width(width)
    this.stage.height(height)
    
    this._state.canvasWidth = width
    this._state.canvasHeight = height
    
    // Update background
    this.renderBackground()
  }
  
  async crop(rect: Rect): Promise<void> {
    // TODO: Implement crop
    console.log('Crop not yet implemented', rect)
  }
  
  async rotate(angle: number, targetIds?: string[]): Promise<void> {
    const ids = targetIds || Array.from(this._state.selectedObjectIds)
    for (const id of ids) {
      const obj = this.objectManager.getObject(id)
      if (obj) {
        await this.objectManager.updateObject(id, {
          rotation: obj.rotation + angle
        })
      }
    }
  }
  
  async flip(direction: 'horizontal' | 'vertical', targetIds?: string[]): Promise<void> {
    const ids = targetIds || Array.from(this._state.selectedObjectIds)
    for (const id of ids) {
      const obj = this.objectManager.getObject(id)
      if (obj) {
        if (direction === 'horizontal') {
          await this.objectManager.updateObject(id, {
            scaleX: -obj.scaleX
          })
        } else {
          await this.objectManager.updateObject(id, {
            scaleY: -obj.scaleY
          })
        }
      }
    }
  }
  
  // Rendering
  render(): void {
    this.stage.batchDraw()
  }
  
  renderAll(): void {
    this.backgroundLayer.draw()
    this.contentLayer.draw()
    this.selectionLayer.draw()
    this.overlayLayer.draw()
  }
  
  // Export
  async exportImage(format: 'png' | 'jpeg' | 'webp' = 'png'): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.stage.toBlob({
        callback: (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to export image'))
          }
        },
        mimeType: `image/${format}`,
        quality: format === 'jpeg' ? 0.9 : 1
      })
    })
  }
  
  toDataURL(format: string = 'png', quality: number = 1): string {
    return this.stage.toDataURL({
      mimeType: `image/${format}`,
      quality
    })
  }
  
  // Utility
  async loadImage(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = async () => {
        try {
          const objectId = await this.addObject({
            type: 'image',
            width: img.naturalWidth,
            height: img.naturalHeight,
            data: {
              element: img,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            }
          })
          resolve(objectId)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = src
    })
  }
  
  destroy(): void {
    this.stage.destroy()
  }
  
  // Additional object-based methods needed for migration
  
  getSelectedObjects(): CanvasObject[] {
    const selectedIds = Array.from(this._state.selectedObjectIds)
    return selectedIds.map(id => this.getObject(id)).filter(Boolean) as CanvasObject[]
  }
  
  getViewportBounds(): Rect {
    const scale = this._state.zoom
    const pan = this._state.pan
    
    return {
      x: -pan.x / scale,
      y: -pan.y / scale,
      width: this.container.offsetWidth / scale,
      height: this.container.offsetHeight / scale
    }
  }
  
  async moveObjectToGroup(objectId: string, groupId: string): Promise<void> {
    const object = this.getObject(objectId)
    const group = this.getObject(groupId)
    
    if (!object || !group || group.type !== 'group') {
      throw new Error('Invalid object or group')
    }
    
    // Update object's parent reference
    await this.updateObject(objectId, {
      metadata: {
        ...object.metadata,
        parentGroup: groupId
      }
    })
    
    // Update group's children
    const children = (group.metadata?.children as string[]) || []
    if (!children.includes(objectId)) {
      await this.updateObject(groupId, {
        metadata: {
          ...group.metadata,
          children: [...children, objectId]
        }
      })
    }
  }
  
  async moveObjectToRoot(objectId: string): Promise<void> {
    const object = this.getObject(objectId)
    if (!object) return
    
    const parentGroupId = object.metadata?.parentGroup as string
    if (parentGroupId) {
      const parentGroup = this.getObject(parentGroupId)
      if (parentGroup && parentGroup.metadata?.children) {
        const children = (parentGroup.metadata.children as string[]).filter(id => id !== objectId)
        await this.updateObject(parentGroupId, {
          metadata: {
            ...parentGroup.metadata,
            children
          }
        })
      }
    }
    
    // Remove parent reference
    await this.updateObject(objectId, {
      metadata: {
        ...object.metadata,
        parentGroup: undefined
      }
    })
  }
  
  async applyAdjustment(objectId: string, adjustment: { type: string; value: number }): Promise<void> {
    const object = this.getObject(objectId)
    if (!object) return
    
    // Store adjustment in object metadata for now
    // This will be properly implemented with WebGL filters
    await this.updateObject(objectId, {
      metadata: {
        ...object.metadata,
        adjustments: {
          ...(object.metadata?.adjustments as Record<string, number> || {}),
          [adjustment.type]: adjustment.value
        }
      }
    })
    
    // TODO: Apply actual adjustment using WebGL filter
    console.log('Adjustment stored, WebGL implementation pending:', adjustment)
  }
  
  async applyFilterToObject(objectId: string, filter: Filter): Promise<void> {
    const object = this.getObject(objectId)
    if (!object) return
    
    // Add filter to object's filter array
    const filters = object.filters || []
    filters.push(filter)
    
    await this.updateObject(objectId, { filters })
    
    // TODO: Apply actual filter using WebGL/Konva
    console.log('Filter added to object, rendering implementation pending:', filter)
  }
} 