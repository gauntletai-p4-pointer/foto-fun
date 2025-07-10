/**
 * WebGL Filter Manager
 * Manages WebGLImageFilter instance and provides filter processing
 */

import type Konva from 'konva'
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ResourceManager } from '@/lib/core/ResourceManager'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { FilterAppliedEvent } from '@/lib/events/canvas/ToolEvents'

// WebGLImageFilter doesn't have types, so we'll define them
interface WebGLImageFilterInstance {
  addFilter(name: string, ...args: any[]): WebGLImageFilterInstance
  reset(): WebGLImageFilterInstance
  apply(image: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement
  destroy(): void
}

declare global {
  interface Window {
    WebGLImageFilter: new () => WebGLImageFilterInstance
  }
}

export class WebGLFilterManager {
  private webglFilter: WebGLImageFilterInstance | null = null
  private isInitialized = false
  
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private resourceManager: ResourceManager
  ) {}
  
  /**
   * Initialize the WebGL filter system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      // Load WebGLImageFilter library if not already loaded
      if (!window.WebGLImageFilter) {
        await this.loadWebGLImageFilter()
      }
      
      // Create WebGL filter instance
      this.webglFilter = new window.WebGLImageFilter()
      this.isInitialized = true
      
      // Register cleanup
      this.resourceManager.registerCleanup('webgl-filter', () => {
        this.destroy()
      })
      
    } catch (error) {
      console.error('[WebGLFilterManager] Failed to initialize:', error)
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
   * Apply a filter to a Konva image
   */
  async applyFilter(
    imageNode: Konva.Image,
    filterType: string,
    params: Record<string, any>,
    executionContext?: ExecutionContext
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    if (!this.webglFilter) {
      throw new Error('WebGL filter not initialized')
    }
    
    // Extract image from Konva node
    const image = imageNode.image() as HTMLImageElement | HTMLCanvasElement
    if (!image) {
      throw new Error('No image found in Konva node')
    }
    
    // Process with WebGL
    const filtered = await this.processWithWebGL(image, filterType, params)
    
    // Update Konva image
    imageNode.image(filtered)
    imageNode.cache() // Clear any existing Konva filters
    
    // Store filter metadata on the node
    const nodeAttrs = imageNode.getAttrs()
    if (!nodeAttrs.metadata) nodeAttrs.metadata = {}
    if (!nodeAttrs.metadata.filters) nodeAttrs.metadata.filters = {}
    nodeAttrs.metadata.filters[filterType] = params
    
    // Don't emit event here - let the tool handle it
    // This prevents double event emission
  }
  
  /**
   * Process an image with WebGL filters
   */
  async processWithWebGL(
    source: HTMLImageElement | HTMLCanvasElement,
    filterType: string,
    params: Record<string, any>
  ): Promise<HTMLCanvasElement> {
    if (!this.webglFilter) {
      throw new Error('WebGL filter not initialized')
    }
    
    // Reset filter chain
    this.webglFilter.reset()
    
    // Add filter based on type
    this.addFilterToChain(this.webglFilter, filterType, params)
    
    // Apply and return result
    return this.webglFilter.apply(source)
  }
  
  /**
   * Add a filter to the WebGL chain
   */
  private addFilterToChain(
    instance: WebGLImageFilterInstance,
    filterType: string,
    params: Record<string, any>
  ): void {
    switch (filterType) {
      case 'brightness':
        instance.addFilter('brightness', params.amount || 0)
        break
        
      case 'contrast':
        instance.addFilter('contrast', params.amount || 0)
        break
        
      case 'saturation':
        instance.addFilter('saturation', params.amount || 0)
        break
        
      case 'hue':
        instance.addFilter('hue', params.rotation || 0)
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
        instance.addFilter('pixelate', params.size || 8)
        break
        
      case 'emboss':
        instance.addFilter('emboss', params.size || 1)
        break
        
      case 'sharpen':
        instance.addFilter('sharpen', params.amount || 1)
        break
        
      // Vintage effects
      case 'brownie':
        instance.addFilter('brownie')
        break
        
      case 'vintagePinhole':
        instance.addFilter('vintagePinhole')
        break
        
      case 'kodachrome':
        instance.addFilter('kodachrome')
        break
        
      case 'technicolor':
        instance.addFilter('technicolor')
        break
        
      case 'polaroid':
        instance.addFilter('polaroid')
        break
        
      // Edge detection
      case 'detectEdges':
        instance.addFilter('detectEdges')
        break
        
      case 'sobelX':
        instance.addFilter('sobelX')
        break
        
      case 'sobelY':
        instance.addFilter('sobelY')
        break
        
      default:
        console.warn(`[WebGLFilterManager] Unsupported filter type: ${filterType}`)
    }
  }
  
  /**
   * Check if WebGL is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    } catch {
      return false
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.webglFilter) {
      this.webglFilter.destroy()
      this.webglFilter = null
    }
    this.isInitialized = false
  }
} 