import { Sun } from 'lucide-react'
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
 * Brightness Tool State
 */
type BrightnessState = {
  adjustment: number
  isAdjusting: boolean
  previousFilters: Map<string, ImageFilter[]>
}

/**
 * Brightness Tool - Adjust image brightness
 * Uses Fabric.js brightness filter
 */
class BrightnessTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.BRIGHTNESS
  name = 'Brightness'
  icon = Sun
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<BrightnessState>({
    adjustment: 0,
    isAdjusting: false,
    previousFilters: new Map()
  })
  
  /**
   * Tool setup
   */
  protected setupTool(): void {
    // Check if there's already a brightness filter applied and sync the UI
    if (this.canvas) {
      const objects = this.canvas.getObjects()
      const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
      
      if (images.length > 0) {
        // Check the first image for existing brightness filter
        const firstImage = images[0]
        if (firstImage.filters) {
          const brightnessFilter = firstImage.filters.find(
            (f) => (f as unknown as ImageFilter).type === 'Brightness'
          ) as unknown as { brightness?: number }
          
          if (brightnessFilter && brightnessFilter.brightness !== undefined) {
            // Convert back from -1 to 1 range to -100 to 100
            const currentValue = Math.round(brightnessFilter.brightness * 100)
            // Update the UI to reflect the current state
            this.toolOptionsStore.updateOption(this.id, 'adjustment', currentValue)
          }
        }
      }
    }
    
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const adjustment = options.find(opt => opt.id === 'adjustment')?.value
      if (adjustment !== undefined && typeof adjustment === 'number') {
        this.track('adjustBrightness', () => {
          this.applyBrightness(adjustment)
        })
      }
    })
  }
  
  /**
   * Apply brightness adjustment to all images on canvas
   */
  private applyBrightness(adjustment: number): void {
    if (!this.canvas) return
    
    this.state.set('adjustment', adjustment)
    
    // Check for active selection first
    const activeObjects = this.canvas.getActiveObjects()
    const hasSelection = activeObjects.length > 0
    
    // Get target images
    let images: FabricImage[]
    if (hasSelection) {
      // Filter selected objects for images only
      images = activeObjects.filter(obj => obj.type === 'image') as FabricImage[]
    } else {
      // Get all images on canvas
      const objects = this.canvas.getObjects()
      images = objects.filter(obj => obj.type === 'image') as FabricImage[]
    }
    
    if (images.length === 0) {
      console.warn(`No images found ${hasSelection ? 'in selection' : 'on canvas'} to adjust brightness`)
      return
    }
    
    console.log(`[BrightnessTool] Adjusting brightness of ${images.length} image(s) - ${hasSelection ? 'selected only' : 'all images'}`)
    
    // Apply brightness filter to each image
    images.forEach(img => {
      // Store original filters if not already stored
      const imgId = (img as FabricObject & { id?: string }).id || img.toString()
      if (!this.state.get('previousFilters').has(imgId)) {
        this.state.get('previousFilters').set(imgId, img.filters ? [...img.filters] as unknown as ImageFilter[] : [])
      }
      
      // Remove existing brightness filters
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => (f as unknown as ImageFilter).type !== 'Brightness')
      }
      
      // Add new brightness filter if adjustment is not 0
      if (adjustment !== 0) {
        // Fabric.js v6 uses a different filter API
        // The brightness value is between -1 and 1
        const brightnessValue = adjustment / 100
        
        // Create brightness filter
        const brightnessFilter = new filters.Brightness({
          brightness: brightnessValue
        })
        
        img.filters.push(brightnessFilter)
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
          `Adjust brightness to ${adjustment}%`
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
export const brightnessTool = new BrightnessTool() 