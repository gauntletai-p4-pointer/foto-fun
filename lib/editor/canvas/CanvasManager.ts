import Konva from 'konva'
import { nanoid } from 'nanoid'
import type { 
  CanvasState, 
  Layer, 
  CanvasObject, 
  Selection, 
  Point, 
  Rect, 
  Filter, 
  BlendMode,
  Transform,
  CanvasManager as ICanvasManager, 
  FilterStack
} from './types'
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ResourceManager } from '@/lib/core/ResourceManager'
import { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import { SelectionRenderer } from '@/lib/editor/selection/SelectionRenderer'
import { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { ObjectAddedEvent, ObjectRemovedEvent, ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'
import { CanvasResizedEvent } from '@/lib/events/canvas/DocumentEvents'
import { serializeCanvasObjects } from './types'
import { FilterManager, type FilterTarget } from '@/lib/editor/filters/FilterManager'

/**
 * Main canvas manager implementation
 * Provides a clean, pixel-aware API for image editing with full event sourcing
 */
export class CanvasManager implements ICanvasManager {
  private _state: CanvasState
  private container: HTMLDivElement
  private eventStore: EventStore
  private typedEventBus: TypedEventBus
  private resourceManager: ResourceManager
  private executionContext: ExecutionContext | null = null
  
  // Selection system
  private selectionManager: SelectionManager
  private selectionRenderer: SelectionRenderer
  
  // Filter system
  private filterManager: FilterManager
  
  // Canvas ID
  public readonly id: string = nanoid()
  
  // Konva internals
  private stage: Konva.Stage
  private backgroundLayer: Konva.Layer
  private selectionLayer: Konva.Layer
  private overlayLayer: Konva.Layer
  private selectionAnimation: Konva.Animation | null = null
  
  constructor(
    container: HTMLDivElement, 
    eventStore: EventStore,
    resourceManager: ResourceManager,
    executionContext?: ExecutionContext
  ) {
    this.container = container
    this.eventStore = eventStore
    this.executionContext = executionContext || null
    this.typedEventBus = new TypedEventBus()
    this.resourceManager = resourceManager
    
    // Initialize stage with container as viewport
    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false // We'll handle dragging manually
    })
    
    // Create layers
    this.backgroundLayer = new Konva.Layer()
    this.selectionLayer = new Konva.Layer()
    this.overlayLayer = new Konva.Layer()
    
    // Add layers to stage
    this.stage.add(this.backgroundLayer)
    this.stage.add(this.selectionLayer)
    this.stage.add(this.overlayLayer)
    
    // Initialize state
    this._state = {
      width: container.offsetWidth,
      height: container.offsetHeight,
      zoom: 1,
      pan: { x: 0, y: 0 },
      layers: [],
      selection: null,
      activeLayerId: null,
      backgroundColor: 'transparent',
      isLoading: false,
      canUndo: false,
      canRedo: false
    }
    
    // Add a background rect to define canvas bounds (after state is initialized)
    this.updateCanvasBackground()
    
    // Initialize selection system
    this.selectionManager = new SelectionManager(this, this.typedEventBus)
    this.selectionRenderer = new SelectionRenderer(this, this.selectionManager)
    
    // Initialize filter system
    this.filterManager = new FilterManager(this.eventStore, this.typedEventBus, this.resourceManager, this)
    
    // Subscribe to events
    this.subscribeToEvents()
  }
  
  /**
   * Initialize the canvas manager
   */
  async initialize(): Promise<void> {
    // Initialize filter manager
    await this.filterManager.initialize()
  }
  
  get state(): CanvasState {
    return this._state
  }
  
  get konvaStage(): Konva.Stage {
    return this.stage
  }
  
  /**
   * Subscribe to event store for history tracking
   */
  private subscribeToEvents(): void {
    // Listen for selection changes from SelectionManager
    this.typedEventBus.on('selection.changed', (data) => {
      this._state.selection = data.selection
      if (data.selection) {
        this.selectionRenderer.startRendering()
      } else {
        this.selectionRenderer.stopRendering()
      }
    })
    
    this.typedEventBus.on('selection.cleared', () => {
      this._state.selection = null
      this.selectionRenderer.stopRendering()
    })
  }
  
  private updateHistoryState(): void {
    // This will be implemented when we integrate with EventBasedHistoryStore
    // For now, just update the state flags
    this._state.canUndo = false
    this._state.canRedo = false
  }
  
  // Layer operations
  addLayer(layerData: Partial<Layer>): Layer {
    const konvaLayer = new Konva.Layer()
    
    const layer: Layer = {
      id: nanoid(),
      name: layerData.name || (layerData.type === 'group' ? `Group ${this._state.layers.filter(l => l.type === 'group').length + 1}` : `Layer ${this._state.layers.length + 1}`),
      type: layerData.type || 'raster',
      visible: layerData.visible ?? true,
      locked: layerData.locked ?? false,
      opacity: layerData.opacity ?? 1,
      blendMode: layerData.blendMode || 'normal',
      konvaLayer,
      objects: [],
      parentId: layerData.parentId,
      mask: layerData.mask,
      filterStack: layerData.filterStack
    }
    
    // Apply blend mode
    this.applyBlendMode(konvaLayer, layer.blendMode)
    
    // Apply clipping to the new layer
    konvaLayer.clip({
      x: 0,
      y: 0,
      width: this._state.width,
      height: this._state.height
    })
    
    // Insert before overlay layers
    const index = this.stage.children.length - 2
    this.stage.add(konvaLayer)
    konvaLayer.setZIndex(index)
    
    this._state.layers.push(layer)
    
    // Set as active if first layer
    if (this._state.layers.length === 1) {
      this._state.activeLayerId = layer.id
    }
    
    // Emit layer created event
    this.typedEventBus.emit('layer.created', { layer })
    
    return layer
  }
  
  removeLayer(layerId: string): void {
    const index = this._state.layers.findIndex(l => l.id === layerId)
    if (index === -1) return
    
    const layer = this._state.layers[index]
    layer.konvaLayer.destroy()
    this._state.layers.splice(index, 1)
    
    // Update active layer if needed
    if (this._state.activeLayerId === layerId) {
      this._state.activeLayerId = this._state.layers[0]?.id || null
    }
  }
  
  setActiveLayer(layerId: string): void {
    const layer = this._state.layers.find(l => l.id === layerId)
    if (layer) {
      this._state.activeLayerId = layerId
    }
  }
  
  getActiveLayer(): Layer | null {
    if (!this._state.activeLayerId) return null
    return this._state.layers.find(l => l.id === this._state.activeLayerId) || null
  }
  
  reorderLayers(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return
    
    const [layer] = this._state.layers.splice(fromIndex, 1)
    this._state.layers.splice(toIndex, 0, layer)
    
    // Update z-indices
    this._state.layers.forEach((layer, index) => {
      layer.konvaLayer.setZIndex(index + 1) // +1 for background layer
    })
    
    // Emit reorder event
    this.typedEventBus.emit('layer.reordered', {
      layerIds: this._state.layers.map(l => l.id),
      previousOrder: [...this._state.layers.map(l => l.id)]
    })
  }
  
  /**
   * Move a layer into or out of a group
   */
  setLayerParent(layerId: string, parentId: string | undefined): void {
    const layer = this._state.layers.find(l => l.id === layerId)
    if (!layer) return
    
    // Prevent circular references
    if (parentId) {
      let currentParent = this._state.layers.find(l => l.id === parentId)
      while (currentParent) {
        if (currentParent.id === layerId) {
          console.error('Cannot create circular layer group reference')
          return
        }
        currentParent = currentParent.parentId ? this._state.layers.find(l => l.id === currentParent!.parentId) : undefined
      }
    }
    
    const previousParentId = layer.parentId
    layer.parentId = parentId
    
    // Emit parent changed event
    this.typedEventBus.emit('layer.parent.changed', {
      layerId,
      parentId,
      previousParentId
    })
  }
  
  /**
   * Get all child layers of a group (recursive)
   */
  getLayerDescendants(groupId: string): Layer[] {
    const descendants: Layer[] = []
    const children = this._state.layers.filter(l => l.parentId === groupId)
    
    for (const child of children) {
      descendants.push(child)
      if (child.type === 'group') {
        descendants.push(...this.getLayerDescendants(child.id))
      }
    }
    
    return descendants
  }
  
  // Object operations
  async addObject(objectData: Partial<CanvasObject>, layerId?: string): Promise<CanvasObject> {
    const targetLayerId = layerId || this._state.activeLayerId
    if (!targetLayerId) {
      throw new Error('No active layer')
    }
    
    const layer = this._state.layers.find(l => l.id === targetLayerId)
    if (!layer) {
      throw new Error('Layer not found')
    }
    
    // Ensure object is positioned within visible bounds
    const ensureVisiblePosition = (transform?: Partial<Transform>): Transform => {
      // If transform is provided with explicit coordinates, use them
      if (transform && ('x' in transform || 'y' in transform)) {
        return {
          x: transform.x ?? 0,
          y: transform.y ?? 0,
          scaleX: transform.scaleX ?? 1,
          scaleY: transform.scaleY ?? 1,
          rotation: transform.rotation ?? 0,
          skewX: transform.skewX ?? 0,
          skewY: transform.skewY ?? 0
        }
      }
      
      // Only center if no transform is provided at all
      // Get viewport center in world coordinates
      const viewportCenterX = (this.container.offsetWidth / 2 - this._state.pan.x) / this._state.zoom
      const viewportCenterY = (this.container.offsetHeight / 2 - this._state.pan.y) / this._state.zoom
      
      return {
        x: viewportCenterX,
        y: viewportCenterY,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        skewX: 0,
        skewY: 0
      }
    }
    
    // Create Konva node based on object type
    let node: Konva.Node
    const transform = ensureVisiblePosition(objectData.transform)
    
    switch (objectData.type) {
      case 'image':
        const imageElement = objectData.data as HTMLImageElement
        if (!imageElement) {
          throw new Error('Image data is required')
        }
        
        node = new Konva.Image({
          image: imageElement,
          x: transform.x,
          y: transform.y,
          scaleX: transform.scaleX,
          scaleY: transform.scaleY,
          rotation: transform.rotation,
          skewX: transform.skewX,
          skewY: transform.skewY,
          draggable: true
        })
        
        // Ensure image fits within canvas if it's too large
        const imgWidth = imageElement.naturalWidth || imageElement.width
        const imgHeight = imageElement.naturalHeight || imageElement.height
        
        if (imgWidth > this._state.width || imgHeight > this._state.height) {
          const scaleX = this._state.width / imgWidth
          const scaleY = this._state.height / imgHeight
          const scale = Math.min(scaleX, scaleY, 1) * 0.8 // 80% of canvas size max
          
          node.scaleX(scale)
          node.scaleY(scale)
          transform.scaleX = scale
          transform.scaleY = scale
        }
        break
        
      case 'text':
        node = new Konva.Text({
          text: objectData.data as string,
          x: transform.x,
          y: transform.y,
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000000',
          draggable: true
        })
        break
        
      case 'shape':
        // Default to rectangle for now
        node = new Konva.Rect({
          x: transform.x,
          y: transform.y,
          width: 100,
          height: 100,
          fill: '#000000',
          draggable: true
        })
        break
        
      default:
        throw new Error(`Unsupported object type: ${objectData.type}`)
    }
    
    const object: CanvasObject = {
      id: nanoid(),
      type: objectData.type || 'shape',
      name: objectData.name,
      visible: objectData.visible ?? true,
      locked: objectData.locked ?? false,
      opacity: objectData.opacity ?? 1,
      blendMode: objectData.blendMode || 'normal',
      transform,
      node,
      layerId: targetLayerId,
      data: objectData.data,
      filters: objectData.filters,
      style: objectData.style,
      metadata: objectData.metadata
    }
    
    // Add to Konva layer - cast to Shape or Group which are the valid types
    layer.konvaLayer.add(node as Konva.Shape | Konva.Group)
    
    // Add to layer objects
    layer.objects.push(object)
    
    // Update layer
    layer.konvaLayer.draw()
    
    // Get current version for this canvas
    const currentVersion = this.eventStore.getAggregateVersion(this.stage.id())
    
    // Create event with correct version
    const event = new ObjectAddedEvent(
      this.stage.id(),
      object, // Pass full object, event will handle serialization
      targetLayerId,
      { source: 'user' },
      currentVersion + 1
    )
    
    // Emit event
    this.eventStore.append(event)
    
    return object
  }
  
  async removeObject(objectId: string): Promise<void> {
    for (const layer of this._state.layers) {
      const index = layer.objects.findIndex(o => o.id === objectId)
      if (index !== -1) {
        const object = layer.objects[index]
        object.node.destroy()
        layer.objects.splice(index, 1)
        layer.konvaLayer.draw()
        
        // Emit event
        const currentVersion = this.eventStore.getAggregateVersion(this.stage.id())
        this.eventStore.append(new ObjectRemovedEvent(
          this.stage.id(),
          object,
          { source: 'user' },
          currentVersion + 1
        ))
        
        break
      }
    }
  }
  

  
  // Selection operations
  setSelection(selection: Selection | null): void {
    // Update state first
    this._state.selection = selection
    
    // Handle pixel-based selections
    if (selection?.type === 'pixel' && selection.mask) {
      // Restore the pixel selection
      this.selectionManager.restoreSelection(selection.mask, selection.bounds)
      this.selectionRenderer.startRendering()
    } else if (selection?.type === 'rectangle') {
      // Create rectangular selection
      const bounds = selection.bounds
      this.selectionManager.createRectangle(bounds.x, bounds.y, bounds.width, bounds.height)
      this.selectionRenderer.startRendering()
    } else if (selection?.type === 'ellipse') {
      // Create elliptical selection
      const bounds = selection.bounds
      const cx = bounds.x + bounds.width / 2
      const cy = bounds.y + bounds.height / 2
      const rx = bounds.width / 2
      const ry = bounds.height / 2
      this.selectionManager.createEllipse(cx, cy, rx, ry)
      this.selectionRenderer.startRendering()
    } else if (selection?.type === 'objects') {
      // Handle object-based selection (existing implementation)
      this.renderSelection()
    } else {
      // Clear selection
      this.selectionManager.clear()
      this.selectionRenderer.stopRendering()
      this.renderSelection()
    }
  }
  
  selectAll(): void {
    const allObjects: string[] = []
    this._state.layers.forEach(layer => {
      layer.objects.forEach(obj => {
        if (!obj.locked && obj.visible) {
          allObjects.push(obj.id)
        }
      })
    })
    
    this.setSelection({
      type: 'objects',
      objectIds: allObjects
    })
  }
  
  deselectAll(): void {
    this.setSelection(null)
  }
  
  private renderSelection(): void {
    // Clear selection layer
    this.selectionLayer.destroyChildren()
    
    // Clear any existing animations
    if (this.selectionAnimation) {
      this.selectionAnimation.stop()
      this.selectionAnimation = null
    }
    
    if (!this._state.selection) {
      this.selectionLayer.draw()
      return
    }
    
    // Render selection based on type
    if (this._state.selection.type === 'objects') {
      // Draw selection rectangles around objects with handles
      const transformer = new Konva.Transformer({
        nodes: [],
        borderStroke: '#0066ff',
        borderStrokeWidth: 2,
        borderDash: [6, 3],
        anchorStroke: '#0066ff',
        anchorFill: '#ffffff',
        anchorSize: 8,
        anchorCornerRadius: 2,
        enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-left', 
                         'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'],
        rotateEnabled: true,
        rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315]
      })
      
      // Add selected objects to transformer
      const selectedNodes: Konva.Node[] = []
      this._state.selection.objectIds.forEach(id => {
        const obj = this.findObject(id)
        if (obj && obj.node) {
          selectedNodes.push(obj.node)
        }
      })
      
      if (selectedNodes.length > 0) {
        transformer.nodes(selectedNodes)
        this.selectionLayer.add(transformer)
        
        // Animate the border dash
        this.selectionAnimation = new Konva.Animation((frame) => {
          if (frame) {
            const dashOffset = (frame.time / 50) % 9
            // Update border dash array to create animation effect
            transformer.borderDash([6 - dashOffset/3, 3 + dashOffset/3])
          }
        }, this.selectionLayer)
        
        this.selectionAnimation.start()
      }
    } else if (this._state.selection.type === 'pixel') {
      // Draw marching ants for pixel selection
      const pixelSelection = this._state.selection
      const rect = new Konva.Rect({
        x: pixelSelection.bounds.x,
        y: pixelSelection.bounds.y,
        width: pixelSelection.bounds.width,
        height: pixelSelection.bounds.height,
        stroke: '#000000',
        strokeWidth: 1,
        dash: [4, 4],
        fill: 'transparent'
      })
      
      // White background for marching ants
      const bgRect = new Konva.Rect({
        x: pixelSelection.bounds.x,
        y: pixelSelection.bounds.y,
        width: pixelSelection.bounds.width,
        height: pixelSelection.bounds.height,
        stroke: '#ffffff',
        strokeWidth: 1,
        dash: [4, 4],
        dashOffset: 4,
        fill: 'transparent'
      })
      
      this.selectionLayer.add(bgRect)
      this.selectionLayer.add(rect)
      
      // Animate marching ants
      this.selectionAnimation = new Konva.Animation((frame) => {
        if (frame) {
          const dashOffset = (frame.time / 50) % 8
          rect.dashOffset(-dashOffset)
          bgRect.dashOffset(4 - dashOffset)
        }
      }, this.selectionLayer)
      
      this.selectionAnimation.start()
    } else if (this._state.selection.type === 'rectangle' || this._state.selection.type === 'ellipse') {
      // Draw rectangle or ellipse selection with marching ants
      const bounds = this._state.selection.bounds
      
      let shape: Konva.Shape
      let bgShape: Konva.Shape
      
      if (this._state.selection.type === 'rectangle') {
        bgShape = new Konva.Rect({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          stroke: '#ffffff',
          strokeWidth: 1,
          dash: [4, 4],
          dashOffset: 4,
          fill: 'transparent'
        })
        
        shape = new Konva.Rect({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          stroke: '#000000',
          strokeWidth: 1,
          dash: [4, 4],
          fill: 'transparent'
        })
      } else {
        bgShape = new Konva.Ellipse({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
          radiusX: bounds.width / 2,
          radiusY: bounds.height / 2,
          stroke: '#ffffff',
          strokeWidth: 1,
          dash: [4, 4],
          dashOffset: 4,
          fill: 'transparent'
        })
        
        shape = new Konva.Ellipse({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
          radiusX: bounds.width / 2,
          radiusY: bounds.height / 2,
          stroke: '#000000',
          strokeWidth: 1,
          dash: [4, 4],
          fill: 'transparent'
        })
      }
      
      this.selectionLayer.add(bgShape)
      this.selectionLayer.add(shape)
      
      // Animate marching ants
      this.selectionAnimation = new Konva.Animation((frame) => {
        if (frame) {
          const dashOffset = (frame.time / 50) % 8
          shape.dashOffset(-dashOffset)
          bgShape.dashOffset(4 - dashOffset)
        }
      }, this.selectionLayer)
      
      this.selectionAnimation.start()
    }
    
    this.selectionLayer.draw()
  }
  
  // Helper method to find object across all layers
  findObject(objectId: string): CanvasObject | null {
    for (const layer of this._state.layers) {
      const object = layer.objects.find(o => o.id === objectId)
      if (object) return object
    }
    return null
  }
  
  // Pixel operations
  getImageData(rect?: Rect): ImageData {
    const bounds = rect || {
      x: 0,
      y: 0,
      width: this._state.width,
      height: this._state.height
    }
    
    // Create offscreen canvas for pixel extraction
    const offscreenCanvas = document.createElement('canvas')
    const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true })!
    offscreenCanvas.width = bounds.width
    offscreenCanvas.height = bounds.height
    
    // Use Konva's toCanvas method for better performance
    const pixelRatio = 1
    this.stage.toCanvas({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      pixelRatio: pixelRatio,
      callback: (canvas: HTMLCanvasElement) => {
        ctx.drawImage(canvas, 0, 0)
      }
    })
    
    return ctx.getImageData(0, 0, bounds.width, bounds.height)
  }
  
  putImageData(imageData: ImageData, point: Point): void {
    // Create a canvas with the image data
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = imageData.width
    canvas.height = imageData.height
    ctx.putImageData(imageData, 0, 0)
    
    // Create Konva image from canvas
    const image = new Konva.Image({
      x: point.x,
      y: point.y,
      image: canvas,
      listening: true,
      draggable: false
    })
    
    // Add to active layer
    const activeLayer = this.getActiveLayer()
    if (activeLayer) {
      // Create a canvas object to track it
      const canvasObject: CanvasObject = {
        id: nanoid(),
        type: 'image',
        name: 'Pixel Data',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        transform: {
          x: point.x,
          y: point.y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          skewX: 0,
          skewY: 0
        },
        node: image,
        layerId: activeLayer.id,
        data: { canvasElement: canvas, type: 'canvas' } as Record<string, unknown>
      }
      
      activeLayer.konvaLayer.add(image)
      activeLayer.objects.push(canvasObject)
      activeLayer.konvaLayer.draw()
      
      // Emit event
      const currentVersion = this.eventStore.getAggregateVersion(this.stage.id())
      const event = new ObjectAddedEvent(
        this.stage.id(),
        canvasObject,
        activeLayer.id,
        this.executionContext?.getMetadata() || { source: 'user' },
        currentVersion + 1
      )
      
      if (this.executionContext) {
        this.executionContext.emit(event)
      } else {
        this.eventStore.append(event)
      }
    }
  }
  
  // Filter operations - now using FilterManager
  /**
   * Apply filter to layer (new method)
   */
  async applyFilterToLayer(filter: Filter, layerId: string): Promise<void> {
    const filterTarget: FilterTarget = { type: 'layer', layerId }
    await this.filterManager.applyFilter(filter, filterTarget, this.executionContext ?? undefined)
  }
  
  /**
   * Create adjustment layer (new method)
   */
  async createAdjustmentLayer(
    filter: Filter, 
    adjustmentType: 'brightness' | 'contrast' | 'curves' | 'levels' | 'hue-saturation'
  ): Promise<void> {
    const filterTarget: FilterTarget = { type: 'adjustment', adjustmentType }
    await this.filterManager.applyFilter(filter, filterTarget, this.executionContext ?? undefined)
  }
  
  /**
   * Remove filter from layer (new method)
   */
  async removeFilterFromLayer(layerId: string, filterId: string): Promise<void> {
    await this.filterManager.removeFilterFromLayer(layerId, filterId, this.executionContext ?? undefined)
  }
  
  /**
   * Update filter stack for layer (new method)
   */
  async updateLayerFilterStack(layerId: string, filterStack: FilterStack): Promise<void> {
    await this.filterManager.updateFilterStack(layerId, filterStack, this.executionContext ?? undefined)
  }
  
  /**
   * Get the filter manager instance
   */
  getFilterManager(): FilterManager {
    return this.filterManager
  }
  
  // Helper to get selected objects
  private getSelectedObjects(): CanvasObject[] {
    if (!this._state.selection || this._state.selection.type !== 'objects') {
      return []
    }
    
    return this._state.selection.objectIds
      .map(id => this.findObject(id))
      .filter((obj): obj is CanvasObject => obj !== null)
  }
  
  // Transform operations
  async resize(width: number, height: number): Promise<void> {
    // Store previous dimensions for event
    const previousWidth = this._state.width
    const previousHeight = this._state.height
    
    // Update the actual canvas dimensions in state
    this._state.width = width
    this._state.height = height
    
    // Emit canvas resize event
    const currentVersion = this.eventStore.getAggregateVersion(this.stage.id())
    const event = new CanvasResizedEvent(
      this.stage.id(),
      width,
      height,
      previousWidth,
      previousHeight,
      this.executionContext?.getMetadata() || { source: 'user' },
      currentVersion + 1
    )
    
    if (this.executionContext) {
      await this.executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
    
    // Update viewport to show the canvas properly
    this.updateViewport()
    
    // Update background and clipping
    this.updateCanvasBackground()
  }
  
  /**
   * Update only the viewport size (when container resizes)
   * This doesn't change the actual canvas dimensions
   */
  updateViewport(): void {
    // Update stage viewport size to match container
    this.stage.width(this.container.offsetWidth)
    this.stage.height(this.container.offsetHeight)
    
    // Redraw all layers
    this.stage.draw()
  }
  
  async crop(rect: Rect): Promise<void> {
    // TODO: Implement cropping
    console.log('Cropping to:', rect)
  }
  
  async rotate(angle: number, target?: CanvasObject | CanvasObject[]): Promise<void> {
    const targets = target ? (Array.isArray(target) ? target : [target]) : this.getSelectedObjects()
    
    if (targets.length === 0) return
    
    for (const obj of targets) {
      const previousTransform = { ...obj.transform }
      
      // Update rotation
      obj.transform.rotation = (obj.transform.rotation + angle) % 360
      obj.node.rotation(obj.transform.rotation)
      
      // Update the layer
      const layer = this._state.layers.find(l => l.id === obj.layerId)
      if (layer) {
        layer.konvaLayer.batchDraw()
      }
      
      // Emit event
      const currentVersion = this.eventStore.getAggregateVersion(this.stage.id())
      const event = new ObjectModifiedEvent(
        this.stage.id(),
        obj,
        previousTransform,
        { transform: obj.transform },
        this.executionContext?.getMetadata() || { source: 'user' },
        currentVersion + 1
      )
      
      if (this.executionContext) {
        await this.executionContext.emit(event)
      } else {
        this.eventStore.append(event)
      }
    }
  }
  
  async flip(direction: 'horizontal' | 'vertical', target?: CanvasObject | CanvasObject[]): Promise<void> {
    const targets = target ? (Array.isArray(target) ? target : [target]) : this.getSelectedObjects()
    
    if (targets.length === 0) return
    
    for (const obj of targets) {
      const previousTransform = { ...obj.transform }
      
      // Flip by inverting scale
      if (direction === 'horizontal') {
        obj.transform.scaleX *= -1
        obj.node.scaleX(obj.transform.scaleX)
      } else {
        obj.transform.scaleY *= -1
        obj.node.scaleY(obj.transform.scaleY)
      }
      
      // Update the layer
      const layer = this._state.layers.find(l => l.id === obj.layerId)
      if (layer) {
        layer.konvaLayer.batchDraw()
      }
      
      // Emit event
      const currentVersion = this.eventStore.getAggregateVersion(this.stage.id())
      const event = new ObjectModifiedEvent(
        this.stage.id(),
        obj,
        previousTransform,
        { transform: obj.transform },
        this.executionContext?.getMetadata() || { source: 'user' },
        currentVersion + 1
      )
      
      if (this.executionContext) {
        await this.executionContext.emit(event)
      } else {
        this.eventStore.append(event)
      }
    }
  }
  
  // View operations
  setZoom(zoom: number): void {
    this._state.zoom = zoom
    this.stage.scale({ x: zoom, y: zoom })
    this.stage.draw()
  }
  
  setPan(pan: Point): void {
    this._state.pan = pan
    this.stage.position(pan)
    this.stage.draw()
  }
  
  fitToScreen(): void {
    // Calculate the scale to fit the canvas in the viewport
    const viewportWidth = this.container.offsetWidth
    const viewportHeight = this.container.offsetHeight
    const canvasWidth = this._state.width
    const canvasHeight = this._state.height
    
    // Calculate scale to fit with some padding
    const padding = 40 // pixels of padding
    const scaleX = (viewportWidth - padding * 2) / canvasWidth
    const scaleY = (viewportHeight - padding * 2) / canvasHeight
    const scale = Math.min(scaleX, scaleY, 1) // Don't zoom in beyond 100%
    
    // Calculate pan to center the canvas
    const scaledWidth = canvasWidth * scale
    const scaledHeight = canvasHeight * scale
    const panX = (viewportWidth - scaledWidth) / 2
    const panY = (viewportHeight - scaledHeight) / 2
    
    // Apply zoom and pan
    this.setZoom(scale)
    this.setPan({ x: panX, y: panY })
  }
  
  /**
   * Enable or disable stage dragging (for hand tool)
   */
  setDraggable(draggable: boolean): void {
    this.stage.draggable(draggable)
    
    if (draggable) {
      // Sync pan state when dragging
      this.stage.on('dragmove', () => {
        const pos = this.stage.position()
        this._state.pan = { x: pos.x, y: pos.y }
      })
    } else {
      // Remove the drag event listener
      this.stage.off('dragmove')
    }
  }
  
  // Utility methods
  async exportImage(format: 'png' | 'jpeg' | 'webp' = 'png'): Promise<Blob> {
    return new Promise((resolve) => {
      this.stage.toBlob({
        callback: (blob) => {
          resolve(blob!)
        },
        mimeType: `image/${format}`
      })
    })
  }
  
  async loadImage(src: string): Promise<CanvasObject> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = async () => {
        const object = await this.addObject({
          type: 'image',
          data: img,
          transform: {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            skewX: 0,
            skewY: 0
          }
        })
        resolve(object)
      }
      img.onerror = reject
      img.src = src
    })
  }
  
  destroy(): void {
    // Clean up selection system
    this.selectionRenderer.destroy()
    this.selectionManager.dispose()
    
    // Destroy stage
    this.stage.destroy()
  }
  
  private applyBlendMode(layer: Konva.Layer, blendMode: BlendMode): void {
    // Konva uses globalCompositeOperation for blend modes
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
      'hue': 'hue',
      'saturation': 'saturation',
      'color': 'color',
      'luminosity': 'luminosity'
    }
    
    layer.globalCompositeOperation(blendModeMap[blendMode] || 'source-over')
  }

  /**
   * Get the typed event bus
   */
  getEventBus(): TypedEventBus {
    return this.typedEventBus
  }
  
  // Object finding methods
  getObjectAtPoint(point: Point): CanvasObject | null {
    // Get the Konva shape at the point
    const pos = this.stage.getPointerPosition() || point
    const shape = this.stage.getIntersection(pos)
    
    if (!shape) return null
    
    // Find the corresponding canvas object
    for (const layer of this._state.layers) {
      for (const obj of layer.objects) {
        if (obj.node === shape) {
          return obj
        }
      }
    }
    
    return null
  }
  
  // Helper to set execution context
  setExecutionContext(context: ExecutionContext | null): void {
    this.executionContext = context
  }

  /**
   * Get all objects across all layers
   */
  getObjects(): CanvasObject[] {
    const objects: CanvasObject[] = []
    this._state.layers.forEach(layer => {
      objects.push(...layer.objects)
    })
    return objects
  }

  /**
   * Get canvas width
   */
  getWidth(): number {
    return this._state.width
  }

  /**
   * Get canvas height
   */
  getHeight(): number {
    return this._state.height
  }

  /**
   * Clear current selection
   */
  async clearSelection(): Promise<void> {
    this.deselectAll()
  }

  /**
   * Select specific objects by ID
   */
  async selectObjects(objectIds: string[]): Promise<void> {
    // Filter out invalid or locked objects
    const validIds = objectIds.filter(id => {
      const obj = this.findObject(id)
      return obj && !obj.locked && obj.visible
    })

    if (validIds.length > 0) {
      this.setSelection({
        type: 'objects',
        objectIds: validIds
      })
    } else {
      this.deselectAll()
    }
  }

  /**
   * Get pointer position relative to canvas
   */
  getPointer(event: MouseEvent): Point {
    const rect = this.container.getBoundingClientRect()
    const scaleX = this._state.width / rect.width
    const scaleY = this._state.height / rect.height
    
    return {
      x: (event.clientX - rect.left) * scaleX - this._state.pan.x,
      y: (event.clientY - rect.top) * scaleY - this._state.pan.y
    }
  }

  /**
   * Get the current pixel selection manager
   */
  getSelectionManager(): SelectionManager {
    return this.selectionManager
  }
  
  /**
   * Create a selection from the current active objects
   */
  createSelectionFromObjects(objectIds: string[]): void {
    // Find the objects
    const objects = objectIds
      .map(id => this.findObject(id))
      .filter((obj): obj is CanvasObject => obj !== null && obj.node !== null)
    
    if (objects.length === 0) return
    
    // Create a combined selection from all objects
    objects.forEach((obj, index) => {
      if (obj.node) {
        this.selectionManager.createFromShape(
          obj.node as Konva.Shape,
          index === 0 ? 'replace' : 'add'
        )
      }
    })
    
    this.selectionRenderer.startRendering()
  }

  serializeSelection(): any {
    if (!this.state.selection) return null
    
    if (this.state.selection.type === 'objects') {
      const selectedObjects = this.getSelectedObjects()
      return {
        type: 'objects',
        objects: serializeCanvasObjects(selectedObjects),
        bounds: this.getSelectionBounds()
      }
    }
    
    return {
      type: this.state.selection.type,
      data: (this.state.selection as any).data
    }
  }

  deserializeSelection(data: any): void {
    if (!data) {
      this.clearSelection()
      return
    }
    
    if (data.type === 'objects' && data.objects) {
      // Find objects by ID and select them
      const objectIds = data.objects.map((obj: any) => obj.id)
      const objects = this.findObjectsByIds(objectIds)
      if (objects.length > 0) {
        this.selectObjects(objects.map(obj => obj.id))
      }
    } else {
      // Handle pixel-based selections
      if (data.type === 'pixel' && data.data) {
        this._state.selection = {
          type: 'pixel',
          bounds: data.bounds || { x: 0, y: 0, width: 0, height: 0 },
          mask: data.data
        }
        // SelectionManager will handle restoring the pixel selection
        if (data.data && this.selectionManager) {
          this.selectionManager.restoreSelection(data.data, data.bounds)
        }
      } else {
        // Other selection types
        this._state.selection = data as Selection
      }
    }
  }

  private createCanvasObjectFromDataURL(dataURL: string): CanvasObject {
    const id = `canvas-${Date.now()}`
    const image = new Konva.Image({
      id,
      image: new Image() // Placeholder, will be loaded
    })
    
    // Store dataURL in a way that doesn't conflict with HTMLCanvasElement
    const canvasData = { dataURL, type: 'canvas-export' }
    
    const canvasObject: CanvasObject = {
      id,
      type: 'image',
      name: 'Canvas Export',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      transform: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        skewX: 0,
        skewY: 0
      },
      node: image,
      data: canvasData as Record<string, unknown>,
      layerId: this._state.activeLayerId || ''
    }
    
    // Load the image
    const img = new Image()
    img.onload = () => {
      image.image(img)
      this.renderAll()
    }
    img.src = dataURL
    
    return canvasObject
  }

  private applyFiltersToNode(node: Konva.Node, filters: Array<{ type: string; params: any }>): void {
    if (!(node instanceof Konva.Image)) return
    
    const imageNode = node as Konva.Image
    const filterFuncs: any[] = []
    
    filters.forEach(filter => {
      switch (filter.type) {
        case 'brightness':
          imageNode.brightness((filter.params.value || 0) / 100)
          filterFuncs.push(Konva.Filters.Brighten)
          break
          
        case 'contrast':
          imageNode.contrast(Number(filter.params.value) || 0)
          filterFuncs.push(Konva.Filters.Contrast)
          break
          
        case 'blur':
          imageNode.blurRadius(Number(filter.params.radius) || 0)
          filterFuncs.push(Konva.Filters.Blur)
          break
          
        case 'grayscale':
          filterFuncs.push(Konva.Filters.Grayscale)
          break
          
        case 'sepia':
          filterFuncs.push(Konva.Filters.Sepia)
          break
          
        case 'invert':
          filterFuncs.push(Konva.Filters.Invert)
          break
          
        case 'hue':
          imageNode.hue(Number(filter.params.value) || 0)
          filterFuncs.push(Konva.Filters.HSL)
          break
          
        case 'saturation':
          imageNode.saturation(Number(filter.params.value) || 0)
          filterFuncs.push(Konva.Filters.HSL)
          break
          
        case 'pixelate':
          imageNode.pixelSize(Number(filter.params.size) || 8)
          filterFuncs.push(Konva.Filters.Pixelate)
          break
          
        case 'noise':
          imageNode.noise(Number(filter.params.amount) || 0.5)
          filterFuncs.push(Konva.Filters.Noise)
          break
          
        case 'emboss':
          imageNode.embossStrength(Number(filter.params.strength) || 0.5)
          imageNode.embossWhiteLevel(Number(filter.params.whiteLevel) || 0.5)
          imageNode.embossDirection(String(filter.params.direction) || 'top-left')
          filterFuncs.push(Konva.Filters.Emboss)
          break
          
        case 'enhance':
          imageNode.enhance(Number(filter.params.value) || 0.1)
          filterFuncs.push(Konva.Filters.Enhance)
          break
      }
    })
    
    if (filterFuncs.length > 0) {
      imageNode.filters(filterFuncs)
      imageNode.cache()
    }
  }

  toJSON(): any {
    return {
      dimensions: { 
        width: this._state.width,
        height: this._state.height
      },
      backgroundColor: this._state.backgroundColor,
      layers: this._state.layers.map(layer => ({
        ...layer,
        objects: serializeCanvasObjects(layer.objects)
      })),
      activeLayerId: this._state.activeLayerId,
      metadata: {} // Add metadata support if needed
    }
  }

  getObjectById(id: string): CanvasObject | null {
    for (const layer of this.state.layers) {
      const object = layer.objects.find(obj => obj.id === id)
      if (object) return object
    }
    return null
  }

  async updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void> {
    const obj = this.findObject(objectId)
    if (!obj) return
    
    const previousState = { ...obj }
    
    // Apply updates to the object
    if (updates.transform) {
      Object.assign(obj.transform, updates.transform)
      obj.node.setAttrs({
        x: obj.transform.x,
        y: obj.transform.y,
        scaleX: obj.transform.scaleX,
        scaleY: obj.transform.scaleY,
        rotation: obj.transform.rotation,
        skewX: obj.transform.skewX,
        skewY: obj.transform.skewY
      })
    }
    
    if (updates.opacity !== undefined) {
      obj.opacity = updates.opacity
      obj.node.opacity(updates.opacity)
    }
    
    if (updates.visible !== undefined) {
      obj.visible = updates.visible
      obj.node.visible(updates.visible)
    }
    
    if (updates.locked !== undefined) {
      obj.locked = updates.locked
      obj.node.listening(!updates.locked)
      obj.node.draggable(!updates.locked)
    }
    
    if (updates.blendMode !== undefined) {
      obj.blendMode = updates.blendMode
      // Map our blend modes to Konva's globalCompositeOperation
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
        'hue': 'source-over', // Not supported by canvas, use normal
        'saturation': 'source-over', // Not supported by canvas, use normal
        'color': 'source-over', // Not supported by canvas, use normal
        'luminosity': 'source-over' // Not supported by canvas, use normal
      }
      obj.node.globalCompositeOperation(blendModeMap[updates.blendMode] || 'source-over')
    }
    
    // Update the layer
    const layer = this._state.layers.find(l => l.id === obj.layerId)
    if (layer) {
      layer.konvaLayer.batchDraw()
    }
    
    // Create and append event to EventStore
    const currentVersion = this.eventStore.getAggregateVersion(this.stage.id())
    const event = new ObjectModifiedEvent(
      this.stage.id(),
      obj,
      previousState,
      updates,
      this.executionContext?.getMetadata() || { source: 'user' },
      currentVersion + 1
    )
    
    if (this.executionContext) {
      // If we have an execution context, emit through it (will be committed later)
      await this.executionContext.emit(event)
    } else {
      // Otherwise, append directly to EventStore
      await this.eventStore.append(event)
      
      // EventStore will notify its handlers, which will trigger TypedEventBus updates
      // We don't need to emit to TypedEventBus directly - that happens in EventStore
    }
  }

  getSelectionData(): any {
    if (!this._state.selection) return null
    
    if (this._state.selection.type === 'objects') {
      const objects = this.getSelectedObjects()
      return {
        type: 'objects',
        objects: serializeCanvasObjects(objects),
        count: objects.length,
        bounds: this.getSelectionBounds()
      }
    }
    
    return {
      type: this._state.selection.type,
      data: (this._state.selection as any).data
    }
  }

  /**
   * Get bounds of current selection
   */
  private getSelectionBounds(): Rect | null {
    if (!this._state.selection) return null
    
    if (this._state.selection.type === 'objects') {
      const objects = this.getSelectedObjects()
      if (objects.length === 0) return null
      
      let minX = Infinity, minY = Infinity
      let maxX = -Infinity, maxY = -Infinity
      
      objects.forEach(obj => {
        if (obj.node) {
          const box = obj.node.getClientRect()
          minX = Math.min(minX, box.x)
          minY = Math.min(minY, box.y)
          maxX = Math.max(maxX, box.x + box.width)
          maxY = Math.max(maxY, box.y + box.height)
        }
      })
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    }
    
    // For other selection types, use their bounds
    if ('bounds' in this._state.selection) {
      return this._state.selection.bounds
    }
    
    return null
  }

  /**
   * Find multiple objects by their IDs
   */
  private findObjectsByIds(ids: string[]): CanvasObject[] {
    const objects: CanvasObject[] = []
    
    for (const id of ids) {
      const obj = this.findObject(id)
      if (obj) {
        objects.push(obj)
      }
    }
    
    return objects
  }

  /**
   * Render all layers
   */
  private renderAll(): void {
    this.stage.batchDraw()
  }
  
  /**
   * Update the canvas background to show canvas bounds
   */
  private updateCanvasBackground(): void {
    // Remove existing background if any
    const existingBg = this.backgroundLayer.findOne('#canvas-background')
    if (existingBg) {
      existingBg.destroy()
    }
    
    // Create a rect that shows the canvas bounds
    const bgRect = new Konva.Rect({
      id: 'canvas-background',
      x: 0,
      y: 0,
      width: this._state.width,
      height: this._state.height,
      fill: this._state.backgroundColor === 'transparent' ? '#ffffff' : this._state.backgroundColor,
      listening: false
    })
    
    // Add to background layer at the bottom
    this.backgroundLayer.add(bgRect)
    bgRect.moveToBottom()
    
    // Clipping is applied directly to layers, no need for a separate rect
    
    // Apply clipping to all content layers (but not selection/overlay layers)
    this._state.layers.forEach(layer => {
      layer.konvaLayer.clip({
        x: 0,
        y: 0,
        width: this._state.width,
        height: this._state.height
      })
    })
    
    this.backgroundLayer.draw()
  }
} 