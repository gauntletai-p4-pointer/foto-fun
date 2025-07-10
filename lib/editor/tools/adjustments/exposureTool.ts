import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { ModifyCommand } from '@/lib/editor/commands/canvas/ModifyCommand'
import * as fabric from 'fabric'
import type { ICommand } from '@/lib/editor/commands/base'

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
  icon = Sun
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
    this.state.reset()
  }
  
  private applyExposure(canvas: Canvas, value: number): void {
    // Use guard to prevent concurrent execution
    this.executeWithGuard('isApplying', async () => {
      const images = this.getTargetImages()
      
      if (images.length === 0) return
      
      const commands: ICommand[] = []
      
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
        
        // Apply the filters
        img.filters = newFilters
        img.applyFilters()
        
        // Create command for history
        const command = new ModifyCommand(
          canvas,
          img as FabricObject,
          { filters: newFilters },
          `Adjust exposure to ${value}%`
        )
        commands.push(command)
      })
      
      canvas.renderAll()
      
      // Execute all commands
      for (const command of commands) {
        await this.executeCommand(command)
      }
    })
  }
}

// Export singleton
export const exposureTool = new ExposureTool() 