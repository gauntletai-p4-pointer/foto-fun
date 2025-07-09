import { Focus } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { FabricImage, filters } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type SharpenToolState = {
  isApplying: boolean
  lastSharpen: number
}

class SharpenTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.SHARPEN
  name = 'Sharpen'
  icon = Focus
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<SharpenToolState>({
    isApplying: false,
    lastSharpen: 0
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const sharpen = this.getOptionValue('sharpen')
      if (typeof sharpen === 'number' && sharpen !== this.state.get('lastSharpen')) {
        this.applySharpen(canvas, sharpen)
        this.state.set('lastSharpen', sharpen)
      }
    })
    
    // Apply initial value if any
    const initialSharpen = this.getOptionValue('sharpen')
    if (typeof initialSharpen === 'number' && initialSharpen !== 0) {
      this.applySharpen(canvas, initialSharpen)
      this.state.set('lastSharpen', initialSharpen)
    }
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the sharpen - let it persist
    this.state.setState({
      isApplying: false,
      lastSharpen: this.state.get('lastSharpen')
    })
  }
  
  private applySharpen(canvas: Canvas, sharpenValue: number): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      const objects = canvas.getObjects()
      
      // Apply to all image objects
      objects.forEach((obj) => {
        if (obj instanceof FabricImage) {
          // Calculate new filters array
          const existingFilters = obj.filters?.filter(
            (f) => {
              if (f instanceof filters.Convolute) {
                return f.opaque !== false
              }
              return true
            }
          ) || []
          
          let newFilters: typeof obj.filters
          if (sharpenValue > 0) {
            // Sharpen matrix - intensity is controlled by the center value
            const intensity = 1 + (sharpenValue / 25) // Scale 0-100 to 1-5
            const sharpenMatrix = [
              0, -1, 0,
              -1, intensity, -1,
              0, -1, 0
            ]
            
            const sharpenFilter = new filters.Convolute({
              matrix: sharpenMatrix,
              opaque: false
            })
            newFilters = [...existingFilters, sharpenFilter] as typeof obj.filters
          } else {
            newFilters = existingFilters as typeof obj.filters
          }
          
          // Create command BEFORE modifying the object
          const command = new ModifyCommand(
            canvas,
            obj,
            { filters: newFilters },
            `Apply sharpen: ${sharpenValue}%`
          )
          
          // Execute the command (which will apply the changes and handle applyFilters)
          this.executeCommand(command)
        }
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const sharpenTool = new SharpenTool() 