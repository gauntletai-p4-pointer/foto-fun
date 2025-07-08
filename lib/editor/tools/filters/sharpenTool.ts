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
  // Required properties
  id = TOOL_IDS.SHARPEN
  name = 'Sharpen'
  icon = Focus
  cursor = 'default'
  shortcut = 'S'
  
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
          // Remove existing convolute filter (sharpen)
          const existingFilters = obj.filters?.filter(
            (f) => {
              if (f instanceof filters.Convolute) {
                return f.opaque !== false
              }
              return true
            }
          ) || []
          
          // Add new sharpen filter if value > 0
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
            obj.filters = [...existingFilters, sharpenFilter] as typeof obj.filters
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
            `Apply sharpen: ${sharpenValue}%`
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
export const sharpenTool = new SharpenTool() 