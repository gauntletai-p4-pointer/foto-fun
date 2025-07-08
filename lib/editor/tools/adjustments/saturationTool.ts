import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import type { FabricObject, Image as FabricImage } from 'fabric'
import { filters } from 'fabric'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define filter type
interface ImageFilter {
  type?: string
  [key: string]: unknown
}

/**
 * Saturation Tool State
 */
type SaturationState = {
  adjustment: number
  isAdjusting: boolean
  previousFilters: Map<string, ImageFilter[]>
}

/**
 * Saturation Tool - Adjust image color saturation
 * Uses Fabric.js saturation filter
 */
class SaturationTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.SATURATION
  name = 'Saturation'
  icon = Palette
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<SaturationState>({
    adjustment: 0,
    isAdjusting: false,
    previousFilters: new Map()
  })
  
  /**
   * Tool setup
   */
  protected setupTool(): void {
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const adjustment = options.find(opt => opt.id === 'adjustment')?.value
      if (adjustment !== undefined && typeof adjustment === 'number') {
        this.track('adjustSaturation', () => {
          this.applySaturation(adjustment)
        })
      }
    })
    
    // Apply initial value if any
    const currentAdjustment = this.toolOptionsStore.getOptionValue<number>(this.id, 'adjustment')
    if (currentAdjustment !== undefined && currentAdjustment !== 0) {
      this.applySaturation(currentAdjustment)
    }
  }
  
  /**
   * Apply saturation adjustment to all images on canvas
   */
  private applySaturation(adjustment: number): void {
    if (!this.canvas) return
    
    this.state.set('adjustment', adjustment)
    
    // Get all objects and filter for images
    const objects = this.canvas.getObjects()
    const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
    
    if (images.length === 0) {
      console.warn('No images found on canvas to adjust saturation')
      return
    }
    
    // Apply saturation filter to each image
    images.forEach(img => {
      // Store original filters if not already stored
      const imgId = (img as FabricObject & { id?: string }).id || img.toString()
      if (!this.state.get('previousFilters').has(imgId)) {
        this.state.get('previousFilters').set(imgId, img.filters ? [...img.filters] as unknown as ImageFilter[] : [])
      }
      
      // Remove existing saturation filters
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => (f as unknown as ImageFilter).type !== 'Saturation')
      }
      
      // Add new saturation filter if adjustment is not 0
      if (adjustment !== 0) {
        // Fabric.js saturation value is between -1 and 1
        const saturationValue = adjustment / 100
        
        // Create saturation filter
        const saturationFilter = new filters.Saturation({
          saturation: saturationValue
        })
        
        img.filters.push(saturationFilter)
      }
      
      // Apply filters
      img.applyFilters()
    })
    
    // Render canvas
    this.canvas.renderAll()
    
    // Record command for undo/redo
    if (!this.state.get('isAdjusting')) {
      this.state.set('isAdjusting', true)
      
      // Create modify command for each image
      images.forEach(img => {
        const command = new ModifyCommand(
          this.canvas!,
          img as FabricObject,
          { filters: img.filters },
          `Adjust saturation to ${adjustment}%`
        )
        this.executeCommand(command)
      })
      
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(): void {
    // Don't reset the adjustment value - let it persist
    // The user can manually reset or use undo if they want to remove the effect
    
    // Clear stored filters (but don't remove applied filters)
    this.state.get('previousFilters').clear()
    
    // Reset only the internal state, not the actual adjustment
    this.state.setState({
      isAdjusting: false,
      previousFilters: new Map()
    })
  }
}

// Export singleton instance
export const saturationTool = new SaturationTool() 