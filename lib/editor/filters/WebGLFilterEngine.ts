/**
 * WebGL Filter Engine
 * 
 * High-performance image filtering using WebGL shaders
 * Wraps the WebGLImageFilter library with a clean, type-safe API
 */

import type { Filter } from '../canvas/types'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { ResourceManager } from '@/lib/core/ResourceManager'

// WebGLImageFilter doesn't have types, so we'll define them
interface WebGLImageFilterInstance {
  addFilter(name: string, ...args: (string | number)[]): WebGLImageFilterInstance
  reset(): WebGLImageFilterInstance
  apply(image: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement
  destroy(): void
}

declare global {
  interface Window {
    WebGLImageFilter: new () => WebGLImageFilterInstance
  }
}

export interface WebGLFilterConfig {
  canvas?: HTMLCanvasElement
  preserveDrawingBuffer?: boolean
  premultiplyAlpha?: boolean
  optimization?: boolean
  caching?: boolean
  maxCacheSize?: number
}

export interface FilterChain {
  id: string
  filters: Filter[]
  cached?: boolean
}

/**
 * WebGL Filter Engine
 * Manages WebGL context and provides high-performance filtering
 */
export class WebGLFilterEngine {
  private filterInstance: WebGLImageFilterInstance | null = null
  private canvas: HTMLCanvasElement
  private isInitialized = false
  private disposed = false
  private filterCache = new Map<string, HTMLCanvasElement>()
  
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private resourceManager: ResourceManager,
    private config: WebGLFilterConfig = {}
  ) {
    this.canvas = config.canvas || document.createElement('canvas')
    this.initialize()
  }
  
  private initialize(): void {
    this.setupEventHandlers()
    this.setupResourceManagement()
  }
  
  private setupEventHandlers(): void {
    // Listen for filter events
    this.typedEventBus.on('layer.filter.added', (event) => {
      if (this.config.optimization) {
        console.log(`[WebGLFilterEngine] Filter added: ${event.layerId}`)
      }
    })
    
    this.typedEventBus.on('layer.filter.removed', (event) => {
      // Clear cache for this layer
      this.clearLayerCache(event.layerId)
    })
  }
  
  private setupResourceManagement(): void {
    // Register with resource manager for cleanup
    this.resourceManager.register('WebGLFilterEngine', this)
  }
  
  private clearLayerCache(layerId: string): void {
    if (!this.config.caching) return
    
    // Remove cached results for this layer
    const keysToDelete: string[] = []
    this.filterCache.forEach((_, key) => {
      if (key.startsWith(`${layerId}:`)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.filterCache.delete(key))
  }
  
  /**
   * Initialize the WebGL filter system
   */
  async initializeWebGL(): Promise<void> {
    if (this.disposed) {
      throw new Error('WebGLFilterEngine has been disposed')
    }
    
    if (this.isInitialized) return
    
    try {
      // Dynamically load WebGLImageFilter if not already loaded
      if (!window.WebGLImageFilter) {
        await this.loadWebGLImageFilter()
      }
      
      this.filterInstance = new window.WebGLImageFilter()
      this.isInitialized = true
      
      // Emit initialization event
      this.typedEventBus.emit('layer.filter.stack.updated', {
        layerId: 'system',
        filterStack: 'WebGL initialized'
      })
      
    } catch (error) {
      console.error('[WebGLFilterEngine] Failed to initialize:', error)
      throw new Error('WebGL not supported or filter library failed to load')
    }
  }
  
  /**
   * Load WebGLImageFilter library dynamically
   */
  private async loadWebGLImageFilter(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/gh/phoboslab/WebGLImageFilter@master/webgl-image-filter.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load WebGLImageFilter'))
      document.head.appendChild(script)
    })
  }
  
  /**
   * Apply a single filter to an image
   */
  async applyFilter(
    source: HTMLImageElement | HTMLCanvasElement,
    filter: Filter,
    layerId?: string
  ): Promise<HTMLCanvasElement> {
    if (this.disposed) {
      throw new Error('WebGLFilterEngine has been disposed')
    }
    
    if (!this.isInitialized) {
      await this.initializeWebGL()
    }
    
    if (!this.filterInstance) {
      throw new Error('WebGL filter not initialized')
    }
    
    // Check cache if enabled
    if (this.config.caching && layerId) {
      const cacheKey = `${layerId}:${filter.type}:${JSON.stringify(filter.params)}`
      const cached = this.filterCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }
    
    // Reset filter chain
    this.filterInstance.reset()
    
    // Add filter based on type
    this.addFilterToChain(this.filterInstance, filter)
    
    // Apply and get result
    const result = this.filterInstance.apply(source)
    
    // Cache result if enabled
    if (this.config.caching && layerId) {
      const cacheKey = `${layerId}:${filter.type}:${JSON.stringify(filter.params)}`
      this.filterCache.set(cacheKey, result)
      
      // Limit cache size
      if (this.config.maxCacheSize && this.filterCache.size > this.config.maxCacheSize) {
              const firstKey = this.filterCache.keys().next().value
      if (firstKey) {
        this.filterCache.delete(firstKey)
      }
      }
    }
    
    // Emit filter applied event
    if (layerId) {
      this.typedEventBus.emit('layer.filter.added', {
        layerId,
        filter,
        position: 0
      })
    }
    
    return result
  }
  
  /**
   * Apply multiple filters in a chain
   */
  async applyFilterChain(
    source: HTMLImageElement | HTMLCanvasElement,
    filters: Filter[],
    layerId?: string
  ): Promise<HTMLCanvasElement> {
    if (this.disposed) {
      throw new Error('WebGLFilterEngine has been disposed')
    }
    
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    if (!this.filterInstance) {
      throw new Error('WebGL filter not initialized')
    }
    
    // Check cache for entire chain if enabled
    if (this.config.caching && layerId) {
      const cacheKey = `${layerId}:chain:${JSON.stringify(filters)}`
      const cached = this.filterCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }
    
    // Reset filter chain
    this.filterInstance.reset()
    
    // Add all filters to chain
    for (const filter of filters) {
      this.addFilterToChain(this.filterInstance, filter)
    }
    
    // Apply and get result
    const result = this.filterInstance.apply(source)
    
    // Cache result if enabled
    if (this.config.caching && layerId) {
      const cacheKey = `${layerId}:chain:${JSON.stringify(filters)}`
      this.filterCache.set(cacheKey, result)
    }
    
    // Emit filter stack updated event
    if (layerId) {
      this.typedEventBus.emit('layer.filter.stack.updated', {
        layerId,
        filterStack: filters
      })
    }
    
    return result
  }
  
  /**
   * Add a filter to the WebGL chain
   */
  private addFilterToChain(instance: WebGLImageFilterInstance, filter: Filter): void {
    switch (filter.type) {
      case 'brightness':
        // WebGLImageFilter expects amount where 1 = 2x brightness, -1 = half brightness
        const brightnessValue = filter.params.value
        const brightnessAmount = (typeof brightnessValue === 'number' ? brightnessValue : 0) / 100
        instance.addFilter('brightness', brightnessAmount)
        break
        
      case 'contrast':
        // Similar scaling for contrast
        const contrastValue = filter.params.value
        const contrastAmount = (typeof contrastValue === 'number' ? contrastValue : 0) / 100
        instance.addFilter('contrast', contrastAmount)
        break
        
      case 'saturation':
        // Saturation: 1 = 2x saturation, -1 = desaturated
        const saturationValue = filter.params.value
        const saturationAmount = (typeof saturationValue === 'number' ? saturationValue : 0) / 100
        instance.addFilter('saturation', saturationAmount)
        break
        
      case 'hue':
        // Hue rotation in degrees (0-360)
        const hueValue = filter.params.value
        instance.addFilter('hue', typeof hueValue === 'number' ? hueValue : 0)
        break
        
      case 'blur':
        // Note: WebGLImageFilter doesn't have gaussian blur
        // We'll need to implement this separately or use Konva's blur
        console.warn('[WebGLFilterEngine] Blur not supported in WebGL mode')
        break
        
      case 'grayscale':
        instance.addFilter('desaturateLuminance')
        break
        
      case 'sepia':
        instance.addFilter('sepia')
        break
        
      case 'invert':
        instance.addFilter('negative')
        break
        
      case 'pixelate':
        const pixelateSize = filter.params.size
        instance.addFilter('pixelate', typeof pixelateSize === 'number' ? pixelateSize : 8)
        break
        
      case 'emboss':
        const embossStrength = filter.params.strength
        instance.addFilter('emboss', typeof embossStrength === 'number' ? embossStrength : 1)
        break
        
      default:
        console.warn(`[WebGLFilterEngine] Unsupported filter type: ${filter.type}`)
    }
  }
  
  /**
   * Create a custom filter from shader code
   */
  async createCustomFilter(
    _vertexShader: string,
    _fragmentShader: string
  ): Promise<(source: HTMLImageElement | HTMLCanvasElement) => HTMLCanvasElement> {
    if (this.disposed) {
      throw new Error('WebGLFilterEngine has been disposed')
    }
    
    // Placeholder for custom shader implementation
    throw new Error('Custom filters not yet implemented')
  }
  
  /**
   * Get available filter types
   */
  getAvailableFilters(): Record<string, { params: string[]; description: string }> {
    return {
      brightness: { params: ['value'], description: 'Adjust image brightness' },
      contrast: { params: ['value'], description: 'Adjust image contrast' },
      saturation: { params: ['value'], description: 'Adjust color saturation' },
      hue: { params: ['value'], description: 'Rotate hue' },
      grayscale: { params: [], description: 'Convert to grayscale' },
      sepia: { params: [], description: 'Apply sepia tone' },
      invert: { params: [], description: 'Invert colors' },
      pixelate: { params: ['size'], description: 'Pixelate effect' },
      emboss: { params: ['strength'], description: 'Emboss effect' }
    }
  }
  
  /**
   * Clear all cached results
   */
  clearCache(): void {
    if (this.disposed) return
    this.filterCache.clear()
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; keys: string[] } {
    if (this.disposed) {
      return { size: 0, maxSize: 0, keys: [] }
    }
    
    return {
      size: this.filterCache.size,
      maxSize: this.config.maxCacheSize || 50,
      keys: Array.from(this.filterCache.keys())
    }
  }
  
  /**
   * Check if WebGL is supported
   */
  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    } catch {
      return false
    }
  }
  
  /**
   * Dispose the WebGLFilterEngine and clean up resources
   */
  async dispose(): Promise<void> {
    if (this.disposed) return
    
    if (this.filterInstance) {
      this.filterInstance.destroy()
      this.filterInstance = null
    }
    
    this.clearCache()
    this.isInitialized = false
    this.disposed = true
    
    // Dispose resource from resource manager
    await this.resourceManager.disposeResource('WebGLFilterEngine')
    
    // Remove event listeners
    this.typedEventBus.clear('layer.filter.added')
    this.typedEventBus.clear('layer.filter.removed')
  }
  
  /**
   * Check if the engine has been disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
} 