/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { BaseTool } from '../base/BaseTool'
import { FilterPipeline } from '@/lib/editor/filters/FilterPipeline'
import { LayerAwareSelectionManager } from '@/lib/editor/selection/LayerAwareSelectionManager'
import { ApplyFilterCommand } from '@/lib/editor/commands/filters/ApplyFilterCommand'
import { useCanvasStore } from '@/store/canvasStore'
import { useFilterStore } from '@/store/filterStore'
import type { Canvas, FabricImage } from 'fabric'

/**
 * Base class for all filter tools
 * Provides common functionality for applying filters to selections or entire images
 */
export abstract class BaseFilterTool extends BaseTool {
  protected filterPipeline: FilterPipeline | null = null
  protected selectionManager: LayerAwareSelectionManager | null = null
  
  // Preview state management
  protected isPreviewMode: boolean = false
  protected originalFilterStates: Map<string, any[]> = new Map()
  
  /**
   * Get the filter name - override in subclasses
   */
  protected abstract getFilterName(): string
  
  /**
   * Get default parameters - override in subclasses
   */
  protected abstract getDefaultParams(): any
  
  /**
   * Get current filter value from the image
   */
  protected getCurrentFilterValue(): any {
    console.log('[BaseFilterTool] getCurrentFilterValue called')
    
    if (!this.canvas) {
      console.warn('[BaseFilterTool] No canvas available')
      return this.getDefaultParams()
    }
    
    const targetImages = this.getTargetImages()
    if (targetImages.length === 0) {
      return this.getDefaultParams()
    }
    
    const filterName = this.getFilterName()
    const firstImage = targetImages[0]
    
    if (!firstImage.filters || firstImage.filters.length === 0) {
      return this.getDefaultParams()
    }
    
    // Find existing filter of the current type
    for (const filter of firstImage.filters) {
      const filterType = filter.type || filter.constructor.name
      
      // For hue filter
      if (filterName === 'hue') {
        if (filterType === 'HueRotation' || (filter as any)._isHueRotation) {
          // Convert radians back to degrees
          const rotation = (filter as any).rotation || 0
          return { rotation: Math.round((rotation * 180) / Math.PI) }
        }
      }
      
      // For other filters
      const filterTypeMap: Record<string, { type: string, param: string }> = {
        'brightness': { type: 'Brightness', param: 'brightness' },
        'contrast': { type: 'Contrast', param: 'contrast' },
        'saturation': { type: 'Saturation', param: 'saturation' },
        'blur': { type: 'Blur', param: 'blur' },
      }
      
      // Check for color temperature filter (ColorMatrix with specific properties)
      if (filterName === 'colortemperature') {
        if (filterType === 'ColorMatrix' && (filter as any).matrix) {
          // Extract temperature from the matrix
          // The red channel adjustment is at index 0: 1 + tempAdjust * 0.2
          const redAdjust = (filter as any).matrix[0] - 1
          const temperature = Math.round((redAdjust / 0.2) * 100)
          return { temperature }
        }
      }
      
      if (filterTypeMap[filterName] && filterType === filterTypeMap[filterName].type) {
        const paramName = filterTypeMap[filterName].param
        const filterValue = (filter as any)[paramName]
        console.log(`[BaseFilterTool] Found ${filterName} filter with ${paramName}:`, filterValue)
        
        // For contrast, convert from fabric.js value (-1 to 1) back to percentage (-100 to 100)
        if (filterName === 'contrast' && filterValue !== undefined) {
          const adjustmentPercentage = filterValue * 100
          console.log('[BaseFilterTool] Converting contrast value to percentage:', adjustmentPercentage)
          return { adjustment: adjustmentPercentage }
        }
        
        // For brightness, also return adjustment property
        if (filterName === 'brightness' && filterValue !== undefined) {
          const adjustmentPercentage = filterValue * 100
          return { adjustment: adjustmentPercentage }
        }
        
        // For saturation, also return adjustment property
        if (filterName === 'saturation' && filterValue !== undefined) {
          const adjustmentPercentage = filterValue * 100
          return { adjustment: adjustmentPercentage }
        }
        
        return { [paramName]: filterValue || this.getDefaultParams()[paramName] }
      }
    }
    
    return this.getDefaultParams()
  }
  
  /**
   * Tool setup - common initialization
   */
  protected setupTool(canvas: Canvas): void {
    console.log('[BaseFilterTool] setupTool called')
    
    const canvasStore = useCanvasStore.getState()
    this.selectionManager = canvasStore.selectionManager
    
    // Create filter pipeline if we have selection manager
    if (this.selectionManager) {
      this.filterPipeline = new FilterPipeline(canvas, this.selectionManager)
      console.log('[BaseFilterTool] FilterPipeline created')
    } else {
      console.warn('[BaseFilterTool] No selection manager available')
    }
    
    // Call tool-specific setup
    this.setupFilterTool(canvas)
    
    // Update filter state on activation
    this.updateFilterState()
  }
  
  /**
   * Tool-specific setup - override in subclasses
   */
  protected abstract setupFilterTool(canvas: Canvas): void
  
  /**
   * Save original filter states for preview mode
   */
  protected saveOriginalState(): void {
    console.log('[BaseFilterTool] saveOriginalState called')
    
    if (!this.canvas) {
      console.warn('[BaseFilterTool] No canvas available for saving state')
      return
    }
    
    const targetImages = this.getTargetImages()
    console.log('[BaseFilterTool] Saving state for', targetImages.length, 'images')
    
    this.originalFilterStates.clear()
    
    const filterName = this.getFilterName()
    console.log('[BaseFilterTool] Current filter type:', filterName)
    
    targetImages.forEach((img, index) => {
      // Remove any existing filters of the current type before saving
      if (img.filters) {
        const filtersWithoutCurrentType = img.filters.filter(filter => {
          // Check filter type - handle different filter identification methods
          const filterType = filter.type || filter.constructor.name
          
          // For hue filter, check both HueRotation and _isHueRotation flag
          if (filterName === 'hue') {
            return filterType !== 'HueRotation' && !(filter as any)._isHueRotation
          }
          
          // For other filters, match by type name
          const filterTypeMap: Record<string, string> = {
            'brightness': 'Brightness',
            'contrast': 'Contrast',
            'saturation': 'Saturation',
            'blur': 'Blur',
            'grayscale': 'Grayscale',
            'sepia': 'Sepia',
            'invert': 'Invert',
            'sharpen': 'Convolute'
          }
          
          // For color temperature, check for ColorMatrix type
          if (filterName === 'colortemperature') {
            // Remove ColorMatrix filters that are used for color temperature
            // We identify them by checking if they have the specific matrix pattern
            if (filterType === 'ColorMatrix' && (filter as any).matrix) {
              const matrix = (filter as any).matrix
              // Check if this is a color temperature matrix (red and blue channels adjusted oppositely)
              const redAdjust = matrix[0] - 1
              const blueAdjust = 1 - matrix[10]
              // If both adjustments are roughly equal (within tolerance), it's likely a color temp filter
              return Math.abs(redAdjust - blueAdjust) < 0.01 // Return false to remove color temp filters
            }
            return true // Keep non-ColorMatrix filters
          }
          
          return filterType !== filterTypeMap[filterName]
        })
        
        // Apply the filtered list
        img.filters = filtersWithoutCurrentType
        img.applyFilters()
      }
      
      // Now save the cleaned state
      const filters = img.filters ? [...img.filters] : []
      const imgId = img.get('id') as string || img.toString()
      this.originalFilterStates.set(imgId, filters)
      console.log(`[BaseFilterTool] Saved state for image ${index}:`, imgId, 'filters:', filters.length)
    })
    
    // Render to show the cleaned state
    this.canvas.renderAll()
  }
  
  /**
   * Restore original filter states (for cancel/reset)
   */
  protected restoreOriginalState(): void {
    console.log('[BaseFilterTool] restoreOriginalState called')
    console.log('[BaseFilterTool] Has saved states:', this.originalFilterStates.size)
    
    if (!this.canvas || this.originalFilterStates.size === 0) {
      console.warn('[BaseFilterTool] No canvas or saved states to restore')
      return
    }
    
    const targetImages = this.getTargetImages()
    console.log('[BaseFilterTool] Restoring state for', targetImages.length, 'images')
    
    targetImages.forEach((img, index) => {
      const imgId = img.get('id') as string || img.toString()
      const originalFilters = this.originalFilterStates.get(imgId)
      
      if (originalFilters) {
        console.log(`[BaseFilterTool] Restoring image ${index}:`, imgId, 'to', originalFilters.length, 'filters')
        img.filters = [...originalFilters]
        img.applyFilters()
      } else {
        console.warn(`[BaseFilterTool] No saved state for image ${index}:`, imgId)
      }
    })
    
    this.canvas.renderAll()
    this.originalFilterStates.clear()
    console.log('[BaseFilterTool] State restoration complete')
  }
  
  /**
   * Apply filter in preview mode (temporary, no command)
   */
  protected async applyFilterPreview(filterParams?: any): Promise<void> {
    console.log('[BaseFilterTool] applyFilterPreview called with params:', filterParams)
    console.log('[BaseFilterTool] Current preview mode:', this.isPreviewMode)
    
    if (!this.canvas || !this.filterPipeline) {
      console.error('[BaseFilterTool] No canvas or filter pipeline available')
      return
    }
    
    const params = filterParams || this.getDefaultParams()
    const filterName = this.getFilterName()
    
    // Save state on first preview
    if (!this.isPreviewMode) {
      console.log('[BaseFilterTool] First preview, saving original state')
      this.saveOriginalState()
      this.isPreviewMode = true
    }
    
    // Apply filter directly without command
    console.log('[BaseFilterTool] Applying preview filter:', filterName, 'with params:', params)
    await this.filterPipeline.applyFilter(filterName, params)
    console.log('[BaseFilterTool] Preview filter applied')
  }
  
  /**
   * Apply filter with command (permanent)
   */
  protected async applyFilter(filterParams?: any): Promise<void> {
    console.log('[BaseFilterTool] applyFilter called with params:', filterParams)
    
    if (!this.canvas || !this.filterPipeline || !this.selectionManager) {
      console.error('[BaseFilterTool] Filter tool not properly initialized')
      return
    }
    
    const params = filterParams || this.getDefaultParams()
    const filterName = this.getFilterName()
    
    // Exit preview mode
    console.log('[BaseFilterTool] Exiting preview mode')
    this.isPreviewMode = false
    this.originalFilterStates.clear()
    
    // Check if we have a selection
    const hasSelection = this.hasActiveSelection()
    const selectionInfo = hasSelection ? ' to selection' : ''
    console.log('[BaseFilterTool] Has selection:', hasSelection)
    
    // Create and execute filter command
    const command = new ApplyFilterCommand(
      this.canvas,
      this.filterPipeline,
      this.selectionManager,
      filterName,
      params,
      undefined, // Let command find target images
      `Apply ${filterName}${selectionInfo}`
    )
    
    try {
      console.log('[BaseFilterTool] Executing filter command')
      // Execute with history tracking
      await this.executeCommand(command)
      console.log('[BaseFilterTool] Filter command executed successfully')
      
      // Update filter state in store
      this.updateFilterState()
    } catch (error) {
      console.error(`[BaseFilterTool] Failed to apply ${filterName} filter:`, error)
    }
  }
  
  /**
   * Reset filter to default state
   */
  protected resetFilter(): void {
    console.log('[BaseFilterTool] resetFilter called')
    console.log('[BaseFilterTool] Is in preview mode:', this.isPreviewMode)
    
    if (this.isPreviewMode) {
      this.restoreOriginalState()
    }
  }
  
  /**
   * Check if there's an active selection
   */
  protected hasActiveSelection(): boolean {
    return this.selectionManager?.hasSelection() || false
  }
  
  /**
   * Show selection indicator in UI
   */
  protected showSelectionIndicator(): void {
    // This can be used to update UI to show if selection is active
    const hasSelection = this.hasActiveSelection()
    console.log(`[BaseFilterTool] Filter will apply to: ${hasSelection ? 'selection' : 'entire image'}`)
  }
  
  /**
   * Tool cleanup - common cleanup
   */
  protected cleanupTool(): void {
    console.log('[BaseFilterTool] cleanupTool called')
    console.log('[BaseFilterTool] Preview mode before cleanup:', this.isPreviewMode)
    
    // Reset preview state if active
    if (this.isPreviewMode) {
      console.log('[BaseFilterTool] Cleaning up preview state')
      this.restoreOriginalState()
      this.isPreviewMode = false
    }
    
    // Clear references
    this.filterPipeline = null
    this.selectionManager = null
    this.originalFilterStates.clear()
    
    console.log('[BaseFilterTool] Cleanup complete')
    
    // Call tool-specific cleanup
    this.cleanupFilterTool()
  }
  
  /**
   * Tool-specific cleanup - override in subclasses if needed
   */
  protected cleanupFilterTool(): void {
    // Override in subclasses if needed
  }
  
  /**
   * Update the filter store with the current filter state
   */
  protected updateFilterState(): void {
    const filterStore = useFilterStore.getState()
    const hasFilter = this.hasFilterApplied()
    filterStore.setFilterActive(this.id, hasFilter)
  }
  
  /**
   * Check if this filter is currently applied
   */
  protected hasFilterApplied(): boolean {
    const targetImages = this.getTargetImages()
    if (targetImages.length === 0) return false
    
    const filterName = this.getFilterName()
    const firstImage = targetImages[0] as FabricImage
    if (!firstImage.filters || firstImage.filters.length === 0) return false
    
    // Check for the specific filter type
    return firstImage.filters.some((filter: any) => {
      const filterType = filter.type || filter.constructor.name
      
      // Map filter names to Fabric filter types
      const filterTypeMap: Record<string, string> = {
        'grayscale': 'Grayscale',
        'sepia': 'Sepia',
        'invert': 'Invert',
        'blur': 'Blur',
        'sharpen': 'Convolute',
        'brightness': 'Brightness',
        'contrast': 'Contrast',
        'saturation': 'Saturation',
        'hue': 'HueRotation'
      }
      
      return filterType === filterTypeMap[filterName]
    })
  }
} 