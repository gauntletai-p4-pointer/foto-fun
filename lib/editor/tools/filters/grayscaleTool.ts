import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { FilterTarget } from '@/lib/editor/filters/FilterManager'
import type { Filter } from '@/lib/editor/canvas/types'

/**
 * Grayscale Tool - Convert images to black and white
 * Now uses layer-based filtering exclusively
 */
export class GrayscaleTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.GRAYSCALE
  name = 'Grayscale'
  icon = Palette
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Track if filter is applied
  private isApplied = false
  private isApplying = false
  
  protected setupTool(): void {
    // Set default state
    this.setOption('enabled', false)
  }
  
  protected cleanupTool(): void {
    // Nothing to clean up
  }
  
  /**
   * Handle option changes from the UI
   */
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'enabled' && typeof value === 'boolean') {
      // Toggle grayscale
      if (value) {
        this.applyGrayscale()
      } else {
        this.removeGrayscale()
      }
    }
  }
  
  /**
   * Apply grayscale filter
   */
  async applyGrayscale(): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const canvas = this.getCanvas()
      const filterManager = canvas.getFilterManager?.()
      
      if (!filterManager) {
        console.error('[GrayscaleTool] FilterManager not available')
        return
      }
      
      // Create filter
      const filter: Filter = {
        type: 'grayscale',
        params: {}
      }
      
      // Determine target
      const target = this.determineFilterTarget()
      
      if (!target) {
        console.warn('[GrayscaleTool] No valid target for filter')
        return
      }
      
      // Apply filter through FilterManager
      await filterManager.applyFilter(filter, target, this.executionContext)
      
      this.isApplied = true
      this.setOption('enabled', true)
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Remove grayscale filter
   */
  async removeGrayscale(): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const canvas = this.getCanvas()
      const filterManager = canvas.getFilterManager?.()
      const activeLayer = canvas.getActiveLayer()
      
      if (!filterManager || !activeLayer) {
        return
      }
      
      // Find and remove grayscale filter from layer
      if (activeLayer.filterStack) {
        const grayscaleFilter = activeLayer.filterStack.filters.find(
          f => f.filter.type === 'grayscale'
        )
        
        if (grayscaleFilter) {
          await filterManager.removeFilterFromLayer(
            activeLayer.id,
            grayscaleFilter.id,
            this.executionContext
          )
        }
      }
      
      this.isApplied = false
      this.setOption('enabled', false)
    } finally {
      this.isApplying = false
    }
  }
  
  /**
   * Determine the filter target based on current selection
   */
  private determineFilterTarget(): FilterTarget | null {
    const canvas = this.getCanvas()
    const selection = canvas.state.selection
    const activeLayer = canvas.getActiveLayer()
    
    if (!activeLayer) {
      console.warn('[GrayscaleTool] No active layer')
      return null
    }
    
    // If there's a pixel selection, use it
    if (selection && selection.type !== 'objects') {
      return {
        type: 'selection',
        layerId: activeLayer.id,
        selection
      }
    }
    
    // Otherwise apply to the entire active layer
    return {
      type: 'layer',
      layerId: activeLayer.id
    }
  }
  
  /**
   * Toggle grayscale on/off
   */
  async toggleGrayscale(): Promise<void> {
    if (this.isApplied) {
      await this.removeGrayscale()
    } else {
      await this.applyGrayscale()
    }
  }
  
  /**
   * Apply grayscale for AI operations
   */
  async applyWithContext(): Promise<void> {
    await this.applyGrayscale()
  }
}

// Export singleton instance
export const grayscaleTool = new GrayscaleTool() 