import { Focus } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { ModifyCommand } from '@/lib/editor/commands/canvas/ModifyCommand'
import * as fabric from 'fabric'

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected cleanup(canvas: Canvas): void {
    // Don't reset the sharpen - let it persist
    this.state.setState({
      isApplying: false,
      lastSharpen: this.state.get('lastSharpen')
    })
  }
  
  // Required: Activation
  onActivate(canvas: Canvas): void {
    // Call parent implementation which sets up the tool
    super.onActivate(canvas)
  }
  
  private applySharpen(canvas: Canvas, sharpenValue: number): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('No images found to apply sharpen')
        return
      }
      
      // Apply to all image objects
      images.forEach((img) => {
        // Calculate new filters array
        const existingFilters = img.filters?.filter(
          (f) => {
            if (f instanceof fabric.filters.Convolute) {
              return f.opaque !== false
            }
            return true
          }
        ) || []
        
        let newFilters: typeof img.filters
        if (sharpenValue > 0) {
          // Sharpen matrix - intensity is controlled by the center value
          const intensity = 1 + (sharpenValue / 25) // Scale 0-100 to 1-5
          const sharpenMatrix = [
            0, -1, 0,
            -1, intensity, -1,
            0, -1, 0
          ]
          
          const sharpenFilter = new fabric.filters.Convolute({
            matrix: sharpenMatrix,
            opaque: false
          })
          newFilters = [...existingFilters, sharpenFilter] as typeof img.filters
        } else {
          newFilters = existingFilters as typeof img.filters
        }
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          img,
          { filters: newFilters },
          `Apply sharpen: ${sharpenValue}%`
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
export const sharpenTool = new SharpenTool() 