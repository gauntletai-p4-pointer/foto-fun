import { Camera } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { ModifyCommand } from '@/lib/editor/commands/canvas/ModifyCommand'
import * as fabric from 'fabric'

// Define tool state
type SepiaToolState = {
  isApplying: boolean
  lastIntensity: number
}

class SepiaTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.SEPIA
  name = 'Sepia'
  icon = Camera
  cursor = 'default'
  shortcut = 'P'
  
  // Tool state
  private state = createToolState<SepiaToolState>({
    isApplying: false,
    lastIntensity: 0
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const intensity = this.getOptionValue('intensity')
      if (typeof intensity === 'number' && intensity !== this.state.get('lastIntensity')) {
        this.applySepia(canvas, intensity)
        this.state.set('lastIntensity', intensity)
      }
    })
    
    // Apply initial value if any
    const initialIntensity = this.getOptionValue('intensity')
    if (typeof initialIntensity === 'number' && initialIntensity !== 0) {
      this.applySepia(canvas, initialIntensity)
      this.state.set('lastIntensity', initialIntensity)
    }
  }
  
  // Required: Cleanup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected cleanup(canvas: Canvas): void {
    // Don't reset the sepia - let it persist
    this.state.setState({
      isApplying: false,
      lastIntensity: this.state.get('lastIntensity')
    })
  }
  
  // Required: Activation
  onActivate(canvas: Canvas): void {
    // Call parent implementation which sets up the tool
    super.onActivate(canvas)
  }
  
  private applySepia(canvas: Canvas, intensityValue: number): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('No images found to apply sepia')
        return
      }
      
      // Apply to all image objects
      images.forEach((img) => {
        // Calculate new filters array
        const existingFilters = img.filters?.filter(
          (f: unknown) => !(f instanceof fabric.filters.Sepia)
        ) || []
        
        let newFilters: typeof img.filters
        if (intensityValue > 0) {
          const sepiaFilter = new fabric.filters.Sepia()
          newFilters = [...existingFilters, sepiaFilter] as typeof img.filters
        } else {
          newFilters = existingFilters as typeof img.filters
        }
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          img,
          { filters: newFilters },
          `Apply sepia: ${intensityValue}%`
        )
        
        // Execute the command (which will apply the changes and handle applyFilters)
        this.executeCommand(command)
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const sepiaTool = new SepiaTool() 