/**
 * Filter Manager Service
 * Coordinates filter operations across layers, selections, and adjustment layers
 * Following the Photoshop-like filtering paradigm
 */

// nanoid import removed - using simplified filter architecture
import type { Filter } from '@/types'
import type { Selection } from '@/lib/editor/canvas/types'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { ResourceManager } from '@/lib/core/ResourceManager'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { FilterAddedToObjectEvent } from '@/lib/events/canvas/ObjectEvents'
import { WebGLFilterManager } from './WebGLFilterManager'
import Konva from 'konva'

export type FilterTarget = 
  | { type: 'object'; objectId: string }
  | { type: 'selection'; objectId: string; selection: Selection }
  | { type: 'adjustment'; adjustmentType: string }

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
      case 'object':
        await this.applyFilterToObject(filter, target.objectId, executionContext)
        break
        
      case 'selection':
        await this.applyFilterToSelection(filter, target.objectId, target.selection, executionContext)
        break
        
      case 'adjustment':
        await this.createAdjustmentObject(filter, target.adjustmentType, executionContext)
        break
    }
  }
  
  /**
   * Apply filter to an entire object (non-destructive)
   */
  private async applyFilterToObject(
    filter: Filter,
    objectId: string,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.getObject(objectId)
    if (!object) return
    
    // Add filter to object's filters array
    object.filters.push(filter)
    
    // Apply the filters to render
    await this.renderObjectWithFilters(object)
    
    // Emit event
    const event = new FilterAddedToObjectEvent(
      objectId,
      filter,
      object.filters.length - 1,
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
    
    // Notify UI
    this.typedEventBus.emit('object.filter.added', {
      objectId,
      filter: filter,
      position: object.filters.length - 1
    })
  }
  
  /**
   * Apply filter to a selection area with masking
   */
  private async applyFilterToSelection(
    filter: Filter,
    objectId: string,
    selection: Selection,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.getObject(objectId)
    if (!object) return
    
    // For now, apply to entire object - selection masking would be more complex
    await this.applyFilterToObject(filter, objectId, executionContext)
  }
  
  /**
   * Create an adjustment object
   */
  private async createAdjustmentObject(
    filter: Filter,
    adjustmentType: string,
    executionContext?: ExecutionContext
  ): Promise<void> {
    // Create an adjustment object
    const adjustmentObjectId = await this.canvasManager.addObject({
      type: 'group',
      name: `${adjustmentType} Adjustment`,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      blendMode: 'normal',
      filters: [filter],
      adjustments: [],
      data: {
        type: 'group',
        children: []
      }
    })
    
    // Emit event if needed
    if (executionContext) {
      const event = new FilterAddedToObjectEvent(
        adjustmentObjectId,
        filter,
        0,
        executionContext.getMetadata()
      )
      await executionContext.emit(event)
    }
  }
  
  /**
   * Render an object with its filters applied
   */
  async renderObjectWithFilters(object: import('@/lib/editor/objects/types').CanvasObject): Promise<void> {
    if (!object.filters || object.filters.length === 0) {
      // No filters, just draw normally
      return
    }
    
    // Get the object's current content as canvas
    const sourceCanvas = await this.getObjectCanvas(object)
    
    // Apply each filter in sequence
    let result = sourceCanvas
    for (const filter of object.filters) {
      result = await this.applyFilterToCanvas(result, filter)
    }
    
    // Apply the filtered result back to the object
    await this.applyFilteredResultToObject(object, result)
  }
  
  /**
   * Remove a filter from an object
   */
  async removeFilterFromObject(
    objectId: string,
    filterIndex: number,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.getObject(objectId)
    if (!object || !object.filters || filterIndex < 0 || filterIndex >= object.filters.length) return
    
    const removedFilter = object.filters[filterIndex]
    object.filters.splice(filterIndex, 1)
    
    // Re-render
    await this.renderObjectWithFilters(object)
    
    // Emit event
    const event = new FilterAddedToObjectEvent(
      objectId,
      removedFilter,
      filterIndex,
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
    }
  }
  
  /**
   * Helper methods
   */
  private getObject(objectId: string): import('@/lib/editor/objects/types').CanvasObject | undefined {
    const object = this.canvasManager.getObject(objectId)
    return object || undefined
  }
  
  private async getObjectCanvas(object: import('@/lib/editor/objects/types').CanvasObject): Promise<HTMLCanvasElement> {
    // Get the object's Konva node and convert to canvas
    const node = this.canvasManager.getNode(object.id)
    if (!node) {
      // Create empty canvas if no node found
      const canvas = document.createElement('canvas')
      canvas.width = object.width
      canvas.height = object.height
      return canvas
    }
    
    // Convert node to canvas
    return node.toCanvas()
  }
  
  private async applyFilterToCanvas(canvas: HTMLCanvasElement, filter: Filter): Promise<HTMLCanvasElement> {
    // Use existing filter application logic
    if (this.isWebGLFilter(filter.type)) {
      // Cast params to expected type for WebGL filters
      const webglParams = filter.params as Record<string, string | number | boolean>
      return await this.webglFilterManager.processWithWebGL(canvas, filter.type, webglParams)
    } else {
      return await this.applyKonvaFilterToCanvas(canvas, filter)
    }
  }
  
  private async applyFilteredResultToObject(object: import('@/lib/editor/objects/types').CanvasObject, result: HTMLCanvasElement): Promise<void> {
    // Update the object's data with the filtered result
    if (object.type === 'image') {
      const imageData = object.data as import('@/lib/editor/objects/types').ImageData
      await this.canvasManager.updateObject(object.id, {
        data: {
          ...imageData,
          element: result
        }
      })
    }
    // For other object types, we would need different handling
    // This is a simplified implementation
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
        
      default:
        // Handle other filter types
        break
    }
    
    imageNode.getLayer()?.batchDraw()
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
   * Cleanup
   */
  destroy(): void {
    this.filterCache.clear()
    this.webglFilterManager.destroy()
  }
} 