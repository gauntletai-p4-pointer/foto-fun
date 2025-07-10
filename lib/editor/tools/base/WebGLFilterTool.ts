import { BaseTool } from './BaseTool'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import type { WebGLFilterManager } from '@/lib/editor/filters/WebGLFilterManager'
import { FilterAppliedEvent, FilterRemovedEvent } from '@/lib/events/canvas/ToolEvents'
import type Konva from 'konva'
import { ServiceContainer } from '@/lib/core/ServiceContainer'

/**
 * Base class for WebGL-powered filter tools
 * Provides common functionality for GPU-accelerated image filters
 */
export abstract class WebGLFilterTool extends BaseTool {
  protected filterManager: WebGLFilterManager | null = null
  protected isApplying = false
  protected lastAppliedParams: Record<string, number | string | boolean> | null = null
  
  // Abstract methods that subclasses must implement
  protected abstract getFilterType(): string
  protected abstract getDefaultParams(): Record<string, number | string | boolean>
  protected abstract convertOptionsToWebGLParams(options: Record<string, unknown>): Record<string, number | string | boolean>
  
  protected setupTool(): void {
    // Get WebGLFilterManager from DI container
    try {
      const container = ServiceContainer.getInstance()
      this.filterManager = container.getSync<WebGLFilterManager>('WebGLFilterManager')
    } catch (error) {
      console.error('[WebGLFilterTool] Failed to get WebGLFilterManager:', error)
      return
    }
    
    // Initialize with default parameters
    const defaultParams = this.getDefaultParams()
    Object.entries(defaultParams).forEach(([key, value]) => {
      this.setOption(key, value)
    })
    
    // Check if selected objects already have this filter
    this.checkExistingFilters()
  }
  
  protected cleanupTool(): void {
    // Reset state but keep filters applied
    this.isApplying = false
    this.lastAppliedParams = null
  }
  
  protected onOptionChange(_key: string, _value: unknown): void {
    // Apply filter when any option changes
    if (!this.isApplying) {
      this.applyFilter()
    }
  }
  
  /**
   * Main filter application method
   */
  protected async applyFilter(): Promise<void> {
    if (this.isApplying || !this.filterManager) return
    
    this.isApplying = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn(`[${this.name}] No images to process`)
        return
      }
      
      // Convert tool options to WebGL parameters
      const webglParams = this.convertOptionsToWebGLParams(this.options)
      
      // Apply to each target
      const processedIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.applyFilterToImage(target, webglParams)
          processedIds.push(target.id)
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && processedIds.length > 0) {
        await this.executionContext.emit(new FilterAppliedEvent(
          'canvas',
          this.getFilterType(),
          webglParams,
          processedIds,
          this.executionContext.getMetadata()
        ))
      }
      
      this.lastAppliedParams = webglParams
      
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Apply filter to a specific image
   */
  private async applyFilterToImage(
    obj: CanvasObject,
    params: Record<string, number | string | boolean>
  ): Promise<void> {
    if (!this.filterManager) return
    
    const imageNode = obj.node as Konva.Image
    
    // Apply via WebGLFilterManager
    await this.filterManager.applyFilter(
      imageNode,
      this.getFilterType(),
      params,
      this.executionContext ?? undefined
    )
    
    // Update layer
    const layer = this.findLayerForObject(obj)
    if (layer) {
      layer.konvaLayer.batchDraw()
    }
  }
  
  /**
   * Remove filter from targets
   */
  protected async removeFilter(): Promise<void> {
    if (this.isApplying || !this.filterManager) return
    
    this.isApplying = true
    
    try {
      const targets = this.getTargetObjects()
      const removedIds: string[] = []
      
      for (const target of targets) {
        if (target.type === 'image') {
          await this.removeFilterFromImage(target)
          removedIds.push(target.id)
        }
      }
      
      // Emit event
      if (this.executionContext && removedIds.length > 0) {
        await this.executionContext.emit(new FilterRemovedEvent(
          'canvas',
          this.getFilterType(),
          removedIds,
          this.executionContext.getMetadata()
        ))
      }
      
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Remove filter from a specific image
   */
  private async removeFilterFromImage(obj: CanvasObject): Promise<void> {
    const imageNode = obj.node as Konva.Image
    
    // Clear the image cache to remove filters
    imageNode.clearCache()
    
    // Restore original image
    const originalImage = imageNode.image()
    imageNode.image(originalImage)
    
    // Update layer
    const layer = this.findLayerForObject(obj)
    if (layer) {
      layer.konvaLayer.batchDraw()
    }
  }
  
  /**
   * Check if selected objects already have this filter
   */
  private checkExistingFilters(): void {
    const canvas = this.getCanvas()
    const selection = canvas.state.selection
    
    if (selection?.type === 'objects') {
      const firstObject = this.findObject(selection.objectIds[0])
      if (firstObject && firstObject.type === 'image') {
        // Check filter metadata stored on object
        const filters = firstObject.metadata?.filters as Record<string, Record<string, unknown>> | undefined
        if (filters) {
          const filterData = filters[this.getFilterType()]
          if (filterData) {
            // Restore options from metadata
            Object.entries(filterData).forEach(([key, value]) => {
              this.setOption(key, value)
            })
          }
        }
      }
    }
  }
  
  /**
   * Get target objects based on selection
   */
  protected getTargetObjects(): CanvasObject[] {
    const canvas = this.getCanvas()
    const selection = canvas.state.selection
    
    if (selection?.type === 'objects') {
      return selection.objectIds
        .map(id => this.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null && obj.type === 'image')
    } else {
      // Apply to all visible, unlocked images
      const allImages: CanvasObject[] = []
      for (const layer of canvas.state.layers) {
        if (!layer.visible || layer.locked) continue
        
        for (const obj of layer.objects) {
          if (obj.type === 'image' && !obj.locked && obj.visible) {
            allImages.push(obj)
          }
        }
      }
      return allImages
    }
  }
  
  /**
   * Helper to find object by ID
   */
  protected findObject(objectId: string): CanvasObject | null {
    const canvas = this.getCanvas()
    for (const layer of canvas.state.layers) {
      const obj = layer.objects.find(o => o.id === objectId)
      if (obj) return obj
    }
    return null
  }
  
  /**
   * Helper to find layer containing object
   */
  protected findLayerForObject(obj: CanvasObject) {
    const canvas = this.getCanvas()
    return canvas.state.layers.find(layer => 
      layer.objects.some(o => o.id === obj.id)
    )
  }
  
  /**
   * Support for AI operations with specific targets
   */
  async applyWithContext(params: Record<string, unknown>, targetObjects?: CanvasObject[]): Promise<void> {
    // Convert params to the correct type
    const webglParams = this.convertOptionsToWebGLParams(params)
    
    if (targetObjects) {
      // Apply to specific objects (AI workflow)
      for (const obj of targetObjects) {
        if (obj.type === 'image') {
          await this.applyFilterToImage(obj, webglParams)
        }
      }
    } else {
      // Use normal apply
      await this.applyFilter()
    }
  }
} 