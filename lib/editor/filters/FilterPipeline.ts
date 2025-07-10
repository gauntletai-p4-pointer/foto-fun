/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Canvas } from 'fabric'
import { FabricImage } from 'fabric'
import type { LayerAwareSelectionManager } from '../selection/LayerAwareSelectionManager'
import { SelectionAwareFilter } from './SelectionAwareFilter'
import type { PixelSelection } from '@/types'

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
    // Get target images
    const images = targetImages || this.getTargetImages()
    if (images.length === 0) {
      console.warn('No images found to apply filter')
      return
    }
    
    // Check if we have an active selection
    const hasSelection = this.hasActiveSelection()
    
    if (hasSelection) {
      // Use custom filter pipeline for selection-based filtering
      await this.applyWithSelection(filterName, filterParams, images)
    } else {
      // Use fabric.js filters for non-selected filtering
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
      
      // Remove existing filters of the same type
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
    // Get selection
    const selection = this.getActiveSelection()
    if (!selection) {
      // Fallback to fabric.js if no selection found
      return this.applyWithFabric(filterName, filterParams, images)
    }
    
    // Create custom filter
    const customFilter = await this.createCustomFilter(filterName)
    if (!customFilter) {
      throw new Error(`Unsupported custom filter: ${filterName}`)
    }
    
    // Apply to each image
    for (const image of images) {
      // Generate cache key
      const cacheKey = this.generateCacheKey(image, filterName, filterParams, selection)
      
      // Check cache
      let filteredData: ImageData
      if (this.options.enableCaching && this.filterCache.has(cacheKey)) {
        filteredData = this.filterCache.get(cacheKey)!
      } else {
        // Apply filter
        filteredData = await customFilter.applyToImage(image, filterParams, selection)
        
        // Cache result
        if (this.options.enableCaching) {
          this.filterCache.set(cacheKey, filteredData)
        }
      }
      
      // Update the existing image with filtered data
      await this.updateImageWithFilteredData(image, filteredData)
    }
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
    // Dynamically import the appropriate filter
    try {
      const filterModule = await import(`./algorithms/${filterName.toLowerCase()}`)
      
      // Capitalize first letter for class name
      const className = filterName.charAt(0).toUpperCase() + filterName.slice(1).toLowerCase() + 'Filter'
      const FilterClass = filterModule[className] || filterModule.default
      
      if (!FilterClass) {
        console.warn(`Filter class ${className} not found in module`, filterModule)
        return null
      }
      
      return new FilterClass(this.canvas, this.selectionManager)
    } catch (error) {
      console.warn(`Failed to load custom filter: ${filterName}`, error)
      return null
    }
  }
  
  /**
   * Check if filter should be applied based on params
   */
  private shouldApplyFilter(filterName: string, filterParams: any): boolean {
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
        return true // Toggle filters are always applied when called
      
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