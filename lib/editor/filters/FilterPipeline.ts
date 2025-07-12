/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Canvas } from 'fabric'
import { FabricImage } from 'fabric'
import type { LayerAwareSelectionManager } from '../selection/LayerAwareSelectionManager'
import { SelectionAwareFilter } from './SelectionAwareFilter'
import type { PixelSelection } from '@/types'

// Import all filter algorithms statically
import { BrightnessFilter } from './algorithms/brightness'
import { ContrastFilter } from './algorithms/contrast'
import { SaturationFilter } from './algorithms/saturation'
import { HueFilter } from './algorithms/hue'
import { GrayscaleFilter } from './algorithms/grayscale'
import { InvertFilter } from './algorithms/invert'
import { SepiaFilter } from './algorithms/sepia'
import { BlurFilter } from './algorithms/blur'
import { SharpenFilter } from './algorithms/sharpen'
import { ColortemperatureFilter } from './algorithms/colortemperature'

export interface FilterPipelineOptions {
  enableCaching?: boolean
  enableWebGL?: boolean
  enableWorkers?: boolean
}

/**
 * FilterPipeline - Orchestrates filter application based on selection state
 * 
 * This class decides whether to use fabric.js filters (when no selection)
 * or custom pixel-level processing (when selection is active).
 */
export class FilterPipeline {
  private canvas: Canvas
  private selectionManager: LayerAwareSelectionManager
  private options: FilterPipelineOptions
  private filterCache: Map<string, ImageData>
  
  constructor(
    canvas: Canvas,
    selectionManager: LayerAwareSelectionManager,
    options: FilterPipelineOptions = {}
  ) {
    this.canvas = canvas
    this.selectionManager = selectionManager
    this.options = {
      enableCaching: true,
      enableWebGL: true,
      enableWorkers: true,
      ...options
    }
    this.filterCache = new Map()
  }
  
  /**
   * Apply filter based on current selection state
   */
  async applyFilter(
    filterName: string,
    filterParams: any,
    targetImages?: FabricImage[]
  ): Promise<void> {
    console.log('[FilterPipeline] applyFilter called:', { filterName, filterParams, targetImagesCount: targetImages?.length })
    
    // Get target images
    const images = targetImages || this.getTargetImages()
    if (images.length === 0) {
      console.warn('No images found to apply filter')
      return
    }
    
    // Check if we have an active selection
    const hasSelection = this.hasActiveSelection()
    console.log('[FilterPipeline] Has active selection:', hasSelection)
    
    if (hasSelection) {
      // Use custom filter pipeline for selection-based filtering
      console.log('[FilterPipeline] Using custom filter pipeline for selection')
      await this.applyWithSelection(filterName, filterParams, images)
    } else {
      // Use fabric.js filters for non-selected filtering
      console.log('[FilterPipeline] Using fabric.js filters (no selection)')
      await this.applyWithFabric(filterName, filterParams, images)
    }
    
    // Render canvas
    this.canvas.renderAll()
  }
  
  /**
   * Apply filter using fabric.js (no selection)
   */
  private async applyWithFabric(
    filterName: string,
    filterParams: any,
    images: FabricImage[]
  ): Promise<void> {
    // Import the appropriate fabric filter
    const fabricFilter = await this.createFabricFilter(filterName, filterParams)
    if (!fabricFilter) {
      throw new Error(`Unsupported fabric filter: ${filterName}`)
    }
    
    // Apply to each image
    for (const image of images) {
      if (!image.filters) {
        image.filters = []
      }
      
      // Always remove existing filters of the same type first
      // This ensures that when a filter value is set to 0 (like blur radius = 0)
      // the existing filter is properly removed
      image.filters = image.filters.filter((f: any) => {
        return f.constructor.name !== fabricFilter.constructor.name
      })
      
      // Add new filter if params indicate it should be applied
      if (this.shouldApplyFilter(filterName, filterParams)) {
        image.filters.push(fabricFilter)
      }
      
      // Apply filters
      image.applyFilters()
    }
  }
  
  /**
   * Apply filter using custom selection-aware pipeline
   */
  private async applyWithSelection(
    filterName: string,
    filterParams: any,
    images: FabricImage[]
  ): Promise<void> {
    console.log('[FilterPipeline] applyWithSelection:', { filterName, filterParams })
    
    // Get selection
    const selection = this.getActiveSelection()
    if (!selection) {
      console.log('[FilterPipeline] No selection found, falling back to fabric.js')
      // Fallback to fabric.js if no selection found
      return this.applyWithFabric(filterName, filterParams, images)
    }
    
    console.log('[FilterPipeline] Selection found:', { bounds: selection.bounds })
    
    // Create custom filter
    const customFilter = await this.createCustomFilter(filterName)
    if (!customFilter) {
      console.error(`[FilterPipeline] Failed to create custom filter: ${filterName}`)
      throw new Error(`Unsupported custom filter: ${filterName}`)
    }
    
    console.log('[FilterPipeline] Custom filter created successfully')
    
    // Apply to each image
    for (const image of images) {
      console.log('[FilterPipeline] Applying filter to image')
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(image, filterName, filterParams, selection)
      
      // Check cache
      let filteredData: ImageData
      if (this.options.enableCaching && this.filterCache.has(cacheKey)) {
        console.log('[FilterPipeline] Using cached filter result')
        filteredData = this.filterCache.get(cacheKey)!
      } else {
        console.log('[FilterPipeline] Applying filter (not cached)')
        // Apply filter
        filteredData = await customFilter.applyToImage(image, filterParams, selection)
        
        // Cache result
        if (this.options.enableCaching) {
          this.filterCache.set(cacheKey, filteredData)
        }
      }
      
      console.log('[FilterPipeline] Updating image with filtered data')
      // Update the existing image with filtered data
      await this.updateImageWithFilteredData(image, filteredData)
    }
    
    console.log('[FilterPipeline] Filter application complete')
  }
  
  /**
   * Create fabric.js filter instance
   */
  private async createFabricFilter(filterName: string, filterParams: any): Promise<any | null> {
    const { filters } = await import('fabric')
    
    switch (filterName.toLowerCase()) {
      case 'brightness':
        return new filters.Brightness({ brightness: filterParams.adjustment / 100 })
      
      case 'contrast':
        const contrastValue = filterParams.adjustment / 100
        console.log('[FilterPipeline] Creating Contrast filter with value:', contrastValue)
        return new filters.Contrast({ contrast: contrastValue })
      
      case 'saturation':
        return new filters.Saturation({ saturation: filterParams.adjustment / 100 })
      
      case 'hue':
        return new filters.HueRotation({ rotation: (filterParams.rotation * Math.PI) / 180 })
      
      case 'colormatrix':
      case 'colortemperature':
        // Color temperature uses ColorMatrix filter
        if (filterParams.temperature !== undefined) {
          const tempAdjust = filterParams.temperature / 100
          const matrix = [
            1 + tempAdjust * 0.2, 0, 0, 0, 0,    // Red channel
            0, 1, 0, 0, 0,                       // Green channel (unchanged)
            0, 0, 1 - tempAdjust * 0.2, 0, 0,    // Blue channel
            0, 0, 0, 1, 0                        // Alpha channel
          ]
          return new filters.ColorMatrix({ matrix })
        }
        return null
      
      case 'grayscale':
        return new filters.Grayscale()
      
      case 'invert':
        return new filters.Invert()
      
      case 'sepia':
        return new filters.Sepia()
      
      case 'blur':
        return new filters.Blur({ blur: filterParams.radius / 100 })
      
      case 'sharpen':
        // Sharpen uses Convolute filter
        const intensity = 1 + (filterParams.strength / 25)
        return new filters.Convolute({
          matrix: [
            0, -1, 0,
            -1, intensity, -1,
            0, -1, 0
          ],
          opaque: false
        })
      
      default:
        return null
    }
  }
  
  /**
   * Create custom filter instance
   */
  private async createCustomFilter(filterName: string): Promise<SelectionAwareFilter | null> {
    console.log('[FilterPipeline] createCustomFilter:', filterName)
    
    // Use static imports instead of dynamic imports
    // This fixes bundler compatibility issues
    const filterMap: Record<string, new (canvas: Canvas, selectionManager: LayerAwareSelectionManager) => SelectionAwareFilter> = {
      brightness: BrightnessFilter,
      contrast: ContrastFilter,
      saturation: SaturationFilter,
      hue: HueFilter,
      grayscale: GrayscaleFilter,
      invert: InvertFilter,
      sepia: SepiaFilter,
      blur: BlurFilter,
      sharpen: SharpenFilter,
      colortemperature: ColortemperatureFilter,
      colormatrix: ColortemperatureFilter // Alias for color temperature
    }
    
    const FilterClass = filterMap[filterName.toLowerCase()]
    
    if (!FilterClass) {
      console.error(`[FilterPipeline] Filter class not found for: ${filterName}`)
      console.log('[FilterPipeline] Available filters:', Object.keys(filterMap))
      return null
    }
    
    try {
      console.log(`[FilterPipeline] Creating instance of ${FilterClass.name}`)
      const instance = new FilterClass(this.canvas, this.selectionManager)
      console.log('[FilterPipeline] Filter instance created successfully')
      return instance
    } catch (error) {
      console.error(`[FilterPipeline] Failed to instantiate filter ${filterName}:`, error)
      return null
    }
  }
  
  /**
   * Check if filter should be applied based on params
   */
  private shouldApplyFilter(filterName: string, filterParams: any): boolean {
    // Check for explicit removal
    if (filterParams.remove === true) {
      return false
    }
    
    switch (filterName.toLowerCase()) {
      case 'brightness':
      case 'contrast':
      case 'saturation':
      case 'exposure':
        return filterParams.adjustment !== 0
      
      case 'hue':
        return filterParams.rotation !== 0
      
      case 'blur':
        return filterParams.radius > 0
      
      case 'sharpen':
        return filterParams.strength > 0
      
      case 'colortemperature':
      case 'colormatrix':
        return filterParams.temperature !== 0
      
      case 'grayscale':
      case 'invert':
      case 'sepia':
        return true // Toggle filters are applied unless explicitly removed
      
      default:
        return true
    }
  }
  
  /**
   * Get images to apply filter to
   */
  private getTargetImages(): FabricImage[] {
    const objects = this.canvas.getObjects()
    return objects.filter(obj => obj instanceof FabricImage) as FabricImage[]
  }
  
  /**
   * Check if there's an active selection
   */
  private hasActiveSelection(): boolean {
    // Check global selection
    if (this.selectionManager.hasSelection()) {
      return true
    }
    
    // Check object-specific selection if in object mode
    const selectionMode = this.selectionManager.getSelectionMode()
    if (selectionMode === 'object') {
      const activeObjectId = this.selectionManager.getActiveObjectId()
      if (activeObjectId) {
        return this.selectionManager.getObjectSelection(activeObjectId) !== null
      }
    }
    
    return false
  }
  
  /**
   * Get the active selection
   */
  private getActiveSelection(): PixelSelection | null {
    // Check for object-specific selection first
    const selectionMode = this.selectionManager.getSelectionMode()
    if (selectionMode === 'object') {
      const activeObjectId = this.selectionManager.getActiveObjectId()
      if (activeObjectId) {
        const objectSelection = this.selectionManager.getObjectSelection(activeObjectId)
        if (objectSelection) {
          return objectSelection
        }
      }
    }
    
    // Fall back to global selection
    return this.selectionManager.getSelection()
  }
  
  /**
   * Generate cache key for filtered results
   */
  private generateCacheKey(
    image: FabricImage,
    filterName: string,
    filterParams: any,
    selection: PixelSelection
  ): string {
    const imageId = image.get('id') || image.toString()
    const paramStr = JSON.stringify(filterParams)
    const selectionBounds = `${selection.bounds.x},${selection.bounds.y},${selection.bounds.width},${selection.bounds.height}`
    return `${imageId}-${filterName}-${paramStr}-${selectionBounds}`
  }
  
  /**
   * Update existing image with filtered data
   */
  private async updateImageWithFilteredData(
    image: FabricImage,
    filteredData: ImageData
  ): Promise<void> {
    // Create a temporary canvas with the filtered data
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = filteredData.width
    tempCanvas.height = filteredData.height
    const ctx = tempCanvas.getContext('2d')!
    ctx.putImageData(filteredData, 0, 0)
    
    // Convert to blob and create new image element
    await new Promise<void>((resolve, reject) => {
      tempCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from filtered image'))
          return
        }
        
        const url = URL.createObjectURL(blob)
        const img = new Image()
        
        img.onload = () => {
          // Update the existing fabric image's element
          image.setElement(img)
          image.dirty = true
          
          // Clean up
          URL.revokeObjectURL(url)
          resolve()
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load filtered image'))
        }
        
        img.src = url
      })
    })
  }
  
  /**
   * Clear filter cache
   */
  clearCache(): void {
    this.filterCache.clear()
  }
  
  /**
   * Invalidate cache for specific image
   */
  invalidateImageCache(imageId: string): void {
    // Remove all cache entries for this image
    const keysToDelete: string[] = []
    for (const key of this.filterCache.keys()) {
      if (key.startsWith(imageId)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.filterCache.delete(key))
  }
} 