import Konva from 'konva'
import { nanoid } from 'nanoid'
import type { 
  CanvasManager as ICanvasManager, 
  CanvasState, 
  Layer, 
  CanvasObject, 
  Selection,
  Point,
  Rect,
  Filter,
  BlendMode,
  Transform
} from './types'
import { EventStore } from '@/lib/events/core/EventStore'
import { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { ObjectAddedEvent, ObjectModifiedEvent, ObjectRemovedEvent } from '@/lib/events/canvas/CanvasEvents'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ResourceManager } from '@/lib/core/ResourceManager'
import { CanvasResizedEvent } from '@/lib/events/canvas/DocumentEvents'

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
    
    // Initialize stage
    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight
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
      backgroundColor: '#ffffff',
      isLoading: false,
      canUndo: false,
      canRedo: false
    }
    
    // Subscribe to events
    this.subscribeToEvents()
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
    this.eventStore.subscribe('*', (_event) => {
      // Update undo/redo state based on event store
      // This will be implemented by the history store
      this.updateHistoryState()
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
      name: layerData.name || `Layer ${this._state.layers.length + 1}`,
      type: layerData.type || 'raster',
      visible: layerData.visible ?? true,
      locked: layerData.locked ?? false,
      opacity: layerData.opacity ?? 1,
      blendMode: layerData.blendMode || 'normal',
      konvaLayer,
      objects: [],
      parentId: layerData.parentId
    }
    
    // Apply blend mode
    this.applyBlendMode(konvaLayer, layer.blendMode)
    
    // Insert before overlay layers
    const index = this.stage.children.length - 2
    this.stage.add(konvaLayer)
    konvaLayer.setZIndex(index)
    
    this._state.layers.push(layer)
    
    // Set as active if first layer
    if (this._state.layers.length === 1) {
      this._state.activeLayerId = layer.id
    }
    
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
    
    // Create Konva node based on object type
    let node: Konva.Node
    
    switch (objectData.type) {
      case 'image':
        node = new Konva.Image({
          image: objectData.data as HTMLImageElement,
          x: objectData.transform?.x || 0,
          y: objectData.transform?.y || 0
        })
        break
        
      case 'text':
        node = new Konva.Text({
          text: objectData.data as string,
          x: objectData.transform?.x || 0,
          y: objectData.transform?.y || 0,
          fontSize: 16,
          fontFamily: 'Arial'
        })
        break
        
      case 'shape':
        // Default to rectangle for now
        node = new Konva.Rect({
          x: objectData.transform?.x || 0,
          y: objectData.transform?.y || 0,
          width: 100,
          height: 100,
          fill: '#000000'
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
      transform: objectData.transform || {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        skewX: 0,
        skewY: 0
      },
      node,
      layerId: targetLayerId
    }
    
    // Add to Konva layer - Konva.Layer.add() accepts any Konva.Node
    layer.konvaLayer.add(node)
    layer.objects.push(object)
    layer.konvaLayer.draw()
    
    // Emit event
    this.eventStore.append(new ObjectAddedEvent(
      this.stage.id(),
      { ...object, node: undefined } as CanvasObject, // Remove node reference for serialization
      targetLayerId,
      { source: 'user' }
    ))
    
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
        this.eventStore.append(new ObjectRemovedEvent(
          this.stage.id(),
          { objectId } as any, // Wrap in object to match expected type
          { source: 'user' }
        ))
        
        break
      }
    }
  }
  
  async updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void> {
    for (const layer of this._state.layers) {
      const object = layer.objects.find(o => o.id === objectId)
      if (object) {
        // Capture previous state
        const previousState = { ...object }
        
        // Update object properties
        Object.assign(object, updates)
        
        // Update Konva node
        if (updates.transform) {
          object.node.setAttrs(updates.transform)
        }
        if (updates.opacity !== undefined) {
          object.node.opacity(updates.opacity)
        }
        if (updates.visible !== undefined) {
          object.node.visible(updates.visible)
        }
        
        layer.konvaLayer.draw()
        
        // Emit event
        this.eventStore.append(new ObjectModifiedEvent(
          this.stage.id(),
          { ...object, node: undefined } as any, // Remove node reference
          { ...previousState, node: undefined } as any,
          updates as any,
          { source: 'user' }
        ))
        
        break
      }
    }
  }
  
  // Selection operations
  setSelection(selection: Selection | null): void {
    this._state.selection = selection
    this.renderSelection()
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
        data: canvas
      }
      
      activeLayer.konvaLayer.add(image)
      activeLayer.objects.push(canvasObject)
      activeLayer.konvaLayer.draw()
      
      // Emit event
      if (this.executionContext) {
        this.executionContext.emit(new ObjectAddedEvent(
          this.stage.id(),
          { ...canvasObject, node: undefined } as any,
          activeLayer.id,
          this.executionContext.getMetadata()
        ))
      } else {
        this.eventStore.append(new ObjectAddedEvent(
          this.stage.id(),
          { ...canvasObject, node: undefined } as any,
          activeLayer.id,
          { source: 'user' }
        ))
      }
    }
  }
  
  // Filter operations
  async applyFilter(filter: Filter, target?: CanvasObject | CanvasObject[]): Promise<void> {
    const targets = target ? (Array.isArray(target) ? target : [target]) : this.getSelectedObjects()
    
    if (targets.length === 0) return
    
    for (const obj of targets) {
      if (obj.type !== 'image') continue
      
      const imageNode = obj.node as Konva.Image
      
      // Cache the image for filter application
      imageNode.cache()
      
      // Apply filter based on type
      switch (filter.type) {
        case 'brightness':
          imageNode.filters([Konva.Filters.Brighten])
          imageNode.brightness(filter.params.value / 100)
          break
          
        case 'contrast':
          imageNode.filters([Konva.Filters.Contrast])
          imageNode.contrast(filter.params.value)
          break
          
        case 'blur':
          imageNode.filters([Konva.Filters.Blur])
          imageNode.blurRadius(filter.params.radius)
          break
          
        case 'grayscale':
          imageNode.filters([Konva.Filters.Grayscale])
          break
          
        case 'sepia':
          imageNode.filters([Konva.Filters.Sepia])
          break
          
        case 'invert':
          imageNode.filters([Konva.Filters.Invert])
          break
          
        case 'hue':
          imageNode.filters([Konva.Filters.HSL])
          imageNode.hue(filter.params.value)
          break
          
        case 'saturation':
          imageNode.filters([Konva.Filters.HSL])
          imageNode.saturation(filter.params.value)
          break
          
        case 'pixelate':
          imageNode.filters([Konva.Filters.Pixelate])
          imageNode.pixelSize(filter.params.size || 8)
          break
          
        case 'noise':
          imageNode.filters([Konva.Filters.Noise])
          imageNode.noise(filter.params.amount || 0.5)
          break
          
        case 'emboss':
          imageNode.filters([Konva.Filters.Emboss])
          imageNode.embossStrength(filter.params.strength || 0.5)
          imageNode.embossWhiteLevel(filter.params.whiteLevel || 0.5)
          imageNode.embossDirection(filter.params.direction || 'top-left')
          break
          
        case 'enhance':
          imageNode.filters([Konva.Filters.Enhance])
          imageNode.enhance(filter.params.value || 0.1)
          break
          
        default:
          console.warn(`Unsupported filter type: ${filter.type}`)
          continue
      }
      
      // Update the layer
      const layer = this._state.layers.find(l => l.id === obj.layerId)
      if (layer) {
        layer.konvaLayer.batchDraw()
      }
      
      // Emit event
      const event = new ObjectModifiedEvent(
        this.stage.id(),
        { ...obj, node: undefined } as any,
        { ...obj, node: undefined } as any,
        { filters: [filter] },
        this.executionContext?.getMetadata() || { source: 'user' }
      )
      
      if (this.executionContext) {
        await this.executionContext.emit(event)
      } else {
        this.eventStore.append(event)
      }
    }
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
    const previousWidth = this._state.width
    const previousHeight = this._state.height
    
    this._state.width = width
    this._state.height = height
    this.stage.width(width)
    this.stage.height(height)
    
    // Emit resize event
    const event = new CanvasResizedEvent(
      this.stage.id(),
      width,
      height,
      previousWidth,
      previousHeight,
      this.executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (this.executionContext) {
      await this.executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
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
      const event = new ObjectModifiedEvent(
        this.stage.id(),
        { ...obj, node: undefined } as any,
        { ...obj, transform: previousTransform, node: undefined } as any,
        { transform: obj.transform },
        this.executionContext?.getMetadata() || { source: 'user' }
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
      const event = new ObjectModifiedEvent(
        this.stage.id(),
        { ...obj, node: undefined } as any,
        { ...obj, transform: previousTransform, node: undefined } as any,
        { transform: obj.transform },
        this.executionContext?.getMetadata() || { source: 'user' }
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
    const containerWidth = this.container.offsetWidth
    const containerHeight = this.container.offsetHeight
    
    const scaleX = containerWidth / this._state.width
    const scaleY = containerHeight / this._state.height
    const scale = Math.min(scaleX, scaleY)
    
    this.setZoom(scale)
    this.setPan({
      x: (containerWidth - this._state.width * scale) / 2,
      y: (containerHeight - this._state.height * scale) / 2
    })
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
  
  findObjectByFabricId(fabricId: string): CanvasObject | null {
    // This is for compatibility during migration
    // In the new system, we use our own IDs
    return this.findObject(fabricId)
  }
  
  // Helper to set execution context
  setExecutionContext(context: ExecutionContext | null): void {
    this.executionContext = context
  }
} 