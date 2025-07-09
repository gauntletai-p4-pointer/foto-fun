import { Sliders } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, Image, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'
import * as fabric from 'fabric'

// Define tool state
type ExposureToolState = {
  isApplying: boolean
  lastValue: number
  isAdjusting: boolean
}

class ExposureTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.EXPOSURE
  name = 'Exposure'
  icon = Sliders
  cursor = 'default'
  shortcut = 'X'
  
  // Tool state
  private state = createToolState<ExposureToolState>({
    isApplying: false,
    lastValue: 0,
    isAdjusting: false
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const value = this.getOptionValue('exposure')
      if (typeof value === 'number' && value !== this.state.get('lastValue')) {
        this.applyExposure(canvas, value)
        this.state.set('lastValue', value)
      }
    })
    
    // Apply initial value
    const initialValue = this.getOptionValue('exposure')
    if (typeof initialValue === 'number') {
      this.applyExposure(canvas, initialValue)
      this.state.set('lastValue', initialValue)
    }
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the exposure value - let it persist
    // The user can manually reset or use undo if they want to remove the effect
    
    // Reset only the internal state
    this.state.setState({
      isApplying: false,
      lastValue: this.state.get('lastValue'), // Keep the last value
      isAdjusting: false
    })
  }
  
  private applyExposure(canvas: Canvas, value: number): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      const objects = canvas.getObjects()
      const images = objects.filter((obj): obj is Image => obj.type === 'image')
      
      if (images.length === 0) return
      
      images.forEach(img => {
        if (!img.filters) {
          img.filters = []
        }
        
        // Calculate new filters array
        const existingFilters = img.filters.filter(f => {
          const filter = f as unknown as { isExposure?: boolean }
          return !(f instanceof fabric.filters.Brightness && filter.isExposure)
        })
        
        let newFilters: typeof img.filters
        if (value !== 0) {
          // Exposure typically has a more dramatic effect than brightness
          // Convert -100 to +100 range to a more exponential curve
          const exposureValue = value > 0 
            ? value * 0.015  // Positive exposure brightens more dramatically
            : value * 0.01   // Negative exposure darkens less dramatically
          
          const filter = new fabric.filters.Brightness({ 
            brightness: exposureValue 
          })
          ;(filter as { isExposure?: boolean }).isExposure = true // Mark as exposure for identification
          newFilters = [...existingFilters, filter] as typeof img.filters
        } else {
          newFilters = existingFilters as typeof img.filters
        }
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          img as FabricObject,
          { filters: newFilters },
          `Adjust exposure to ${value}%`
        )
        
        // Execute the command (which will apply the changes and handle applyFilters)
        this.executeCommand(command)
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
export const exposureTool = new ExposureTool() 