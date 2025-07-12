import type { Filter } from '@/lib/editor/canvas/types'
import type { FilterTarget } from '@/lib/editor/filters/FilterManager'
import { BaseTool } from './BaseTool'

/**
 * Base class for tools that apply WebGL filters
 * Now uses the new layer-based filter system exclusively
 */
export abstract class WebGLFilterTool extends BaseTool {
  // Default filter type - must be overridden by subclasses
  protected abstract filterType: string
  
  // Track if currently applying
  protected isApplying = false
  
  /**
   * Apply the filter with given parameters
   */
  protected async applyFilter(params: Record<string, number | string | boolean>): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const canvas = this.getCanvas()
      const filterManager = canvas.getFilterManager?.()
      
      if (!filterManager) {
        console.error('Filter manager not available')
        return
      }
      
      // Create the filter
      const filter: Filter = {
        type: this.filterType as Filter['type'],
        params
      }
      
      // Determine target based on selection
      const target = this.determineFilterTarget()
      
      if (!target) {
        console.warn('[WebGLFilterTool] No valid target for filter')
        return
      }
      
      // Apply filter through FilterManager
      await (filterManager as unknown as { applyFilter: (filter: Filter, target: FilterTarget, context: unknown) => Promise<void> }).applyFilter(filter, target, this.executionContext)
      
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Determine the filter target based on current selection
   */
  protected determineFilterTarget(): FilterTarget | null {
    const canvas = this.getCanvas()
    const selectedObjects = canvas.getSelectedObjects()
    
    if (selectedObjects.length === 0) {
      console.warn('[WebGLFilterTool] No objects selected')
      return null
    }
    
    // Apply filter to selection - need to get the layer of the first selected object
    const firstObject = selectedObjects[0]
    return {
      type: 'selection',
      layerId: firstObject.layerId ?? 'main', // Default to main layer if no layerId
      selection: {
        type: 'objects',
        objectIds: selectedObjects.map(obj => obj.id)
      }
    }
  }
  
  /**
   * Handle option changes from the UI
   */
  protected onOptionChange(key: string, value: unknown): void {
    // Collect all current options
    const params: Record<string, number | string | boolean> = {}
    
    // Get all option values
    const allOptions = this.options
    for (const optionKey in allOptions) {
      if (optionKey === key) {
        params[optionKey] = value as number | string | boolean
      } else {
        params[optionKey] = this.getOption(optionKey) as number | string | boolean
      }
    }
    
    // Apply filter with current parameters
    this.applyFilter(params)
  }
  
  /**
   * Apply filter for AI operations
   * Now always uses layer-based filtering
   */
  async applyWithContext(params: Record<string, number | string | boolean>): Promise<void> {
    await this.applyFilter(params)
  }
} 