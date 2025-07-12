/**
 * Filter Manager Service
 * Coordinates filter operations across layers, selections, and adjustment layers
 * Following the Photoshop-like filtering paradigm
 */

import { nanoid } from 'nanoid'
import Konva from 'konva'
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ResourceManager } from '@/lib/core/ResourceManager'
import { WebGLFilterManager } from './WebGLFilterManager'
import type { 
  Layer, 
  Filter, 
  FilterStack, 
  FilterInstance, 
  Selection,
  LayerMask,
  AdjustmentLayerData
} from '@/lib/editor/canvas/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { ObjectAddedEvent } from '@/lib/events/canvas/CanvasEvents'
import { 
  FilterStackUpdatedEvent,
  FilterAddedToLayerEvent,
  FilterRemovedFromLayerEvent,
} from '@/lib/events/canvas/LayerEvents'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

/**
 * Object metadata filter stack interface
 */
export interface ObjectFilterStack {
  filters: FilterInstance[]
  enabled: boolean
  opacity: number
  blendMode: string
  cachedResult?: HTMLCanvasElement
  isDirty: boolean
}

export type FilterTarget = 
  | { type: 'layer'; layerId: string }
  | { type: 'selection'; layerId: string; selection: Selection }
  | { type: 'adjustment'; adjustmentType: AdjustmentLayerData['adjustmentType'] }

/**
 * Main filter manager that handles all filter operations
 */
export class FilterManager {
  private webglFilterManager: WebGLFilterManager
  private filterCache = new Map<string, HTMLCanvasElement>()
  
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private resourceManager: ResourceManager,
    private canvasManager: CanvasManager
  ) {
    this.webglFilterManager = new WebGLFilterManager(eventStore, typedEventBus, resourceManager)
    
    // Register cleanup
    this.resourceManager.registerCleanup('filter-manager', () => {
      this.destroy()
    })
  }
  
  /**
   * Initialize the filter system
   */
  async initialize(): Promise<void> {
    await this.webglFilterManager.initialize()
  }
  
  /**
   * Apply a filter based on the target type
   */
  async applyFilter(
    filter: Filter,
    target: FilterTarget,
    executionContext?: ExecutionContext
  ): Promise<void> {
    switch (target.type) {
      case 'layer':
        await this.applyFilterToLayer(filter, target.layerId, executionContext)
        break
        
      case 'selection':
        await this.applyFilterToSelection(filter, target.layerId, target.selection, executionContext)
        break
        
      case 'adjustment':
        await this.createAdjustmentLayer(filter, target.adjustmentType, executionContext)
        break
    }
  }
  
  /**
   * Apply filter to an entire layer (non-destructive)
   */
  private async applyFilterToLayer(
    filter: Filter,
    layerId: string,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const layer = this.getLayer(layerId)
    if (!layer) return
    
    // Initialize filter stack if needed
    if (!layer.filterStack) {
      layer.filterStack = {
        filters: [],
        enabled: true,
        opacity: 1,
        blendMode: 'normal',
        cachedResult: undefined,
        isDirty: true
      }
    }
    
    // Create filter instance
    const filterInstance: FilterInstance = {
      id: nanoid(),
      filter,
      enabled: true,
      opacity: 1,
      engineType: this.isWebGLFilter(filter.type) ? 'webgl' : 'konva'
    }
    
    // Add to stack
    layer.filterStack.filters.push(filterInstance)
    layer.filterStack.isDirty = true
    
    // Apply the filter stack to render
    await this.renderLayerWithFilters(layer)
    
    // Emit event
    const event = new FilterAddedToLayerEvent(
      layerId,
      filterInstance,
      layer.filterStack.filters.length - 1,
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
    
    // Notify UI
    this.typedEventBus.emit('layer.filter.added', {
      layerId,
      filter: filterInstance,
      position: layer.filterStack.filters.length - 1
    })
  }
  
  /**
   * Apply filter to a selection area with masking
   */
  private async applyFilterToSelection(
    filter: Filter,
    layerId: string,
    selection: Selection,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const layer = this.getLayer(layerId)
    if (!layer) return
    
    // Create a mask from the selection
    const mask = await this.createMaskFromSelection(selection)
    
    // Create filter instance with mask
    const filterInstance: FilterInstance = {
      id: nanoid(),
      filter,
      enabled: true,
      opacity: 1,
      mask,
      engineType: this.isWebGLFilter(filter.type) ? 'webgl' : 'konva'
    }
    
    // Initialize filter stack if needed
    if (!layer.filterStack) {
      layer.filterStack = {
        filters: [],
        enabled: true,
        opacity: 1,
        blendMode: 'normal',
        cachedResult: undefined,
        isDirty: true
      }
    }
    
    // Add to stack
    layer.filterStack.filters.push(filterInstance)
    layer.filterStack.isDirty = true
    
    // Apply the filter stack
    await this.renderLayerWithFilters(layer)
    
    // Emit event
    const event = new FilterAddedToLayerEvent(
      layerId,
      filterInstance,
      layer.filterStack.filters.length - 1,
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
  }
  
  /**
   * Create an adjustment layer
   */
  private async createAdjustmentLayer(
    filter: Filter,
    adjustmentType: AdjustmentLayerData['adjustmentType'],
    executionContext?: ExecutionContext
  ): Promise<void> {
    // Create adjustment layer data
    const adjustmentData: AdjustmentLayerData = {
      adjustmentType,
      settings: filter.params
    }
    
    // Create an adjustment object instead of layer
    const adjustmentObjectId = await this.canvasManager.addObject({
      type: 'group',
      name: `${adjustmentType} Adjustment`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      metadata: {
        isAdjustmentLayer: true,
        adjustmentType,
        adjustmentData,
        filterStack: {
          filters: [{
            id: nanoid(),
            filter,
            enabled: true,
            opacity: 1,
            engineType: this.isWebGLFilter(filter.type) ? 'webgl' : 'konva'
          }],
          enabled: true,
          opacity: 1,
          blendMode: 'normal',
          cachedResult: undefined,
          isDirty: true
        }
      }
    })
    
    const adjustmentObject = this.canvasManager.getObject(adjustmentObjectId)!
    
    // Adjustment data and filter stack are now stored in metadata
    
    // Render the adjustment effect
    await this.renderAdjustmentLayer(adjustmentObject, adjustmentData)
    
    // Emit event
    const event = new ObjectAddedEvent(
      this.canvasManager.id,
      adjustmentObject,
      undefined, // layerId
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
  }
  
  /**
   * Render a layer with its filter stack applied
   */
  async renderLayerWithFilters(layer: Layer): Promise<void> {
    if (!layer.filterStack || !layer.filterStack.enabled || layer.filterStack.filters.length === 0) {
      // No filters, just draw normally
      layer.konvaLayer.batchDraw()
      return
    }
    
    // Check cache
    if (!layer.filterStack.isDirty && layer.filterStack.cachedResult) {
      // Use cached result
      this.applyFilteredResult(layer, layer.filterStack.cachedResult)
      return
    }
    
    // Create a temporary canvas for the layer content
    const tempCanvas = document.createElement('canvas')
    const rect = layer.konvaLayer.getClientRect()
    tempCanvas.width = rect.width
    tempCanvas.height = rect.height
    
    // Draw layer content to temp canvas
    const tempContext = tempCanvas.getContext('2d')!
    layer.konvaLayer.draw()
    const layerCanvas = layer.konvaLayer.getCanvas()._canvas
    tempContext.drawImage(layerCanvas, 0, 0)
    
    // Apply each filter in the stack
    let result = tempCanvas
    for (const filterInstance of layer.filterStack.filters) {
      if (!filterInstance.enabled) continue
      
      result = await this.applyFilterInstance(result, filterInstance)
    }
    
    // Cache the result
    layer.filterStack.cachedResult = result
    layer.filterStack.isDirty = false
    
    // Apply the filtered result back to the layer
    this.applyFilteredResult(layer, result)
  }
  
  /**
   * Apply a single filter instance
   */
  private async applyFilterInstance(
    source: HTMLCanvasElement,
    filterInstance: FilterInstance
  ): Promise<HTMLCanvasElement> {
    let result = source
    
    // Apply the filter
    if (filterInstance.engineType === 'webgl') {
      result = await this.webglFilterManager.processWithWebGL(
        source,
        filterInstance.filter.type,
        filterInstance.filter.params
      )
    } else {
      result = await this.applyKonvaFilterToCanvas(source, filterInstance.filter)
    }
    
    // Apply mask if present
    if (filterInstance.mask && filterInstance.mask.enabled) {
      result = this.applyMaskToCanvas(result, source, filterInstance.mask)
    }
    
    // Apply opacity if needed
    if (filterInstance.opacity < 1) {
      result = this.applyOpacityToCanvas(result, source, filterInstance.opacity)
    }
    
    return result
  }
  
  /**
   * Render an adjustment layer
   */
  private async renderAdjustmentLayer(
    object: import('@/lib/editor/objects/types').CanvasObject,
    _adjustmentData: AdjustmentLayerData
  ): Promise<void> {
    // Get all layers below this adjustment layer
    const objectsBelow = this.getObjectsBelow(object)
    
    // Composite layers below
    const composite = await this.compositeLayers(objectsBelow)
    
    // Apply the adjustment
    const filterStack = object.metadata?.filterStack as ObjectFilterStack | undefined
    if (filterStack && filterStack.filters.length > 0) {
      const filtered = await this.applyFilterInstance(
        composite,
        filterStack.filters[0]
      )
      
      // Create Konva image for rendering (variable used in comment for documentation)
      const _renderImage = new Konva.Image({
        image: filtered,
        x: 0,
        y: 0
      })
      
      // Update object with the filtered content
      // In object-based architecture, we'd update the object's data
      // For now, this is a placeholder implementation
      await this.canvasManager.updateObject(object.id, {
        data: {
          ...object.data,
          element: filtered
        }
      })
    }
  }
  
  /**
   * Create a mask from a selection
   */
  private async createMaskFromSelection(selection: Selection): Promise<LayerMask> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const canvasState = this.canvasManager.state
    
    canvas.width = canvasState.viewport.width
    canvas.height = canvasState.viewport.height
    
    // Fill with black (transparent)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw selection as white (opaque)
    ctx.fillStyle = 'white'
    
    switch (selection.type) {
      case 'rectangle':
        ctx.fillRect(
          selection.bounds.x,
          selection.bounds.y,
          selection.bounds.width,
          selection.bounds.height
        )
        break
        
      case 'ellipse':
        ctx.beginPath()
        ctx.ellipse(
          selection.bounds.x + selection.bounds.width / 2,
          selection.bounds.y + selection.bounds.height / 2,
          selection.bounds.width / 2,
          selection.bounds.height / 2,
          0,
          0,
          Math.PI * 2
        )
        ctx.fill()
        break
        
      case 'polygon':
        if (selection.points && selection.points.length > 0) {
          ctx.beginPath()
          ctx.moveTo(selection.points[0].x, selection.points[0].y)
          for (let i = 1; i < selection.points.length; i++) {
            ctx.lineTo(selection.points[i].x, selection.points[i].y)
          }
          ctx.closePath()
          ctx.fill()
        }
        break
        
      case 'freeform':
        // Use the path string to create a Path2D
        if (selection.path) {
          const path2d = new Path2D(selection.path)
          ctx.fill(path2d)
        }
        break
        
      case 'pixel':
        if (selection.mask) {
          // Use the mask ImageData
          const imageData = ctx.createImageData(canvas.width, canvas.height)
          // Copy alpha channel from selection mask
          for (let i = 0; i < selection.mask.data.length; i += 4) {
            const alpha = selection.mask.data[i + 3]
            imageData.data[i] = 255
            imageData.data[i + 1] = 255
            imageData.data[i + 2] = 255
            imageData.data[i + 3] = alpha
          }
          ctx.putImageData(imageData, 0, 0)
        }
        break
        
      case 'objects':
        // For object selection, create a mask from the object bounds
        // This would need access to the actual objects
        // For now, just create an empty mask
        break
    }
    
    return {
      type: 'selection',
      enabled: true,
      inverted: false,
      opacity: 1,
      data: selection,
      cachedMask: canvas
    }
  }
  
  /**
   * Apply a Konva filter to a canvas
   */
  private async applyKonvaFilterToCanvas(
    source: HTMLCanvasElement,
    filter: Filter
  ): Promise<HTMLCanvasElement> {
    // Create a temporary Konva stage
    const tempStage = new Konva.Stage({
      container: document.createElement('div'),
      width: source.width,
      height: source.height
    })
    
    const tempLayer = new Konva.Layer()
    tempStage.add(tempLayer)
    
    const image = new Konva.Image({
      image: source,
      x: 0,
      y: 0
    })
    
    tempLayer.add(image)
    
    // Apply Konva filter
    await this.applyKonvaFilter(image, filter)
    
    // Get result
    const result = tempLayer.toCanvas()
    
    // Cleanup
    tempStage.destroy()
    
    return result
  }
  
  /**
   * Apply a Konva filter to an image node
   */
  private async applyKonvaFilter(
    imageNode: Konva.Image,
    filter: Filter
  ): Promise<void> {
    imageNode.cache()
    
    const filters = imageNode.filters() || []
    
    switch (filter.type) {
      case 'blur':
        if (!filters.includes(Konva.Filters.Blur)) {
          filters.push(Konva.Filters.Blur)
        }
        imageNode.filters(filters)
        imageNode.blurRadius(Number(filter.params.radius) || 0)
        break
        
      case 'grayscale':
        if (!filters.includes(Konva.Filters.Grayscale)) {
          filters.push(Konva.Filters.Grayscale)
        }
        imageNode.filters(filters)
        break
        
      case 'sepia':
        if (!filters.includes(Konva.Filters.Sepia)) {
          filters.push(Konva.Filters.Sepia)
        }
        imageNode.filters(filters)
        break
        
      case 'invert':
        if (!filters.includes(Konva.Filters.Invert)) {
          filters.push(Konva.Filters.Invert)
        }
        imageNode.filters(filters)
        break
        
      case 'sharpen':
        if (!filters.includes(Konva.Filters.Enhance)) {
          filters.push(Konva.Filters.Enhance)
        }
        imageNode.filters(filters)
        imageNode.enhance(Number(filter.params.amount) || 0.1)
        break
    }
  }
  
  /**
   * Apply a mask to a canvas
   */
  private applyMaskToCanvas(
    filtered: HTMLCanvasElement,
    original: HTMLCanvasElement,
    mask: LayerMask
  ): HTMLCanvasElement {
    const result = document.createElement('canvas')
    result.width = filtered.width
    result.height = filtered.height
    const ctx = result.getContext('2d')!
    
    // Draw original
    ctx.drawImage(original, 0, 0)
    
    // Set up masking
    ctx.globalCompositeOperation = 'source-in'
    
    // Draw mask
    if (mask.cachedMask) {
      ctx.drawImage(mask.cachedMask, 0, 0)
    }
    
    // Draw filtered on top
    ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(filtered, 0, 0)
    
    return result
  }
  
  /**
   * Apply opacity to a canvas
   */
  private applyOpacityToCanvas(
    filtered: HTMLCanvasElement,
    original: HTMLCanvasElement,
    opacity: number
  ): HTMLCanvasElement {
    const result = document.createElement('canvas')
    result.width = filtered.width
    result.height = filtered.height
    const ctx = result.getContext('2d')!
    
    // Draw original
    ctx.drawImage(original, 0, 0)
    
    // Draw filtered with opacity
    ctx.globalAlpha = opacity
    ctx.drawImage(filtered, 0, 0)
    
    return result
  }
  
  /**
   * Apply filtered result back to layer
   */
  private applyFilteredResult(layer: Layer, result: HTMLCanvasElement): void {
    // Create an image from the result
    const image = new Konva.Image({
      image: result,
      x: 0,
      y: 0
    })
    
    // Clear the layer and add the filtered image
    layer.konvaLayer.destroyChildren()
    layer.konvaLayer.add(image)
    layer.konvaLayer.batchDraw()
  }
  
  /**
   * Composite multiple layers
   */
  private async compositeLayers(objects: import('@/lib/editor/objects/types').CanvasObject[]): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')
    const canvasState = this.canvasManager.state
    canvas.width = canvasState.viewport.width
    canvas.height = canvasState.viewport.height
    const ctx = canvas.getContext('2d')!
    
    for (const object of objects) {
      if (!object.visible) continue
      
      // Get object node and render it
      const node = this.canvasManager.getNode(object.id)
      if (!node) continue
      // For now, skip complex rendering - this method needs major refactor
      // to work with object-based architecture
      continue
      
      // Apply object opacity and blend mode
      ctx.globalAlpha = object.opacity
      ctx.globalCompositeOperation = this.mapBlendMode(object.blendMode)
      
      // TODO: Draw object - needs implementation
    }
    
    return canvas
  }
  
  /**
   * Get layers below a given layer
   */
  private getObjectsBelow(object: import('@/lib/editor/objects/types').CanvasObject): import('@/lib/editor/objects/types').CanvasObject[] {
    const allObjects = this.canvasManager.getAllObjects()
    const index = allObjects.findIndex(obj => obj.id === object.id)
    return allObjects.slice(0, index)
  }
  
  /**
   * Check if a filter type should use WebGL
   */
  private isWebGLFilter(type: string): boolean {
    const webglTypes = [
      'brightness', 'contrast', 'saturation', 'hue',
      'vintage', 'brownie', 'kodachrome', 'technicolor', 'polaroid'
    ]
    return webglTypes.includes(type)
  }
  
  /**
   * Map blend mode to canvas composite operation
   */
  private mapBlendMode(blendMode: string): GlobalCompositeOperation {
    const map: Record<string, GlobalCompositeOperation> = {
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
      'exclusion': 'exclusion'
    }
    return map[blendMode] || 'source-over'
  }
  
  /**
   * Helper methods
   */
  private getLayer(_layerId: string): Layer | undefined {
    // Return undefined since we're moving away from Layer concept
    return undefined
  }
  
  /**
   * Remove a filter from a layer
   */
  async removeFilterFromLayer(
    layerId: string,
    filterId: string,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const layer = this.getLayer(layerId)
    if (!layer || !layer.filterStack) return
    
    const filterIndex = layer.filterStack.filters.findIndex(f => f.id === filterId)
    if (filterIndex === -1) return
    
    const removedFilter = layer.filterStack.filters[filterIndex]
    layer.filterStack.filters.splice(filterIndex, 1)
    layer.filterStack.isDirty = true
    
    // Re-render
    await this.renderLayerWithFilters(layer)
    
    // Emit event
    const event = new FilterRemovedFromLayerEvent(
      layerId,
      filterId,
      removedFilter,
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
  }
  
  /**
   * Update filter stack for a layer
   */
  async updateFilterStack(
    layerId: string,
    filterStack: FilterStack,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const layer = this.getLayer(layerId)
    if (!layer) return
    
    const previousStack = layer.filterStack
    layer.filterStack = { ...filterStack, isDirty: true }
    
    // Re-render
    await this.renderLayerWithFilters(layer)
    
    // Emit event
    const event = new FilterStackUpdatedEvent(
      layerId,
      filterStack,
      previousStack,
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.filterCache.clear()
    this.webglFilterManager.destroy()
  }
} 