/**
 * ObjectFilterManager - Manages filter application to objects
 * Bridges WebGL and Konva filters with the object-based architecture
 */

import type { Filter } from '@/lib/editor/canvas/types'
import type { CanvasObject, Adjustment } from '@/lib/editor/objects/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { WebGLFilterManager } from './WebGLFilterManager'
import { WebGLFilterEngine } from './WebGLFilterEngine'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ResourceManager } from '@/lib/core/ResourceManager'
import Konva from 'konva'
// import { nanoid } from 'nanoid'

export class ObjectFilterManager {
  private webglFilterManager: WebGLFilterManager
  private webglEngine: WebGLFilterEngine
  private filterCache = new Map<string, HTMLCanvasElement>()
  
  constructor(
    private canvas: CanvasManager,
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private resourceManager: ResourceManager
  ) {
    this.webglFilterManager = new WebGLFilterManager(eventStore, typedEventBus, resourceManager)
    this.webglEngine = WebGLFilterEngine.getInstance()
  }
  
  /**
   * Apply a filter to an object
   */
  async applyFilterToObject(
    objectId: string,
    filter: Filter,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.canvas.getObject(objectId)
    if (!object) return
    
    // Determine engine type
    const engineType = this.getEngineType(filter.type)
    
    if (engineType === 'webgl') {
      await this.applyWebGLFilter(object, filter, executionContext)
    } else {
      await this.applyKonvaFilter(object, filter, executionContext)
    }
  }
  
  /**
   * Apply an adjustment to an object
   */
  async applyAdjustmentToObject(
    objectId: string,
    adjustment: Adjustment,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.canvas.getObject(objectId)
    if (!object || object.type !== 'image') return
    
    // Add or update adjustment in object's adjustments array
    const adjustments = [...object.adjustments]
    const existingIndex = adjustments.findIndex(adj => adj.type === adjustment.type)
    
    if (existingIndex >= 0) {
      adjustments[existingIndex] = adjustment
    } else {
      adjustments.push(adjustment)
    }
    
    // Update object
    await this.canvas.updateObject(objectId, { adjustments })
    
    // Apply all adjustments and filters
    await this.renderObjectWithEffects(object, executionContext)
  }
  
  /**
   * Remove a filter from an object
   */
  async removeFilterFromObject(
    objectId: string,
    filterId: string,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.canvas.getObject(objectId)
    if (!object) return
    
    const filters = object.filters.filter(f => (f as any).id !== filterId)
    await this.canvas.updateObject(objectId, { filters })
    
    // Re-render with remaining filters
    await this.renderObjectWithEffects(object, executionContext)
  }
  
  /**
   * Remove an adjustment from an object
   */
  async removeAdjustmentFromObject(
    objectId: string,
    adjustmentId: string,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.canvas.getObject(objectId)
    if (!object) return
    
    const adjustments = object.adjustments.filter(a => a.id !== adjustmentId)
    await this.canvas.updateObject(objectId, { adjustments })
    
    // Re-render with remaining adjustments
    await this.renderObjectWithEffects(object, executionContext)
  }
  
  /**
   * Render an object with all its effects applied
   */
  private async renderObjectWithEffects(
    object: CanvasObject,
    _executionContext?: ExecutionContext
  ): Promise<void> {
    if (object.type !== 'image') return
    
    const imageData = object.data as import('@/lib/editor/objects/types').ImageData
    let processedImage = imageData.element
    
    // Apply adjustments first (WebGL)
    if (object.adjustments.length > 0) {
      processedImage = await this.applyAdjustmentsToImage(processedImage, object.adjustments)
    }
    
    // Apply filters (WebGL or Konva)
    if (object.filters.length > 0) {
      processedImage = await this.applyFiltersToImage(processedImage, object.filters)
    }
    
    // Update the object's image element
    await this.canvas.updateObject(object.id, {
      data: {
        ...imageData,
        element: processedImage
      }
    })
    
    // Cache the result
    this.filterCache.set(object.id, processedImage as HTMLCanvasElement)
  }
  
  /**
   * Apply adjustments to an image using WebGL
   */
  private async applyAdjustmentsToImage(
    source: HTMLImageElement | HTMLCanvasElement,
    adjustments: Adjustment[]
  ): Promise<HTMLCanvasElement> {
    // WebglEngine is already initialized in constructor
    await this.webglEngine.initialize()
    
    // Convert adjustments to filters for WebGL processing
    const filters: Filter[] = adjustments
      .filter(adj => adj.enabled)
      .map(adj => ({
        type: adj.type as Filter['type'],
        params: adj.params
      }))
    
    if (filters.length === 0) {
      return source as HTMLCanvasElement
    }
    
    return await this.webglEngine.applyFilterChain(source, filters)
  }
  
  /**
   * Apply filters to an image
   */
  private async applyFiltersToImage(
    source: HTMLImageElement | HTMLCanvasElement,
    filters: Filter[]
  ): Promise<HTMLCanvasElement> {
    let result = source
    
    for (const filter of filters) {
      const engineType = this.getEngineType(filter.type)
      
      if (engineType === 'webgl') {
        result = await this.webglEngine.applyFilter(result, filter)
      } else {
        result = await this.applyKonvaFilterToCanvas(result, filter)
      }
    }
    
    return result as HTMLCanvasElement
  }
  
  /**
   * Apply WebGL filter to an object
   */
  private async applyWebGLFilter(
    object: CanvasObject,
    filter: Filter,
    executionContext?: ExecutionContext
  ): Promise<void> {
    if (object.type !== 'image') {
      throw new Error('WebGL filters only work on image objects')
    }
    
    // Add filter to object
    const filters = [...object.filters, filter]
    await this.canvas.updateObject(object.id, { filters })
    
    // Render with all effects
    await this.renderObjectWithEffects(object, executionContext)
  }
  
  /**
   * Apply Konva filter to an object
   */
  private async applyKonvaFilter(
    object: CanvasObject,
    filter: Filter,
    executionContext?: ExecutionContext
  ): Promise<void> {
    if (object.type !== 'image') {
      throw new Error('Konva filters only work on image objects')
    }
    
    // Add filter to object
    const filters = [...object.filters, filter]
    await this.canvas.updateObject(object.id, { filters })
    
    // Render with all effects
    await this.renderObjectWithEffects(object, executionContext)
  }
  
  /**
   * Apply Konva filter to a canvas
   */
  private async applyKonvaFilterToCanvas(
    source: HTMLImageElement | HTMLCanvasElement,
    filter: Filter
  ): Promise<HTMLCanvasElement> {
    // Create a temporary Konva stage
    const tempDiv = document.createElement('div')
    tempDiv.style.width = `${source.width}px`
    tempDiv.style.height = `${source.height}px`
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    document.body.appendChild(tempDiv)
    
    const stage = new Konva.Stage({
      container: tempDiv,
      width: source.width,
      height: source.height
    })
    
    const layer = new Konva.Layer()
    stage.add(layer)
    
    const image = new Konva.Image({
      image: source,
      x: 0,
      y: 0
    })
    
    layer.add(image)
    
    // Apply Konva filter
    const konvaFilters = []
    
    switch (filter.type) {
      case 'blur':
        konvaFilters.push(Konva.Filters.Blur)
        image.blurRadius(Number(filter.params.radius) || 10)
        break
        
      case 'pixelate':
        konvaFilters.push(Konva.Filters.Pixelate)
        image.pixelSize(Number(filter.params.size) || 8)
        break
        
      default:
        console.warn(`Unsupported Konva filter: ${filter.type}`)
    }
    
    if (konvaFilters.length > 0) {
      image.cache()
      image.filters(konvaFilters)
    }
    
    // Render and get result
    layer.draw()
    
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = source.width
    resultCanvas.height = source.height
    const ctx = resultCanvas.getContext('2d')!
    
    stage.toCanvas({
      callback: (stageCanvas: HTMLCanvasElement) => {
        ctx.drawImage(stageCanvas, 0, 0)
      }
    })
    
    // Cleanup
    stage.destroy()
    document.body.removeChild(tempDiv)
    
    return resultCanvas
  }
  
  /**
   * Determine which engine to use for a filter type
   */
  private getEngineType(filterType: string): 'webgl' | 'konva' {
    const webglFilters = [
      'brightness', 'contrast', 'saturation', 'hue', 'exposure',
      'grayscale', 'sepia', 'invert', 'sharpen',
      'vintage', 'brownie', 'kodachrome', 'technicolor',
      'polaroid', 'detectEdges', 'emboss'
    ]
    
    return webglFilters.includes(filterType) ? 'webgl' : 'konva'
  }
  
  /**
   * Get real-time preview of a filter
   */
  async getFilterPreview(
    objectId: string,
    filter: Filter
  ): Promise<HTMLCanvasElement | null> {
    const object = this.canvas.getObject(objectId)
    if (!object || object.type !== 'image') return null
    
    const imageData = object.data as import('@/lib/editor/objects/types').ImageData
    const engineType = this.getEngineType(filter.type)
    
    if (engineType === 'webgl') {
      return await this.webglEngine.applyFilter(imageData.element, filter)
    } else {
      return await this.applyKonvaFilterToCanvas(imageData.element, filter)
    }
  }
  
  /**
   * Clear filter cache for an object
   */
  clearCache(objectId: string): void {
    this.filterCache.delete(objectId)
  }
  
  /**
   * Clear all filter caches
   */
  clearAllCaches(): void {
    this.filterCache.clear()
  }
  
  /**
   * Initialize the filter system
   */
  async initialize(): Promise<void> {
    await this.webglFilterManager.initialize()
    await this.webglEngine.initialize()
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearAllCaches()
  }
} 