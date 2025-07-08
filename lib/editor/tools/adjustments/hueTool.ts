import { Paintbrush } from 'lucide-react'
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
 * Hue Tool State
 */
type HueState = {
  rotation: number
  isAdjusting: boolean
  previousFilters: Map<string, ImageFilter[]>
}

/**
 * Hue Tool - Rotate image colors on the color wheel
 * Uses Fabric.js HueRotation filter
 */
class HueTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.HUE
  name = 'Hue'
  icon = Paintbrush
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<HueState>({
    rotation: 0,
    isAdjusting: false,
    previousFilters: new Map()
  })
  
  /**
   * Tool setup
   */
  protected setupTool(): void {
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const rotation = options.find(opt => opt.id === 'hue')?.value
      if (rotation !== undefined && typeof rotation === 'number') {
        this.track('adjustHue', () => {
          this.applyHue(rotation)
        })
      }
    })
    
    // Apply initial value if any
    const currentRotation = this.toolOptionsStore.getOptionValue<number>(this.id, 'hue')
    if (currentRotation !== undefined && currentRotation !== 0) {
      this.applyHue(currentRotation)
    }
  }
  
  /**
   * Apply hue rotation to all images on canvas
   */
  private applyHue(rotation: number): void {
    if (!this.canvas) return
    
    this.state.set('rotation', rotation)
    
    // Get all objects and filter for images
    const objects = this.canvas.getObjects()
    const images = objects.filter(obj => obj.type === 'image') as FabricImage[]
    
    if (images.length === 0) {
      console.warn('No images found on canvas to adjust hue')
      return
    }
    
    // Apply hue rotation filter to each image
    images.forEach(img => {
      // Store original filters if not already stored
      const imgId = (img as FabricObject & { id?: string }).id || img.toString()
      if (!this.state.get('previousFilters').has(imgId)) {
        this.state.get('previousFilters').set(imgId, img.filters ? [...img.filters] as unknown as ImageFilter[] : [])
      }
      
      // Remove existing hue rotation filters
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => (f as unknown as ImageFilter).type !== 'HueRotation')
      }
      
      // Add new hue rotation filter if rotation is not 0
      if (rotation !== 0) {
        // Fabric.js HueRotation expects rotation in radians (0 to 2π)
        // Convert degrees to radians
        const rotationRadians = (rotation * Math.PI) / 180
        
        // Create hue rotation filter
        const hueFilter = new filters.HueRotation({
          rotation: rotationRadians
        })
        
        img.filters.push(hueFilter)
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
          `Rotate hue by ${rotation}°`
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
    // Don't reset the hue value - let it persist
    // The user can manually reset or use undo if they want to remove the effect
    
    // Clear stored filters (but don't remove applied filters)
    this.state.get('previousFilters').clear()
    
    // Reset only the internal state, not the actual hue
    this.state.setState({
      isAdjusting: false,
      previousFilters: new Map()
    })
  }
}

// Export singleton instance
export const hueTool = new HueTool() 