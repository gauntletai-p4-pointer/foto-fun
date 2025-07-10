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
  BlendMode
} from './types'
import {
  serializeCanvasObject,
  serializeCanvasObjects
} from './types'
import { EventStore } from '@/lib/events/core/EventStore'
import { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { ObjectAddedEvent, ObjectModifiedEvent, ObjectRemovedEvent } from '@/lib/events/canvas/CanvasEvents'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ResourceManager } from '@/lib/core/ResourceManager'
import { CanvasResizedEvent } from '@/lib/events/canvas/DocumentEvents'
import { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import { SelectionRenderer } from '@/lib/editor/selection/SelectionRenderer'

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
    
    // Initialize selection system
    this.selectionManager = new SelectionManager(this, this.typedEventBus)
    this.selectionRenderer = new SelectionRenderer(this, this.selectionManager)
    
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
    
    // Add to Konva layer - cast to Shape or Group which are the valid types
    layer.konvaLayer.add(node as Konva.Shape | Konva.Group)
    layer.objects.push(object)
    layer.konvaLayer.draw()
    
    // Emit event - events store the full object internally but serialize for storage
    this.eventStore.append(new ObjectAddedEvent(
      this.stage.id(),
      object, // Pass full object, event will handle serialization
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
          object,
          { source: 'user' }
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
      if (this.executionContext) {
        this.executionContext.emit(new ObjectAddedEvent(
          this.stage.id(),
          canvasObject,
          activeLayer.id,
          this.executionContext.getMetadata()
        ))
      } else {
        this.eventStore.append(new ObjectAddedEvent(
          this.stage.id(),
          canvasObject,
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
          imageNode.brightness((Number(filter.params.value) || 0) / 100)
          break
          
        case 'contrast':
          imageNode.filters([Konva.Filters.Contrast])
          imageNode.contrast(Number(filter.params.value) || 0)
          break
          
        case 'blur':
          imageNode.filters([Konva.Filters.Blur])
          imageNode.blurRadius(Number(filter.params.radius) || 0)
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
          imageNode.hue(Number(filter.params.value) || 0)
          break
          
        case 'saturation':
          imageNode.filters([Konva.Filters.HSL])
          imageNode.saturation(Number(filter.params.value) || 0)
          break
          
        case 'pixelate':
          imageNode.filters([Konva.Filters.Pixelate])
          imageNode.pixelSize(Number(filter.params.size) || 8)
          break
          
        case 'noise':
          imageNode.filters([Konva.Filters.Noise])
          imageNode.noise(Number(filter.params.amount) || 0.5)
          break
          
        case 'emboss':
          imageNode.filters([Konva.Filters.Emboss])
          imageNode.embossStrength(Number(filter.params.strength) || 0.5)
          imageNode.embossWhiteLevel(Number(filter.params.whiteLevel) || 0.5)
          imageNode.embossDirection(String(filter.params.direction) || 'top-left')
          break
          
        case 'enhance':
          imageNode.filters([Konva.Filters.Enhance])
          imageNode.enhance(Number(filter.params.value) || 0.1)
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
          obj,
          { ...obj },
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
        obj,
        previousTransform,
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
        obj,
        previousTransform,
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
  
  findObjectByFabricId(fabricId: string): CanvasObject | null {
    // This is for compatibility during migration
    // In the new system, we use our own IDs
    return this.findObject(fabricId)
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

  async updateObject(id: string, updates: Partial<CanvasObject>): Promise<void> {
    const object = this.getObjectById(id)
    if (!object) return
    
    // Apply updates
    Object.assign(object, updates)
    
    // Update Konva node if transform changed
    if (updates.transform && object.node) {
      object.node.setAttrs({
        x: object.transform.x,
        y: object.transform.y,
        scaleX: object.transform.scaleX,
        scaleY: object.transform.scaleY,
        rotation: object.transform.rotation,
        skewX: object.transform.skewX,
        skewY: object.transform.skewY
      })
    }
    
    // Update visibility
    if (updates.visible !== undefined && object.node) {
      object.node.visible(updates.visible)
    }
    
    // Update opacity
    if (updates.opacity !== undefined && object.node) {
      object.node.opacity(updates.opacity)
    }
    
    this.renderAll()
    
    // Emit event
    this.typedEventBus.emit('canvas.object.modified', {
      canvasId: this.id,
      objectId: id,
      previousState: {},
      newState: updates
    })
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
} 