import { Thermometer } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, Image, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'
import * as fabric from 'fabric'

// Define tool state
type ColorTemperatureToolState = {
  isApplying: boolean
  lastValue: number
}

class ColorTemperatureTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.COLOR_TEMPERATURE
  name = 'Color Temperature'
  icon = Thermometer
  cursor = 'default'
  shortcut = undefined // Access via adjustments menu
  
  // Tool state
  private state = createToolState<ColorTemperatureToolState>({
    isApplying: false,
    lastValue: 0
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const value = this.getOptionValue('temperature')
      if (typeof value === 'number' && value !== this.state.get('lastValue')) {
        this.applyColorTemperature(canvas, value)
        this.state.set('lastValue', value)
      }
    })
    
    // Apply initial value
    const initialValue = this.getOptionValue('temperature')
    if (typeof initialValue === 'number' && initialValue !== 0) {
      this.applyColorTemperature(canvas, initialValue)
      this.state.set('lastValue', initialValue)
    }
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the temperature value - let it persist
    // Reset only the internal state
    this.state.setState({
      isApplying: false,
      lastValue: this.state.get('lastValue')
    })
  }
  
  private applyColorTemperature(canvas: Canvas, value: number): void {
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
          const filter = f as unknown as { isColorTemp?: boolean }
          return !filter.isColorTemp
        })
        
        let newFilters: typeof img.filters
        if (value !== 0) {
          // Color temperature is achieved by adjusting the color matrix
          // Positive values = warmer (more orange/red)
          // Negative values = cooler (more blue)
          
          // Calculate RGB adjustments based on temperature
          const tempAdjust = value / 100
          
          // Create a color matrix that shifts colors
          // Warmer: increase red, decrease blue
          // Cooler: decrease red, increase blue
          const matrix = [
            1 + tempAdjust * 0.2, 0, 0, 0, 0,    // Red channel
            0, 1, 0, 0, 0,                       // Green channel (unchanged)
            0, 0, 1 - tempAdjust * 0.2, 0, 0,    // Blue channel
            0, 0, 0, 1, 0                        // Alpha channel
          ]
          
          const filter = new fabric.filters.ColorMatrix({
            matrix: matrix
          })
          ;(filter as { isColorTemp?: boolean }).isColorTemp = true
          newFilters = [...existingFilters, filter] as typeof img.filters
        } else {
          newFilters = existingFilters as typeof img.filters
        }
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          img as FabricObject,
          { filters: newFilters },
          `Adjust color temperature to ${value > 0 ? 'warmer' : value < 0 ? 'cooler' : 'neutral'} (${value})`
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
export const colorTemperatureTool = new ColorTemperatureTool() 