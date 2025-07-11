import { Brush } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { FilterTarget } from '@/lib/editor/filters/FilterManager'
import type { Filter } from '@/lib/editor/canvas/types'

/**
 * Blur Tool - Apply gaussian blur to layers
 * Now uses layer-based filtering exclusively
 */
export class BlurTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Brush
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Track current blur value
  private currentBlur = 0
  private isApplying = false
  
  protected setupTool(): void {
    // Set default blur value
    this.setOption('radius', 0)
  }
  
  protected cleanupTool(): void {
    // Nothing to clean up
  }
  
  /**
   * Handle option changes from the UI
   */
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'radius' && typeof value === 'number') {
      // Apply blur immediately when slider changes
      this.applyBlur(value)
    }
  }
  
  /**
   * Apply blur filter
   */
  async applyBlur(blurValue: number): Promise<void> {
    if (this.isApplying) return
    
    this.isApplying = true
    
    try {
      const canvas = this.getCanvas()
      const filterManager = canvas.getFilterManager?.()
      
      if (!filterManager) {
        console.error('[BlurTool] FilterManager not available')
        return
      }
      
      // Create filter
      const filter: Filter = {
        type: 'blur',
        params: { radius: blurValue }
      }
      
      // Determine target
      const target = this.determineFilterTarget()
      
      if (!target) {
        console.warn('[BlurTool] No valid target for filter')
        return
      }
      
      // Apply filter through FilterManager
      await filterManager.applyFilter(filter, target, this.executionContext)
      
      this.currentBlur = blurValue
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
      console.warn('[BlurTool] No active layer')
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
   * Apply blur for AI operations
   */
  async applyWithContext(blurRadius: number): Promise<void> {
    await this.applyBlur(blurRadius)
  }
}

// Export singleton instance
export const blurTool = new BlurTool() 