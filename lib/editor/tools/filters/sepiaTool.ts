import { Camera } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { FabricImage, filters } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

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
  protected cleanup(): void {
    // Don't reset the sepia - let it persist
    this.state.setState({
      isApplying: false,
      lastIntensity: this.state.get('lastIntensity')
    })
  }
  
  private applySepia(canvas: Canvas, intensityValue: number): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      const objects = canvas.getObjects()
      
      // Apply to all image objects
      objects.forEach((obj) => {
        if (obj instanceof FabricImage) {
          // Remove existing sepia filter
          const existingFilters = obj.filters?.filter(
            (f: unknown) => !(f instanceof filters.Sepia)
          ) || []
          
          // Add new sepia filter if intensity > 0
          if (intensityValue > 0) {
            const sepiaFilter = new filters.Sepia()
            obj.filters = [...existingFilters, sepiaFilter] as typeof obj.filters
          } else {
            obj.filters = existingFilters as typeof obj.filters
          }
          
          // Apply filters and re-render
          obj.applyFilters()
          
          // Record command for undo/redo
          const command = new ModifyCommand(
            canvas,
            obj,
            { filters: obj.filters },
            `Apply sepia: ${intensityValue}%`
          )
          this.executeCommand(command)
        }
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isApplying', false)
    }
  }
  
  private getOptionValue(optionId: string): unknown {
    const toolOptions = useToolOptionsStore.getState().getToolOptions(this.id)
    const option = toolOptions?.find(opt => opt.id === optionId)
    return option?.value
  }
}

// Export singleton
export const sepiaTool = new SepiaTool() 