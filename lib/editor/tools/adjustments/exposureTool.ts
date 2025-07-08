import { Sliders } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, Image } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import * as fabric from 'fabric'

// Define tool state
type ExposureToolState = {
  isApplying: boolean
  lastValue: number
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
    lastValue: 0
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
      lastValue: this.state.get('lastValue') // Keep the last value
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
        
        // Remove existing exposure filter
        img.filters = img.filters.filter(f => {
          const filter = f as unknown as { isExposure?: boolean }
          return !(f instanceof fabric.filters.Brightness && filter.isExposure)
        })
        
        // Apply new exposure if not zero
        // Exposure uses brightness but with a different curve
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
          img.filters.push(filter)
        }
        
        img.applyFilters()
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