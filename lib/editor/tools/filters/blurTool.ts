import { Aperture } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { FabricImage, filters } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type BlurToolState = {
  isApplying: boolean
  lastBlur: number
}

class BlurTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Aperture
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<BlurToolState>({
    isApplying: false,
    lastBlur: 0
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const blur = this.getOptionValue('blur')
      if (typeof blur === 'number' && blur !== this.state.get('lastBlur')) {
        this.applyBlur(canvas, blur)
        this.state.set('lastBlur', blur)
      }
    })
    
    // Apply initial value if any
    const initialBlur = this.getOptionValue('blur')
    if (typeof initialBlur === 'number' && initialBlur !== 0) {
      this.applyBlur(canvas, initialBlur)
      this.state.set('lastBlur', initialBlur)
    }
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the blur - let it persist
    this.state.setState({
      isApplying: false,
      lastBlur: this.state.get('lastBlur')
    })
  }
  
  private applyBlur(canvas: Canvas, blurValue: number): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      const objects = canvas.getObjects()
      
      // Apply to all image objects
      objects.forEach((obj) => {
        if (obj instanceof FabricImage) {
          // Calculate new filters array
          const existingFilters = obj.filters?.filter(
            (f: unknown) => !(f instanceof filters.Blur)
          ) || []
          
          let newFilters: typeof obj.filters
          if (blurValue > 0) {
            const blurFilter = new filters.Blur({
              blur: blurValue / 100 // Convert percentage to 0-1 range
            })
            newFilters = [...existingFilters, blurFilter] as typeof obj.filters
          } else {
            newFilters = existingFilters as typeof obj.filters
          }
          
          // Create command BEFORE modifying the object
          const command = new ModifyCommand(
            canvas,
            obj,
            { filters: newFilters },
            `Apply blur: ${blurValue}%`
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
export const blurTool = new BlurTool() 