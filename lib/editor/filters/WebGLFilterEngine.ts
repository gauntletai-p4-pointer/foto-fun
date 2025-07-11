/**
 * WebGL Filter Engine
 * 
 * High-performance image filtering using WebGL shaders
 * Wraps the WebGLImageFilter library with a clean, type-safe API
 */

import type { Filter } from '../canvas/types'

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
}

export interface FilterChain {
  id: string
  filters: Filter[]
  cached?: boolean
}

/**
 * Singleton WebGL Filter Engine
 * Manages WebGL context and provides high-performance filtering
 */
export class WebGLFilterEngine {
  private static instance: WebGLFilterEngine
  private filterInstance: WebGLImageFilterInstance | null = null
  private canvas: HTMLCanvasElement
  private isInitialized = false
  
  private constructor(config?: WebGLFilterConfig) {
    this.canvas = config?.canvas || document.createElement('canvas')
  }
  
  static getInstance(config?: WebGLFilterConfig): WebGLFilterEngine {
    if (!WebGLFilterEngine.instance) {
      WebGLFilterEngine.instance = new WebGLFilterEngine(config)
    }
    return WebGLFilterEngine.instance
  }
  
  /**
   * Initialize the WebGL filter system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      // Dynamically load WebGLImageFilter if not already loaded
      if (!window.WebGLImageFilter) {
        await this.loadWebGLImageFilter()
      }
      
      this.filterInstance = new window.WebGLImageFilter()
      this.isInitialized = true
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
    filter: Filter
  ): Promise<HTMLCanvasElement> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    if (!this.filterInstance) {
      throw new Error('WebGL filter not initialized')
    }
    
    // Reset filter chain
    this.filterInstance.reset()
    
    // Add filter based on type
    this.addFilterToChain(this.filterInstance, filter)
    
    // Apply and return result
    return this.filterInstance.apply(source)
  }
  
  /**
   * Apply multiple filters in a chain
   */
  async applyFilterChain(
    source: HTMLImageElement | HTMLCanvasElement,
    filters: Filter[]
  ): Promise<HTMLCanvasElement> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    if (!this.filterInstance) {
      throw new Error('WebGL filter not initialized')
    }
    
    // Reset filter chain
    this.filterInstance.reset()
    
    // Add all filters to chain
    for (const filter of filters) {
      this.addFilterToChain(this.filterInstance, filter)
    }
    
    // Apply and return result
    return this.filterInstance.apply(source)
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
        
      case 'sharpen':
        const sharpenAmount = filter.params.amount
        instance.addFilter('sharpen', typeof sharpenAmount === 'number' ? sharpenAmount : 1)
        break
        
      // Vintage effects
      case 'custom':
        if (filter.params.effect === 'brownie') {
          instance.addFilter('brownie')
        } else if (filter.params.effect === 'vintage') {
          instance.addFilter('vintagePinhole')
        } else if (filter.params.effect === 'kodachrome') {
          instance.addFilter('kodachrome')
        } else if (filter.params.effect === 'technicolor') {
          instance.addFilter('technicolor')
        } else if (filter.params.effect === 'polaroid') {
          instance.addFilter('polaroid')
        }
        break
        
      default:
        console.warn(`[WebGLFilterEngine] Unsupported filter type: ${filter.type}`)
    }
  }
  
  /**
   * Create a custom filter using raw shader code
   */
  async createCustomFilter(
    _vertexShader: string,
    _fragmentShader: string
  ): Promise<(source: HTMLImageElement | HTMLCanvasElement) => HTMLCanvasElement> {
    // This would require extending WebGLImageFilter
    // For now, we'll use the built-in filters
    throw new Error('Custom shaders not yet implemented')
  }
  
  /**
   * Get available filters and their parameters
   */
  getAvailableFilters(): Record<string, { params: string[]; description: string }> {
    return {
      brightness: { params: ['amount'], description: 'Adjust brightness (-1 to 1)' },
      contrast: { params: ['amount'], description: 'Adjust contrast (-1 to 1)' },
      saturation: { params: ['amount'], description: 'Adjust saturation (-1 to 1)' },
      hue: { params: ['rotation'], description: 'Rotate hue (0-360 degrees)' },
      grayscale: { params: [], description: 'Convert to grayscale' },
      invert: { params: [], description: 'Invert colors' },
      blur: { params: ['radius'], description: 'Apply gaussian blur' },
      sharpen: { params: ['amount'], description: 'Sharpen image' },
      detectEdges: { params: [], description: 'Detect edges' },
      sobelX: { params: [], description: 'Horizontal edge detection' },
      sobelY: { params: [], description: 'Vertical edge detection' },
      brownie: { params: [], description: 'Vintage brownie effect' },
      vintage: { params: [], description: 'Vintage pinhole effect' },
      kodachrome: { params: [], description: 'Kodachrome film effect' },
      technicolor: { params: [], description: 'Technicolor film effect' },
      polaroid: { params: [], description: 'Polaroid camera effect' }
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.filterInstance) {
      this.filterInstance.destroy()
      this.filterInstance = null
    }
    this.isInitialized = false
  }
} 